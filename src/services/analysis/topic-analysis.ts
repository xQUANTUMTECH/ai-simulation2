import { supabase } from '../supabase';
import { TopicAnalysis, PerformanceMetrics } from './types';

/**
 * Servizio dedicato all'analisi dei topic e delle performance degli utenti
 */
export class TopicAnalysisService {
  // Costanti per la valutazione delle performance
  private readonly MASTERY_THRESHOLD = 80; // 80% per considerare un topic padroneggiato
  private readonly STRUGGLING_THRESHOLD = 60; // Sotto 60% indica difficoltà

  /**
   * Analizza le performance per topic
   * @param userId ID dell'utente
   * @param courseId ID del corso
   * @returns Analisi dei topic con aree padronneggiate, problematiche e raccomandate
   */
  async analyzeTopicPerformance(userId: string, courseId: string): Promise<TopicAnalysis> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Ottieni tutti i risultati dei quiz per il corso
    const { data: results } = await supabase
      .from('user_quiz_results')
      .select(`
        score,
        quiz:quizzes (
          title,
          topics:quiz_topics (
            topic_name
          )
        )
      `)
      .eq('user_id', userId)
      .eq('quiz:quizzes.course_id', courseId);

    if (!results) {
      return {
        mastered: [],
        struggling: [],
        recommended: []
      };
    }

    // Raggruppa i punteggi per topic
    const topicScores = new Map<string, number[]>();
    results.forEach(result => {
      const topics = result.quiz?.topics || [];
      topics.forEach((topicObj: { topic_name: string }) => {
        const scores = topicScores.get(topicObj.topic_name) || [];
        scores.push(result.score);
        topicScores.set(topicObj.topic_name, scores);
      });
    });

    // Calcola le medie per topic
    const topicAverages = new Map<string, number>();
    topicScores.forEach((scores, topic) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      topicAverages.set(topic, average);
    });

    // Classifica i topic
    const mastered: string[] = [];
    const struggling: string[] = [];
    const recommended: string[] = [];

    topicAverages.forEach((average, topic) => {
      if (average >= this.MASTERY_THRESHOLD) {
        mastered.push(topic);
      } else if (average < this.STRUGGLING_THRESHOLD) {
        struggling.push(topic);
        // Aggiungi topic correlati alle raccomandazioni
        this.getRelatedTopics(topic).forEach(related => {
          if (!recommended.includes(related)) {
            recommended.push(related);
          }
        });
      }
    });

    return {
      mastered,
      struggling,
      recommended: recommended.filter(topic => !mastered.includes(topic))
    };
  }

  /**
   * Aggiorna le metriche di performance per un utente
   * @param metrics Metriche di performance da aggiornare
   */
  async updatePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Salva le metriche di performance
    await supabase.from('performance_metrics').insert({
      user_id: metrics.user_id,
      course_id: metrics.course_id,
      quiz_id: metrics.quiz_id,
      topic: metrics.topic,
      score: metrics.score,
      timestamp: metrics.timestamp
    });

    // Aggiorna le statistiche aggregate
    await this.updateAggregateStats(metrics);
  }

  /**
   * Aggiorna le statistiche aggregate per un utente
   * @param metrics Metriche di performance
   */
  private async updateAggregateStats(metrics: PerformanceMetrics): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Ottieni le statistiche esistenti
    const { data: stats } = await supabase
      .from('user_course_stats')
      .select('*')
      .eq('user_id', metrics.user_id)
      .eq('course_id', metrics.course_id)
      .single();

    if (stats) {
      // Aggiorna le statistiche esistenti
      await supabase
        .from('user_course_stats')
        .update({
          total_quizzes: stats.total_quizzes + 1,
          total_score: stats.total_score + metrics.score,
          average_score: Math.round((stats.total_score + metrics.score) / (stats.total_quizzes + 1)),
          last_quiz_date: metrics.timestamp,
          updated_at: new Date().toISOString()
        })
        .eq('id', stats.id);
    } else {
      // Crea nuove statistiche
      await supabase
        .from('user_course_stats')
        .insert({
          user_id: metrics.user_id,
          course_id: metrics.course_id,
          total_quizzes: 1,
          total_score: metrics.score,
          average_score: metrics.score,
          last_quiz_date: metrics.timestamp,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  }

  /**
   * Ottieni topic correlati per le raccomandazioni
   * @param topic Topic da cui trovare correlazioni
   * @returns Array di topic correlati
   */
  private getRelatedTopics(topic: string): string[] {
    // Mappa statica delle relazioni tra topic
    const topicRelations: Record<string, string[]> = {
      'javascript': ['typescript', 'react', 'node'],
      'react': ['javascript', 'redux', 'hooks'],
      'node': ['javascript', 'express', 'databases'],
      'databases': ['sql', 'mongodb', 'node'],
      'web': ['html', 'css', 'javascript'],
      'security': ['authentication', 'encryption', 'web'],
      'testing': ['unit-testing', 'integration-testing', 'jest']
    };

    return topicRelations[topic.toLowerCase()] || [];
  }
}

export const topicAnalysisService = new TopicAnalysisService();
