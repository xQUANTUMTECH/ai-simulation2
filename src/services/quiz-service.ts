import { supabase } from './supabase';
import { aiService } from './ai-service';
import { learningService } from './learning-service';
import { quizAIService } from './quiz-ai-service';
import { quizEvaluationService } from './quiz-evaluation-service';
import { analysisService } from './analysis-service';

interface CourseProgress {
  completed_quizzes: number;
  total_quizzes: number;
  average_score: number;
  mastered_topics: string[];
  struggling_topics: string[];
  recommended_topics: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  course_id: string;
  video_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AIQuizOptions {
  numQuestions?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  types?: Array<'multiple_choice' | 'true_false' | 'open'>;
  topics?: string[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN';
  order_in_quiz: number;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  answer: string;
  is_correct: boolean;
  order_in_question: number;
}

export interface UserQuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  completed_at: string;
}

class QuizService {
  async getQuizzes(courseId: string): Promise<Quiz[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getQuizDetails(quizId: string): Promise<{
    quiz: Quiz;
    questions: (QuizQuestion & { answers: QuizAnswer[] })[];
  }> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(`
        *,
        answers:quiz_answers(*)
      `)
      .eq('quiz_id', quizId)
      .order('order_in_quiz', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      quiz,
      questions: questions || []
    };
  }

  async submitQuizAnswer(
    quizId: string,
    answers: Array<{
      question_id: string;
      answer_id?: string;
      open_answer?: string;
    }>
  ): Promise<UserQuizResult> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    // Get quiz details to calculate score
    const quizDetails = await this.getQuizDetails(quizId);
    let totalScore = 0;
    let evaluatedQuestions = 0;

    // Process each answer
    for (const answer of answers) {
      const question = quizDetails.questions.find(q => q.id === answer.question_id);
      if (!question) continue;

      let score = 0;
      let isCorrect = false;
      let evaluationResult = null;

      if (question.question_type === 'OPEN' && answer.open_answer) {
        // Valuta la risposta aperta usando il servizio di valutazione
        const correctAnswer = question.answers.find(a => a.is_correct)?.answer || '';
        evaluationResult = await quizEvaluationService.evaluateOpenAnswer(
          question,
          answer.open_answer,
          correctAnswer
        );
        score = evaluationResult.score;
        isCorrect = score >= 70; // Considera corretta se il punteggio è >= 70%
      } else {
        // Valuta risposte a scelta multipla/vero-falso
        const correctAnswer = question.answers.find(a => a.is_correct);
        isCorrect = correctAnswer?.id === answer.answer_id;
        score = isCorrect ? 100 : 0;
      }

      // Salva la risposta dell'utente con i dettagli della valutazione
      await supabase.from('user_quiz_answers').insert({
        user_id: user.id,
        question_id: question.id,
        answer_id: answer.answer_id,
        open_answer: answer.open_answer,
        is_correct: isCorrect,
        score,
        evaluation_details: evaluationResult ? {
          feedback: evaluationResult.feedback,
          keywords: evaluationResult.keywords,
          suggestions: evaluationResult.suggestions,
          confidence: evaluationResult.confidence
        } : null
      });

      totalScore += score;
      evaluatedQuestions++;
    }

    // Calcola il punteggio finale
    const finalScore = Math.round(totalScore / evaluatedQuestions);
    const passed = finalScore >= 70;

    // Aggiorna le analytics di apprendimento
    await learningService.updateLearningAnalytics({
      user_id: user.id,
      quiz_id: quizId,
      score: finalScore,
      topic: quizDetails.quiz.title,
      subtopic: quizDetails.quiz.description
    });

    // Salva il risultato del quiz
    const { data: result, error } = await supabase
      .from('user_quiz_results')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score: finalScore,
        passed,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Aggiorna le statistiche di performance
    await this.updatePerformanceAnalytics(user.id, quizId, finalScore);

    return result;
  }

  // Ottieni il progresso del corso per uno studente
  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ottieni tutti i quiz del corso
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId);

    if (!quizzes) return {
      completed_quizzes: 0,
      total_quizzes: 0,
      average_score: 0,
      mastered_topics: [],
      struggling_topics: [],
      recommended_topics: []
    };

    // Ottieni i risultati dei quiz completati
    const { data: results } = await supabase
      .from('user_quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .in('quiz_id', quizzes.map(q => q.id));

    // Analizza i risultati
    const completedQuizzes = results?.length || 0;
    const averageScore = results?.reduce((sum, r) => sum + r.score, 0) / completedQuizzes || 0;

    // Analizza le performance per topic
    const topicAnalysis = await analysisService.analyzeTopicPerformance(user.id, courseId);

    return {
      completed_quizzes: completedQuizzes,
      total_quizzes: quizzes.length,
      average_score: Math.round(averageScore),
      mastered_topics: topicAnalysis.mastered,
      struggling_topics: topicAnalysis.struggling,
      recommended_topics: topicAnalysis.recommended
    };
  }

  // Aggiorna le statistiche di performance
  private async updatePerformanceAnalytics(
    userId: string,
    quizId: string,
    score: number
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Ottieni il corso associato al quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('course_id, title')
      .eq('id', quizId)
      .single();

    if (!quiz) return;

    // Aggiorna le statistiche di performance
    await analysisService.updatePerformanceMetrics({
      user_id: userId,
      course_id: quiz.course_id,
      quiz_id: quizId,
      topic: quiz.title,
      score,
      timestamp: new Date().toISOString()
    });
  }

  async getUserQuizResults(quizId: string): Promise<UserQuizResult | null> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_quiz_results')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async generateQuizFromDocument(
    documentId: string,
    options: AIQuizOptions = {}
  ): Promise<Quiz> {
    if (!supabase) throw new Error('Supabase client not initialized');

    try {
      // Get document content
      const { data: document } = await supabase
        .from('academy_documents')
        .select('content_text, title')
        .eq('id', documentId)
        .single();

      if (!document?.content_text) throw new Error('Document content not found');

      // Process document content
      const processedContent = await this.preprocessContent(document.content_text);

      // Generate questions using AI
      const questions = await this.generateQuestionsWithAI(processedContent, options);

      // Create quiz template
      const { data: template, error: templateError } = await supabase
        .from('quiz_templates')
        .insert({
          title: `Quiz for ${document.title}`,
          description: 'AI-generated quiz based on document content',
          category: options.topics?.[0] || 'general',
          difficulty: options.difficulty || 'intermediate',
          status: 'draft'
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert questions
      await this.insertQuizQuestions(template.id, questions);

      return template;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  private async preprocessContent(content: string): Promise<string> {
    // Extract key concepts and important information
    const keyPoints = await aiService.generateResponse(
      `Extract and summarize the key concepts from this text: ${content}`,
      'mistral'
    );
    
    return keyPoints;
  }

  private mapDifficulty(difficulty?: 'beginner' | 'intermediate' | 'advanced'): 'easy' | 'medium' | 'hard' {
    switch (difficulty) {
      case 'beginner':
        return 'easy';
      case 'advanced':
        return 'hard';
      case 'intermediate':
      default:
        return 'medium';
    }
  }

  private async generateQuestionsWithAI(content: string, options: AIQuizOptions): Promise<Array<{
    question: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>> {
    const quiz = await quizAIService.generateQuizFromText(content, {
      questionCount: options.numQuestions,
      difficulty: this.mapDifficulty(options.difficulty),
      questionTypes: options.types,
      topic: options.topics?.join(', ')
    });
    
    return quiz.questions.map(q => ({
      question: q.text,
      type: q.type,
      options: q.type === 'multiple_choice' ? q.options : undefined,
      correctAnswer: q.correctAnswer as string,
      explanation: q.explanation || ''
    }));
  }

  private parseAIResponse(response: any): Array<{
    question: string;
    type: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }> {
    try {
      // Parse the AI response into structured question format
      if (typeof response === 'string') {
        return JSON.parse(response);
      }
      return response;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  private async insertQuizQuestions(
    quizId: string,
    questions: Array<{
      question: string;
      type: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }>
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Insert questions in batches
    const batchSize = 10;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('quiz_template_questions')
        .insert(
          batch.map((q, index) => ({
            template_id: quizId,
            question: q.question,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
            correct_answer: q.correctAnswer,
            explanation: q.explanation,
            order: i + index
          }))
        );

      if (error) throw error;
    }
  }
}

export const quizService = new QuizService();
