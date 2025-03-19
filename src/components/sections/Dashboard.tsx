import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Users, FileText, Brain, ChevronRight, Calendar, ArrowUp, Play, Book, CheckCircle2, Bell } from 'lucide-react';
import { courseService } from '../../services/course-service';
import { courseProgressService } from '../../services/course-progress-service';
import { notificationService } from '../../services/notification-service';

interface DashboardProps {
  isDarkMode: boolean;
  onSectionChange: (section: string) => void;
}

export function Dashboard({ isDarkMode, onSectionChange }: DashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load enrollments with progress
      const enrollmentsData = await courseService.getUserEnrollments();
      setEnrollments(enrollmentsData);

      // Load notifications
      const notificationsData = await notificationService.getNotifications(5);
      setNotifications(notificationsData);

      // Recent activity would be loaded here
      setRecentActivity([
        { type: 'video', title: 'Completed: Introduction to Emergency Care', date: '2024-03-15', duration: '45m' },
        { type: 'quiz', title: 'Passed: Emergency Protocols Quiz', date: '2024-03-14', score: '92%' },
        { type: 'resource', title: 'Downloaded: Emergency Procedures Manual', date: '2024-03-13', size: '2.4 MB' }
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Book className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-2xl font-bold">5</h3>
          <p className="text-gray-400">Corsi Attivi</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              8h
            </span>
          </div>
          <h3 className="text-2xl font-bold">24h</h3>
          <p className="text-gray-400">Tempo di Studio</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              15%
            </span>
          </div>
          <h3 className="text-2xl font-bold">85%</h3>
          <p className="text-gray-400">Media Quiz</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              10
            </span>
          </div>
          <h3 className="text-2xl font-bold">45</h3>
          <p className="text-gray-400">Risorse Scaricate</p>
        </div>
      </div>

      {/* Course Progress */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Corsi in Corso</h3>
          <button
            onClick={() => onSectionChange('corsi')}
            className="text-purple-500 hover:text-purple-600 transition-colors"
          >
            Vedi Tutti
          </button>
        </div>
        <div className="space-y-4">
          {enrollments.slice(0, 3).map((enrollment) => (
            <div 
              key={enrollment.id}
              className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{enrollment.course.title}</h4>
                <span className="text-sm text-gray-400">
                  {enrollment.progress}% Completato
                </span>
              </div>
              <div className="h-2 bg-gray-600 rounded-full">
                <div 
                  className="h-2 bg-purple-500 rounded-full transition-all"
                  style={{ width: `${enrollment.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-lg font-semibold mb-6">Attività Recenti</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center">
                    {activity.type === 'video' && <Play size={16} className="text-purple-500" />}
                    {activity.type === 'quiz' && <Brain size={16} className="text-green-500" />}
                    {activity.type === 'resource' && <FileText size={16} className="text-blue-500" />}
                  </div>
                  <div className="flex-1 w-px bg-gray-700 my-2" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{activity.date}</p>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-gray-400">
                    {activity.type === 'video' && activity.duration}
                    {activity.type === 'quiz' && activity.score}
                    {activity.type === 'resource' && activity.size}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Notifiche</h3>
            <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
              {notifications.filter(n => !n.read).length} nuove
            </span>
          </div>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                } ${!notification.read && 'border-l-4 border-purple-500'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    notification.notification_type === 'COURSE' ? 'bg-blue-500 bg-opacity-20' :
                    notification.notification_type === 'QUIZ' ? 'bg-green-500 bg-opacity-20' :
                    'bg-purple-500 bg-opacity-20'
                  }`}>
                    {notification.notification_type === 'COURSE' && <Book size={16} className="text-blue-500" />}
                    {notification.notification_type === 'QUIZ' && <Brain size={16} className="text-green-500" />}
                    {notification.notification_type === 'SYSTEM' && <Bell size={16} className="text-purple-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-gray-400">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}