import React, { useState } from 'react';
import { 
  User, Mail, Calendar, Clock, Shield, AlertTriangle, CheckCircle2, 
  XCircle, Lock, Unlock, Ban, UserX, History, BarChart, FileText,
  Download, RefreshCw, Eye, EyeOff, Building2
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface UserProfileProps {
  userId: string;
  isDarkMode: boolean;
  onClose: () => void;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  full_name: string;
  department?: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
  last_active?: string;
  account_status: 'active' | 'suspended' | 'deleted';
  email_verified: boolean;
  failed_login_count: number;
  locked_until?: string;
  last_login?: string;
  profile_picture?: string;
}

interface UserStats {
  totalLogins: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  quizzesTaken: number;
  averageScore: number;
  totalLearningTime: number;
  totalInteractions: number;
  aiAccuracy: number;
  communicationScore: number;
  technicalScore: number;
  leadershipScore: number;
  lastQuizScore: number;
  lastQuizDate: string;
  learningStreak: number;
  bestPerformingTopics: string[];
  areasForImprovement: string[];
  certificatesEarned: number;
  activeScenarios: number;
  completedScenarios: number;
  averageSessionDuration: number;
}

export function UserProfile({ userId, isDarkMode, onClose }: UserProfileProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'security'>('info');
  const [showConfirmation, setShowConfirmation] = useState<{
    action: 'suspend' | 'delete' | 'unlock' | 'reset' | 'promote';
    message: string;
  } | null>(null);

  React.useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Load user stats
      const { data: statsData, error: statsError } = await supabase
        .from('user_learning_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      setUser(userData);
      if (statsData) {
        setStats({
          totalLogins: statsData.total_logins || 0,
          coursesEnrolled: statsData.courses_enrolled || 0,
          coursesCompleted: statsData.courses_completed || 0,
          quizzesTaken: statsData.quizzes_taken || 0,
          averageScore: statsData.avg_quiz_score || 0,
          totalLearningTime: statsData.total_learning_time || 0,
          totalInteractions: statsData.total_interactions || 0,
          aiAccuracy: statsData.ai_accuracy || 0,
          communicationScore: statsData.communication_score || 0,
          technicalScore: statsData.technical_score || 0,
          leadershipScore: statsData.leadership_score || 0,
          lastQuizScore: statsData.last_quiz_score || 0,
          lastQuizDate: statsData.last_quiz_date || '',
          learningStreak: statsData.learning_streak || 0,
          bestPerformingTopics: statsData.best_performing_topics || [],
          areasForImprovement: statsData.areas_for_improvement || [],
          certificatesEarned: statsData.certificates_earned || 0,
          activeScenarios: statsData.active_scenarios || 0,
          completedScenarios: statsData.completed_scenarios || 0,
          averageSessionDuration: statsData.average_session_duration || 0
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'suspend' | 'delete' | 'unlock' | 'reset' | 'promote') => {
    if (!user) return;

    try {
      switch (action) {
        case 'suspend':
          await supabase
            .from('users')
            .update({ 
              account_status: 'suspended',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          break;

        case 'delete':
          await supabase
            .from('users')
            .update({ 
              account_status: 'deleted',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          break;

        case 'unlock':
          await supabase
            .from('users')
            .update({ 
              failed_login_count: 0,
              locked_until: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          break;

        case 'reset':
          // Send password reset email
          await supabase.auth.resetPasswordForEmail(user.email);
          break;

        case 'promote':
          await supabase
            .from('users')
            .update({ 
              role: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          break;
      }

      await loadUserData();
      setShowConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error performing action');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-24 h-24 rounded-xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-purple-500 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          )}
          <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 ${
            isDarkMode ? 'border-gray-800' : 'border-white'
          } ${
            user.account_status === 'active' ? 'bg-green-500' :
            user.account_status === 'suspended' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold">{user.full_name}</h2>
          <div className="flex items-center gap-2 text-gray-400">
            <Mail size={16} />
            <span>{user.email}</span>
            {user.email_verified && (
              <CheckCircle2 size={16} className="text-green-500" />
            )}
          </div>
          {user.department && (
            <div className="flex items-center gap-2 text-gray-400 mt-1">
              <Building2 size={16} />
              <span>{user.department}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirmation({
              action: user.account_status === 'suspended' ? 'unlock' : 'suspend',
              message: user.account_status === 'suspended' 
                ? 'Are you sure you want to reactivate this account?' 
                : 'Are you sure you want to suspend this account?'
            })}
            className={`p-2 rounded-lg transition-colors ${
              user.account_status === 'suspended'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-yellow-500 hover:bg-yellow-600'
            } text-white`}
            title={user.account_status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
          >
            {user.account_status === 'suspended' ? <Unlock size={20} /> : <Ban size={20} />}
          </button>
          
          <button
            onClick={() => setShowConfirmation({
              action: 'delete',
              message: 'Are you sure you want to delete this account? This action cannot be undone.'
            })}
            className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            title="Delete Account"
          >
            <UserX size={20} />
          </button>

          <button
            onClick={() => setShowConfirmation({
              action: 'promote',
              message: user.role === 'ADMIN' 
                ? 'Remove admin privileges from this user?'
                : 'Promote this user to admin?'
            })}
            className={`p-2 rounded-lg transition-colors ${
              user.role === 'ADMIN'
                ? 'bg-gray-500 hover:bg-gray-600'
                : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
            title={user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
          >
            <Shield size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'info'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Information
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'activity'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'security'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Security
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'info' && (
          <>
            {/* Basic Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Calendar size={20} className="text-purple-500" />
                  <span className="text-sm text-gray-400">Member Since</span>
                </div>
                <p className="text-lg font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Clock size={20} className="text-blue-500" />
                  <span className="text-sm text-gray-400">Last Active</span>
                </div>
                <p className="text-lg font-medium">
                  {user.last_active 
                    ? new Date(user.last_active).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>

              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <Shield size={20} className="text-green-500" />
                  <span className="text-sm text-gray-400">Role</span>
                </div>
                <p className="text-lg font-medium">{user.role}</p>
              </div>
            </div>

            {/* Learning Stats */}
            {stats && (
              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>
                <h3 className="text-lg font-medium mb-4">Learning Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Enrolled Courses</p>
                    <p className="text-2xl font-bold">{stats.coursesEnrolled}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Completed Courses</p>
                    <p className="text-2xl font-bold">{stats.coursesCompleted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Quizzes Taken</p>
                    <p className="text-2xl font-bold">{stats.quizzesTaken}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Average Score</p>
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Study Time</p>
                    <p className="text-2xl font-bold">{Math.round(stats.totalLearningTime / 3600)}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Logins</p>
                    <p className="text-2xl font-bold">{stats.totalLogins}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">AI Interactions</p>
                    <p className="text-2xl font-bold">{stats.totalInteractions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">AI Accuracy</p>
                    <p className="text-2xl font-bold">{stats.aiAccuracy}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Communication</p>
                    <p className="text-2xl font-bold">{stats.communicationScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Technical Skills</p>
                    <p className="text-2xl font-bold">{stats.technicalScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Leadership</p>
                    <p className="text-2xl font-bold">{stats.leadershipScore}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Certificates</p>
                    <p className="text-2xl font-bold">{stats.certificatesEarned}</p>
                  </div>
                </div>

                {/* Learning Progress */}
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Learning Progress</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm text-gray-400 mb-2">Best Topics</h5>
                      <div className="space-y-2">
                        {stats.bestPerformingTopics.map((topic, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm text-gray-400 mb-2">Areas for Improvement</h5>
                      <div className="space-y-2">
                        {stats.areasForImprovement.map((area, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span>{area}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Performance */}
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Recent Performance</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Last Quiz</p>
                      <p className="text-xl font-bold">{stats.lastQuizScore}%</p>
                      <p className="text-sm text-gray-400">{stats.lastQuizDate}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Learning Streak</p>
                      <p className="text-xl font-bold">{stats.learningStreak} days</p>
                      <p className="text-sm text-gray-400">Consecutive</p>
                    </div>
                  </div>
                </div>

                {/* Simulation Stats */}
                <div className="mt-8">
                  <h4 className="font-medium mb-4">Simulation Statistics</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Active Scenarios</p>
                      <p className="text-xl font-bold">{stats.activeScenarios}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Completed Scenarios</p>
                      <p className="text-xl font-bold">{stats.completedScenarios}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <p className="text-sm text-gray-400">Average Session Duration</p>
                      <p className="text-xl font-bold">{stats.averageSessionDuration}m</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <div className={`p-6 rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Recent Activity</h3>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors text-white">
                <Download size={16} />
                Export Activity Log
              </button>
            </div>

            <div className="space-y-4">
              {/* Example activity items */}
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Completed Course: Advanced Emergency Care</p>
                  <p className="text-sm text-gray-400">March 15, 2024 at 14:30</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <BarChart size={16} className="text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Passed Quiz: Patient Assessment</p>
                  <p className="text-sm text-gray-400">March 14, 2024 at 10:15</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <History size={16} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Started Course: Emergency Response Protocols</p>
                  <p className="text-sm text-gray-400">March 13, 2024 at 09:45</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <h3 className="text-lg font-medium mb-4">Security Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={20} className="text-gray-400" />
                    <span>Email Verification</span>
                  </div>
                  {user.email_verified ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 size={20} />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-500">
                      <AlertTriangle size={20} />
                      <span>Not Verified</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={20} className="text-gray-400" />
                    <span>Account Status</span>
                  </div>
                  <div className={`flex items-center gap-2 ${
                    user.account_status === 'active' ? 'text-green-500' :
                    user.account_status === 'suspended' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {user.account_status === 'active' ? <CheckCircle2 size={20} /> :
                     user.account_status === 'suspended' ? <Ban size={20} /> :
                     <XCircle size={20} />}
                    <span className="capitalize">{user.account_status}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={20} className="text-gray-400" />
                    <span>Last Login</span>
                  </div>
                  <span>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-gray-400" />
                    <span>Failed Login Attempts</span>
                  </div>
                  <span className={user.failed_login_count > 0 ? 'text-yellow-500' : ''}>
                    {user.failed_login_count}
                  </span>
                </div>

                {user.locked_until && new Date(user.locked_until) > new Date() && (
                  <div className="flex items-center justify-between text-red-500">
                    <div className="flex items-center gap-2">
                      <Lock size={20} />
                      <span>Account Locked</span>
                    </div>
                    <span>Until {new Date(user.locked_until).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowConfirmation({
                    action: 'reset',
                    message: 'Send password reset email to this user?'
                  })}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw size={16} />
                  Reset Password
                </button>

                {user.locked_until && new Date(user.locked_until) > new Date() && (
                  <button
                    onClick={() => setShowConfirmation({
                      action: 'unlock',
                      message: 'Unlock this account?'
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Unlock size={16} />
                    Unlock Account
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-lg font-medium mb-4">Confirm Action</h3>
            <p className="text-gray-400 mb-6">{showConfirmation.message}</p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmation(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(showConfirmation.action)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}