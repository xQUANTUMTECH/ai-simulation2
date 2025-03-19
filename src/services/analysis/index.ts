import { topicAnalysisService } from './topic-analysis';
import { learningAnalysisService } from './learning-analysis';
import { teamAdminAnalysisService } from './team-admin-analysis';
import { TopicAnalysis, PerformanceMetrics, LearningPattern, WeakArea, TeamInsight, TeamRecommendations, AdminAnalyticsDashboard, LearningAnalyticsData } from './types';

/**
 * Servizio unificato per tutte le funzionalità di analisi
 * Combina le funzionalità di analisi topic, learning e admin
 */
class AnalysisService {
  // Topic Analysis Service
  async analyzeTopicPerformance(userId: string, courseId: string): Promise<TopicAnalysis> {
    return topicAnalysisService.analyzeTopicPerformance(userId, courseId);
  }

  async updatePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    return topicAnalysisService.updatePerformanceMetrics(metrics);
  }

  // Learning Analysis Service
  async getUserLearningPatterns(userId?: string): Promise<LearningPattern[]> {
    return learningAnalysisService.getUserLearningPatterns(userId);
  }

  async getUserWeakAreas(userId?: string): Promise<WeakArea[]> {
    return learningAnalysisService.getUserWeakAreas(userId);
  }

  async recordLearningAnalytics(data: LearningAnalyticsData): Promise<void> {
    return learningAnalysisService.recordLearningAnalytics(data);
  }

  // Team & Admin Analysis Service
  async getTeamInsights(departmentId: string): Promise<TeamInsight[]> {
    return teamAdminAnalysisService.getTeamInsights(departmentId);
  }

  async generateTeamRecommendations(departmentId: string): Promise<TeamRecommendations> {
    return teamAdminAnalysisService.generateTeamRecommendations(departmentId);
  }

  async getAdminAnalyticsDashboard(): Promise<AdminAnalyticsDashboard> {
    return teamAdminAnalysisService.getAdminAnalyticsDashboard();
  }
}

export const analysisService = new AnalysisService();

// Esporta anche i servizi individuali per l'accesso diretto se necessario
export {
  topicAnalysisService,
  learningAnalysisService,
  teamAdminAnalysisService
};

// Ri-esporta i tipi
export * from './types';
