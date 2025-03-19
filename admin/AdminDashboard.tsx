import React from 'react';
import { 
  Users, BookOpen, Video, FileText, Award, Brain,
  ArrowUp, ArrowDown, Clock, Calendar, CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AdminDashboardProps {
  isDarkMode: boolean;
}

export function AdminDashboard({ isDarkMode }: AdminDashboardProps) {
  const stats = {
    users: { value: 1250, change: 12.5 },
    courses: { value: 45, change: 8.3 },
    videos: { value: 320, change: -5.2 },
    documents: { value: 892, change: 15.2 },
    certificates: { value: 450, change: 10.7 },
    aiInteractions: { value: 15600, change: 25.4 }
  };

  const recentActivity = [
    {
      id: 1,
      type: 'user',
      message: 'Nuovo utente registrato: Mario Rossi',
      time: '5 minuti fa'
    },
    {
      id: 2,
      type: 'course',
      message: 'Corso "Gestione Emergenze" pubblicato',
      time: '15 minuti fa'
    },
    {
      id: 3,
      type: 'alert',
      message: 'Errore nel caricamento video ID: 1234',
      time: '1 ora fa'
    }
  ];

  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      message: 'Storage al 85% della capacità',
      action: 'Verifica'
    },
    {
      id: 2,
      type: 'error',
      message: 'Errore di sincronizzazione AI',
      action: 'Risolvi'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Ultimo aggiornamento:</span>
          <span className="text-sm">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          icon={<Users className="text-blue-500" />}
          label="Utenti Totali"
          value={stats.users.value}
          change={stats.users.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<BookOpen className="text-green-500" />}
          label="Corsi Attivi"
          value={stats.courses.value}
          change={stats.courses.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<Video className="text-purple-500" />}
          label="Video"
          value={stats.videos.value}
          change={stats.videos.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<FileText className="text-yellow-500" />}
          label="Documenti"
          value={stats.documents.value}
          change={stats.documents.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<Award className="text-red-500" />}
          label="Certificati"
          value={stats.certificates.value}
          change={stats.certificates.change}
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={<Brain className="text-indigo-500" />}
          label="Interazioni AI"
          value={stats.aiInteractions.value}
          change={stats.aiInteractions.change}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Attività Recenti</h2>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {activity.type === 'user' && <Users size={20} className="text-blue-500" />}
                  {activity.type === 'course' && <BookOpen size={20} className="text-green-500" />}
                  {activity.type === 'alert' && <AlertTriangle size={20} className="text-red-500" />}
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts */}
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Avvisi di Sistema</h2>
          <div className="space-y-4">
            {systemAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg ${
                  alert.type === 'warning' 
                    ? 'bg-yellow-500 bg-opacity-10 border border-yellow-500'
                    : 'bg-red-500 bg-opacity-10 border border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {alert.type === 'warning' ? (
                      <AlertTriangle size={20} className="text-yellow-500" />
                    ) : (
                      <AlertTriangle size={20} className="text-red-500" />
                    )}
                    <span className={alert.type === 'warning' ? 'text-yellow-500' : 'text-red-500'}>
                      {alert.message}
                    </span>
                  </div>
                  <button className={`px-3 py-1 rounded-lg text-sm ${
                    alert.type === 'warning'
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}>
                    {alert.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: number;
  isDarkMode: boolean;
}

function StatCard({ icon, label, value, change, isDarkMode }: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
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
      <h3 className="text-2xl font-bold mb-1">{value.toLocaleString()}</h3>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}