import React from 'react';
import { 
  BarChart4, 
  BookOpen,
  Award, 
  Clock, 
  CheckCircle2, 
  BrainCircuit, 
  Calendar 
} from 'lucide-react';
import { UserStatsCardProps } from './UserTypes';

export function UserStatsCard({ stats, isDarkMode }: UserStatsCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
      <h4 className="font-medium mb-3 flex items-center">
        <BarChart4 className="mr-2" size={18} />
        Statistiche di Attività
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-purple-50'}`}>
              <BookOpen size={18} className={isDarkMode ? 'text-purple-300' : 'text-purple-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Corsi iscritti</p>
              <p className="font-medium">{stats.courses_enrolled}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-green-50'}`}>
              <CheckCircle2 size={18} className={isDarkMode ? 'text-green-300' : 'text-green-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Corsi completati</p>
              <p className="font-medium">{stats.courses_completed}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-yellow-50'}`}>
              <Award size={18} className={isDarkMode ? 'text-yellow-300' : 'text-yellow-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Certificati ottenuti</p>
              <p className="font-medium">{stats.certificates_earned}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-blue-50'}`}>
              <BrainCircuit size={18} className={isDarkMode ? 'text-blue-300' : 'text-blue-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Quiz completati</p>
              <p className="font-medium">{stats.quizzes_taken}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-indigo-50'}`}>
              <Clock size={18} className={isDarkMode ? 'text-indigo-300' : 'text-indigo-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tempo totale</p>
              <p className="font-medium">{formatTime(stats.total_time_spent_minutes)}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${isDarkMode ? 'bg-gray-600' : 'bg-pink-50'}`}>
              <Calendar size={18} className={isDarkMode ? 'text-pink-300' : 'text-pink-500'} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ultimo accesso</p>
              <p className="font-medium">{formatDate(stats.last_active)}</p>
            </div>
          </div>
        </div>
        
        {stats.quizzes_taken > 0 && (
          <div>
            <div className="mb-1 flex justify-between items-center">
              <p className="text-xs text-gray-500">Punteggio medio quiz</p>
              <p className="font-medium">{Math.round(stats.average_score)}%</p>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-2 bg-blue-500 rounded-full" 
                style={{ width: `${Math.round(stats.average_score)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserStatsCard;
