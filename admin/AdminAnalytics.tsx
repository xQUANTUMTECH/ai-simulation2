import React from 'react';
import { BarChart, ArrowUp, ArrowDown, Users, Clock, Brain, FileText } from 'lucide-react';

interface AdminAnalyticsProps {
  isDarkMode: boolean;
}

export function AdminAnalytics({ isDarkMode }: AdminAnalyticsProps) {
  const stats = {
    activeUsers: { value: 1250, change: 12.5 },
    learningTime: { value: 45, change: 8.3 },
    aiInteractions: { value: 15600, change: 25.4 },
    resourcesAccessed: { value: 892, change: 15.2 }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Panoramica Analytics</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="text-blue-500" />}
          label="Utenti Attivi"
          value={stats.activeUsers.value}
          change={stats.activeUsers.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<Clock className="text-green-500" />}
          label="Tempo Medio Studio"
          value={`${stats.learningTime.value}h`}
          change={stats.learningTime.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<Brain className="text-purple-500" />}
          label="Interazioni AI"
          value={stats.aiInteractions.value}
          change={stats.aiInteractions.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<FileText className="text-yellow-500" />}
          label="Risorse Accedute"
          value={stats.resourcesAccessed.value}
          change={stats.resourcesAccessed.change}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Additional analytics content would go here */}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: number;
  isDarkMode: boolean;
}

function StatCard({ icon, label, value, change, isDarkMode }: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 ${
          change >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {change >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}