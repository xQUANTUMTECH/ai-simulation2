import { supabase } from './supabase';
import { aiService } from './ai-service';
import { learningService } from './learning-service';
import { QuizQuestion, QuizAnswer } from './quiz-service';

interface EvaluationResult {
  score: number;          // Punteggio da 0 a 100
  feedback: string;       // Feedback dettagliato per lo studente
  keywords: string[];     // Parole chiave identificate
  suggestions: string[];  // Suggerimenti per miglioramento
  confidence: number;     // Confidenza della valutazione (0-1)
}

interface AnswerAnalysis {
  completeness: number;   // Quanto è completa la risposta (0-1)
  accuracy: number;       // Accuratezza dei concetti (0-1)
  relevance: number;      // Pertinenza alla domanda (0-1)
  understanding: number;  // Livello di comprensione dimostrato (0-1)
  details: {
    missingConcepts: string[];
    incorrectConcepts: string[];
    wellExplainedConcepts: string[];
  };
}

export class QuizEvaluationService {
  // Valuta una risposta aperta
  async evaluateOpenAnswer(
    question: QuizQuestion,
    userAnswer: string,
    correctAnswer: string
  ): Promise<EvaluationResult> {
    try {
      // Analizza la risposta in dettaglio
      const analysis = await this.analyzeAnswer(question, userAnswer, correctAnswer);
      
      // Calcola il punteggio basato sull'analisi
      const score = this.calculateScore(analysis);
      
      // Genera feedback personalizzato
      const feedback = await this.generateFeedback(analysis, question);
      
      // Identifica i concetti chiave mancanti o mal compresi
      const keywords = this.extractKeywords(analysis);
      
      // Genera suggerimenti per il miglioramento
      const suggestions = await this.generateSuggestions(analysis, question);

      // Calcola la confidenza della valutazione
      const confidence = this.calculateConfidence(analysis);

      // Aggiorna le analytics di apprendimento
      await this.updateLearningAnalytics(question, analysis, score);

      return {
        score,
        feedback,
        keywords,
        suggestions,
        confidence
      };
    } catch (error) {
      console.error('Error evaluating open answer:', error);
      throw error;
    }
  }

  // Analizza una risposta in dettaglio
  private async analyzeAnswer(
    question: QuizQuestion,
    userAnswer: string,
    correctAnswer: string
  ): Promise<AnswerAnalysis> {
    const prompt = `
      Analizza la seguente risposta a una domanda aperta:
      
      Domanda: ${question.question}
      Risposta corretta: ${correctAnswer}
      Risposta dell'utente: ${userAnswer}
      
      Fornisci un'analisi dettagliata che includa:
      1. Completezza della risposta
      2. Accuratezza dei concetti
      3. Pertinenza alla domanda
      4. Livello di comprensione
      5. Concetti mancanti
      6. Concetti errati
      7. Concetti ben spiegati
      
      Restituisci l'analisi in formato JSON.
    `;

    const response = await aiService.generateResponse(prompt, 'gpt-4');
    const analysis = JSON.parse(response);

    return {
      completeness: analysis.completeness,
      accuracy: analysis.accuracy,
      relevance: analysis.relevance,
      understanding: analysis.understanding,
      details: {
        missingConcepts: analysis.missingConcepts,
        incorrectConcepts: analysis.incorrectConcepts,
        wellExplainedConcepts: analysis.wellExplainedConcepts
      }
    };
  }

  // Calcola il punteggio basato sull'analisi
  private calculateScore(analysis: AnswerAnalysis): number {
    const weights = {
      completeness: 0.25,
      accuracy: 0.35,
      relevance: 0.20,
      understanding: 0.20
    };

    const score = (
      analysis.completeness * weights.completeness +
      analysis.accuracy * weights.accuracy +
      analysis.relevance * weights.relevance +
      analysis.understanding * weights.understanding
    ) * 100;

    return Math.round(score);
  }

  // Genera feedback personalizzato
  private async generateFeedback(analysis: AnswerAnalysis, question: QuizQuestion): Promise<string> {
    const prompt = `
      Genera un feedback costruttivo e incoraggiante per uno studente basato sulla seguente analisi:
      
      Completezza: ${analysis.completeness}
      Accuratezza: ${analysis.accuracy}
      Pertinenza: ${analysis.relevance}
      Comprensione: ${analysis.understanding}
      
      Concetti mancanti: ${analysis.details.missingConcepts.join(', ')}
      Concetti errati: ${analysis.details.incorrectConcepts.join(', ')}
      Concetti ben spiegati: ${analysis.details.wellExplainedConcepts.join(', ')}
      
      Il feedback dovrebbe:
      1. Iniziare con gli aspetti positivi
      2. Identificare le aree di miglioramento
      3. Fornire suggerimenti specifici
      4. Essere incoraggiante e costruttivo
    `;

    return aiService.generateResponse(prompt, 'gpt-4');
  }

  // Estrae parole chiave dall'analisi
  private extractKeywords(analysis: AnswerAnalysis): string[] {
    const keywords = new Set<string>();
    
    // Aggiungi concetti ben spiegati
    analysis.details.wellExplainedConcepts.forEach(concept => keywords.add(concept));
    
    // Aggiungi concetti mancanti
    analysis.details.missingConcepts.forEach(concept => keywords.add(concept));
    
    // Aggiungi concetti errati
    analysis.details.incorrectConcepts.forEach(concept => keywords.add(concept));
    
    return Array.from(keywords);
  }

  // Genera suggerimenti per il miglioramento
  private async generateSuggestions(analysis: AnswerAnalysis, question: QuizQuestion): Promise<string[]> {
    const prompt = `
      Genera 3-5 suggerimenti specifici per migliorare la comprensione dei seguenti concetti:
      
      Concetti mancanti: ${analysis.details.missingConcepts.join(', ')}
      Concetti errati: ${analysis.details.incorrectConcepts.join(', ')}
      
      I suggerimenti dovrebbero:
      1. Essere specifici e actionable
      2. Includere risorse o esempi
      3. Essere collegati agli obiettivi di apprendimento
    `;

    const response = await aiService.generateResponse(prompt, 'gpt-4');
    return JSON.parse(response);
  }

  // Calcola la confidenza della valutazione
  private calculateConfidence(analysis: AnswerAnalysis): number {
    // Fattori che influenzano la confidenza
    const factors = {
      completenessConfidence: analysis.completeness > 0.3 ? 1 : 0.5,
      accuracyConfidence: analysis.accuracy > 0.3 ? 1 : 0.5,
      relevanceConfidence: analysis.relevance > 0.3 ? 1 : 0.5,
      understandingConfidence: analysis.understanding > 0.3 ? 1 : 0.5,
      conceptsCoverage: Math.min(
        (analysis.details.wellExplainedConcepts.length + 
         analysis.details.incorrectConcepts.length) / 
        (analysis.details.missingConcepts.length + 1),
        1
      )
    };

    // Media pesata dei fattori
    const confidence = (
      factors.completenessConfidence * 0.2 +
      factors.accuracyConfidence * 0.3 +
      factors.relevanceConfidence * 0.2 +
      factors.understandingConfidence * 0.2 +
      factors.conceptsCoverage * 0.1
    );

    return Math.min(Math.max(confidence, 0), 1);
  }

  // Aggiorna le analytics di apprendimento
  private async updateLearningAnalytics(
    question: QuizQuestion,
    analysis: AnswerAnalysis,
    score: number
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ottieni il quiz dalla domanda
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', question.quiz_id)
      .single();

    if (!quiz) throw new Error('Quiz not found');

    await learningService.updateLearningAnalytics({
      user_id: user.id,
      quiz_id: quiz.id,
      score,
      topic: quiz.title,
      subtopic: `Question ${question.order_in_quiz}: ${question.question.substring(0, 50)}...`
    });

    // Salva anche i dettagli dell'analisi per uso futuro
    await supabase.from('question_evaluations').insert({
      question_id: question.id,
      user_id: user.id,
      score,
      completeness: analysis.completeness,
      accuracy: analysis.accuracy,
      relevance: analysis.relevance,
      understanding: analysis.understanding,
      missing_concepts: analysis.details.missingConcepts,
      incorrect_concepts: analysis.details.incorrectConcepts,
      well_explained_concepts: analysis.details.wellExplainedConcepts,
      evaluated_at: new Date().toISOString()
    });
  }
}

export const quizEvaluationService = new QuizEvaluationService();
