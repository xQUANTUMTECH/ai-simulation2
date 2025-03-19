import { supabase } from './supabase';
import { aiService } from './ai-service';
import { quizService } from './quiz-service';

export interface LearningAnalytics {
  id: string;
  user_id: string;
  topic: string;
  subtopic?: string;
  mastery_level: number;
  correct_answers: number;
  total_attempts: number;
  last_quiz_date?: string;
  next_review_date?: string;
}

export interface ReviewRecommendation {
  id: string;
  user_id: string;
  analytics_id: string;
  recommendation_type: 'quiz' | 'review' | 'practice';
  priority: number;
  content: string;
  resources?: {
    documents?: string[];
    videos?: string[];
    quizzes?: string[];
  };
  status: 'pending' | 'completed' | 'skipped';
  effectiveness?: number;
}

class LearningService {
  private readonly MASTERY_THRESHOLD = 85; // 85% correct answers needed for mastery
  private readonly REVIEW_INTERVAL_DAYS = 7; // Review every 7 days by default

  async updateLearningAnalytics(quizResult: {
    user_id: string;
    quiz_id: string;
    score: number;
    topic: string;
    subtopic?: string;
  }): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Get or create analytics record
    const { data: analytics, error: analyticsError } = await supabase
      .from('learning_analytics')
      .select('*')
      .eq('user_id', quizResult.user_id)
      .eq('topic', quizResult.topic)
      .eq('subtopic', quizResult.subtopic || '')
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') throw analyticsError;

    const newAnalytics = {
      user_id: quizResult.user_id,
      topic: quizResult.topic,
      subtopic: quizResult.subtopic,
      correct_answers: (analytics?.correct_answers || 0) + (quizResult.score >= 70 ? 1 : 0),
      total_attempts: (analytics?.total_attempts || 0) + 1,
      last_quiz_date: new Date().toISOString(),
      mastery_level: this.calculateMasteryLevel(
        (analytics?.correct_answers || 0) + (quizResult.score >= 70 ? 1 : 0),
        (analytics?.total_attempts || 0) + 1
      )
    };

    if (analytics) {
      const { error } = await supabase
        .from('learning_analytics')
        .update(newAnalytics)
        .eq('id', analytics.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('learning_analytics')
        .insert(newAnalytics);

      if (error) throw error;
    }

    // Generate review recommendations if needed
    await this.generateReviewRecommendations(quizResult.user_id, quizResult.topic);
  }

  private calculateMasteryLevel(correctAnswers: number, totalAttempts: number): number {
    if (totalAttempts === 0) return 0;
    return Math.round((correctAnswers / totalAttempts) * 100);
  }

  async generateReviewRecommendations(userId: string, topic: string): Promise<void> {
    const { data: analytics, error } = await supabase
      ?.from('learning_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (error) throw error;

    // Generate recommendations if mastery is below threshold
    if (analytics.mastery_level < this.MASTERY_THRESHOLD) {
      const prompt = `
        Based on the following learning analytics, generate personalized review recommendations:
        Topic: ${topic}
        Current Mastery: ${analytics.mastery_level}%
        Correct Answers: ${analytics.correct_answers}
        Total Attempts: ${analytics.total_attempts}
      `;

      const aiResponse = await aiService.generateResponse(prompt, 'mistral');
      const recommendations = this.parseAIRecommendations(aiResponse);

      // Save recommendations
      await supabase?.from('review_recommendations').insert(
        recommendations.map(rec => ({
          user_id: userId,
          analytics_id: analytics.id,
          ...rec
        }))
      );

      // Generate review quiz if needed
      if (recommendations.some(r => r.recommendation_type === 'quiz')) {
        await this.generateReviewQuiz(userId, topic);
      }
    }
  }

  private parseAIRecommendations(aiResponse: string): Omit<ReviewRecommendation, 'id' | 'user_id' | 'analytics_id'>[] {
    // Parse AI response into structured recommendations
    // This is a placeholder implementation
    return [{
      recommendation_type: 'quiz',
      priority: 1,
      content: 'Review quiz needed based on recent performance',
      status: 'pending'
    }];
  }

  private async generateReviewQuiz(userId: string, topic: string): Promise<void> {
    // Get relevant learning materials
    const { data: materials } = await supabase
      ?.from('academy_documents')
      .select('*')
      .eq('topic', topic)
      .limit(3);

    if (!materials?.length) return;

    // Generate quiz focusing on weak areas
    await quizService.generateQuizFromDocument(
      materials[0].id,
      {
        numQuestions: 5,
        difficulty: 'intermediate',
        types: ['multiple_choice', 'true_false']
      }
    );
  }

  async getReviewRecommendations(userId: string): Promise<ReviewRecommendation[]> {
    const { data, error } = await supabase
      ?.from('review_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('priority', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: ReviewRecommendation['status'],
    effectiveness?: number
  ): Promise<void> {
    const { error } = await supabase
      ?.from('review_recommendations')
      .update({
        status,
        effectiveness,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', recommendationId);

    if (error) throw error;
  }
}

export const learningService = new LearningService();