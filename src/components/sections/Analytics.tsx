import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Users, FileText, Brain, ChevronDown, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

interface AnalyticsData {
  metric: string;
  value: number;
  change_percentage: number;
}

export function Analytics({ isDarkMode }: { isDarkMode: boolean }) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Demo data
  const stats = {
    totalLearningTime: { value: 48.5, change: 12.5 },
    activeUsers: { value: 156, change: 8.3 },
    resourcesAccessed: { value: 892, change: 15.2 },
    averageScore: { value: 85, change: 5.7 }
  };

  const learningProgress = {
    videosCompleted: 24,
    totalVideos: 36,
    quizzesPassed: 18,
    totalQuizzes: 25,
    resourcesViewed: 45,
    totalResources: 50
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <div className="flex items-center gap-4">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            } border`}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {stats.totalLearningTime.change}%
            </span>
          </div>
          <h3 className="text-2xl font-bold">{stats.totalLearningTime.value}h</h3>
          <p className="text-gray-400">Total Learning Time</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {stats.activeUsers.change}%
            </span>
          </div>
          <h3 className="text-2xl font-bold">{stats.activeUsers.value}</h3>
          <p className="text-gray-400">Active Users</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {stats.resourcesAccessed.change}%
            </span>
          </div>
          <h3 className="text-2xl font-bold">{stats.resourcesAccessed.value}</h3>
          <p className="text-gray-400">Resources Accessed</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-yellow-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {stats.averageScore.change}%
            </span>
          </div>
          <h3 className="text-2xl font-bold">{stats.averageScore.value}%</h3>
          <p className="text-gray-400">Average Score</p>
        </div>
      </div>

      {/* Learning Progress */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h3 className="text-lg font-medium mb-6">Learning Progress</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Videos Completed</span>
              <span>{learningProgress.videosCompleted}/{learningProgress.totalVideos}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className="h-2 bg-purple-500 rounded-full transition-all"
                style={{ width: `${(learningProgress.videosCompleted / learningProgress.totalVideos) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Quizzes Passed</span>
              <span>{learningProgress.quizzesPassed}/{learningProgress.totalQuizzes}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${(learningProgress.quizzesPassed / learningProgress.totalQuizzes) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Resources Viewed</span>
              <span>{learningProgress.resourcesViewed}/{learningProgress.totalResources}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${(learningProgress.resourcesViewed / learningProgress.totalResources) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h3 className="text-lg font-medium mb-6">Activity Timeline</h3>
        <div className="space-y-4">
          {[
            { date: '2024-03-15', type: 'video', title: 'Completed: Introduction to Emergency Care', duration: '45m' },
            { date: '2024-03-14', type: 'quiz', title: 'Passed: Emergency Protocols Quiz', score: '92%' },
            { date: '2024-03-13', type: 'resource', title: 'Downloaded: Emergency Procedures Manual', size: '2.4 MB' }
          ].map((activity, index) => (
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
    </div>
  );
}