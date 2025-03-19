/**
 * Interfacce comuni per i servizi di analisi
 */

export interface TopicAnalysis {
  mastered: string[];
  struggling: string[];
  recommended: string[];
}

export interface PerformanceMetrics {
  user_id: string;
  course_id: string;
  quiz_id: string;
  topic: string;
  score: number;
  timestamp: string;
}

export interface LearningPattern {
  userId: string;
  topic: string;
  scoreAverage: number;
  completionRate: number;
  attempted: number;
  lastAttempt: string;
  trend: 'improving' | 'declining' | 'stable';
}

export interface WeakArea {
  topic: string;
  subtopics: string[];
  avgScore: number;
  recommendedResources: string[];
}

export interface TeamInsight {
  topicId: string;
  topicName: string;
  averageScore: number;
  completionRate: number;
  participationRate: number;
  scoreDistribution: {
    excellent: number; // >90%
    good: number;      // 75-90%
    average: number;   // 60-75% 
    needsImprovement: number; // <60%
  };
}

export interface AdminAnalyticsDashboard {
  userEngagement: {
    totalActiveUsers: number;
    averageTimeSpent: number;
    completionRates: Record<string, number>;
  };
  contentPerformance: {
    topCourses: Array<{ id: string; title: string; rating: number; enrollments: number }>;
    topDocuments: Array<{ id: string; title: string; views: number }>;
    topVideos: Array<{ id: string; title: string; views: number; avgWatchTime: number }>;
  };
  quizPerformance: {
    overallAverage: number;
    categoryAverages: Record<string, number>;
    difficultQuestions: Array<{ id: string; text: string; course: string; successRate: number }>;
  };
}

export interface TeamRecommendations {
  recommendations: string[];
  focusAreas: string[];
  successAreas: string[];
}

export interface LearningAnalyticsData {
  user_id: string;
  course_id?: string;
  document_id?: string;
  video_id?: string;
  quiz_id?: string;
  action_type: 'view' | 'complete' | 'quiz_attempt' | 'search';
  time_spent?: number;
  score?: number;
  metadata?: Record<string, any>;
}
