import React, { useEffect, useState } from 'react';
import { Activity, activityService } from '../../services/activity-service';
import { Users, BookOpen, Video, FileText, Award, Brain, AlertTriangle, Settings, Clock } from 'lucide-react';

interface ActivityFeedProps {
  isDarkMode: boolean;
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  height?: string;
  onViewDetails?: (activity: Activity) => void;
}

export function ActivityFeed({
  isDarkMode,
  limit = 10,
  showFilters = true,
  showSearch = true,
  height = '500px',
  onViewDetails
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtri
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = limit;

  // Carica le attività
  const loadActivities = async () => {
    setLoading(true);
    try {
      const result = await activityService.getActivities({
        types: selectedTypes.length > 0 ? selectedTypes as any[] : undefined,
        search: searchQuery || undefined,
        offset: currentPage * pageSize,
        limit: pageSize
      });
      setActivities(result);
      setError(null);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Errore nel caricamento delle attività');
    } finally {
      setLoading(false);
    }
  };

  // Carica le attività all'avvio
  useEffect(() => {
    loadActivities();
  }, [selectedTypes, searchQuery, currentPage, pageSize]);

  // Ottieni l'icona appropriata per il tipo di attività
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users size={20} className="text-blue-500" />;
      case 'course':
        return <BookOpen size={20} className="text-green-500" />;
      case 'video':
        return <Video size={20} className="text-purple-500" />;
      case 'document':
        return <FileText size={20} className="text-yellow-500" />;
      case 'certificate':
        return <Award size={20} className="text-red-500" />;
      case 'alert':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'admin':
        return <Settings size={20} className="text-gray-500" />;
      case 'system':
        return <Brain size={20} className="text-indigo-500" />;
      default:
        return <Clock size={20} className="text-gray-500" />;
    }
  };

  // Gestisci il click sul tipo di filtro
  const handleTypeFilterClick = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
    setCurrentPage(0); // Reset pagina quando cambia il filtro
  };

  // Gestisci il cambio della ricerca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0); // Reset pagina quando cambia la ricerca
  };

  return (
    <div className="space-y-4">
      {/* Filtri e Ricerca */}
      {(showFilters || showSearch) && (
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          {/* Filtri per tipo */}
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {['user', 'course', 'video', 'document', 'alert', 'system'].map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeFilterClick(type)}
                  className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                    selectedTypes.includes(type)
                      ? 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-200'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {getActivityIcon(type)}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => setSelectedTypes([])}
                  className={`px-3 py-1 text-xs rounded-full ${
                    isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Resetta filtri
                </button>
              )}
            </div>
          )}

          {/* Campo di ricerca */}
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca attività..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={`w-full sm:w-64 px-3 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              />
            </div>
          )}
        </div>
      )}

      {/* Elenco attività */}
      <div
        className={`overflow-y-auto ${
          isDarkMode ? 'scrollbar-dark' : 'scrollbar-light'
        }`}
        style={{ maxHeight: height }}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Nessuna attività trovata
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} cursor-pointer transition-colors`}
                onClick={() => onViewDetails && onViewDetails(activity)}
              >
                <div className="flex items-center gap-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {activity.message}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-400">
                        {activityService.formatRelativeTime(activity.created_at)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          activity.importance === 'high'
                            ? 'bg-red-100 text-red-800'
                            : activity.importance === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {activity.importance === 'high'
                          ? 'Alta'
                          : activity.importance === 'medium'
                            ? 'Media'
                            : 'Bassa'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginazione */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0 || loading}
          className={`px-3 py-1 rounded ${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
          } ${currentPage === 0 || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Precedente
        </button>
        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
          Pagina {currentPage + 1}
        </span>
        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={activities.length < pageSize || loading}
          className={`px-3 py-1 rounded ${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
          } ${activities.length < pageSize || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Successiva
        </button>
      </div>
    </div>
  );
}
