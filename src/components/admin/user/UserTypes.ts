export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: 'USER' | 'ADMIN' | 'INSTRUCTOR';
  account_status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login?: string;
  avatar_url?: string;
  email_confirmed: boolean;
}

export interface UserStats {
  courses_enrolled: number;
  courses_completed: number;
  certificates_earned: number;
  quizzes_taken: number;
  average_score: number;
  total_time_spent_minutes: number;
  last_active: string;
}

export interface UserDetailsProps {
  user: User;
  isDarkMode: boolean;
  onUpdateUserRole: (userId: string, newRole: 'USER' | 'ADMIN' | 'INSTRUCTOR') => Promise<void>;
  onUpdateUserStatus: (userId: string, newStatus: 'active' | 'pending' | 'suspended') => Promise<void>;
}

export interface UserStatsCardProps {
  stats: UserStats;
  isDarkMode: boolean;
}

export interface UserListItemProps {
  user: User;
  isDarkMode: boolean;
  isExpanded: boolean;
  onToggle: (userId: string) => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  formatDate: (dateString: string) => string;
  getRoleColor: (role: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

export interface UserProfileModalProps {
  user: User;
  stats: UserStats | null;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (dateString: string) => string;
}

export interface UserEditModalProps {
  user: User;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export interface UserManagerProps {
  isDarkMode: boolean;
  isAdmin: boolean;
}
