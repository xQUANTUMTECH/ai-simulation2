import { Activity } from '../../../services/activity-service';
import { Alert } from '../../../services/alert-service';

// Tipi comuni usati nella dashboard
export interface DashboardProps {
  isDarkMode: boolean;
}

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: number;
  isDarkMode: boolean;
}

export interface StatsData {
  users: { value: number; change: number };
  courses: { value: number; change: number };
  videos: { value: number; change: number };
  documents: { value: number; change: number };
  certificates: { value: number; change: number };
  aiInteractions: { value: number; change: number };
}

export interface TimeSeriesDataPoint {
  name: string;
  utenti: number;
  videosVisti: number;
  completamenti: number;
}

export interface CompletionRateDataPoint {
  name: string;
  value: number;
}

export interface QuizErrorDataPoint {
  name: string;
  value: number;
}

export interface TimeSpentDataPoint {
  name: string;
  value: number;
}

export interface UserProgressDataPoint {
  name: string;
  nuovi: number;
  attivi: number;
  completati: number;
}

export interface DifficultQuestion {
  id: number;
  text: string;
  categoria: string;
  tassoSuccesso: number;
  frequenza: number;
}

export interface ChartProps {
  isDarkMode: boolean;
  timeSeriesData: TimeSeriesDataPoint[];
  completionRateData: CompletionRateDataPoint[];
  quizErrorsData: QuizErrorDataPoint[];
  timeSpentData: TimeSpentDataPoint[];
  colors: string[];
}

export interface AnalyticsTabProps {
  isDarkMode: boolean;
  isLoading: boolean;
  userProgressData: UserProgressDataPoint[];
  difficultQuestions: DifficultQuestion[];
  onExportData: () => void;
}

export interface ActivityTabProps {
  isDarkMode: boolean;
  onViewDetails: (activity: Activity) => void;
}

export interface AlertsTabProps {
  isDarkMode: boolean;
  onViewDetails: (alert: Alert) => void;
  onResolve: (alert: Alert) => void;
  onAssign: (alert: Alert) => void;
}

export interface RecommendationsTabProps {
  isDarkMode: boolean;
  recommendations: string[];
  isLoading: boolean;
}
