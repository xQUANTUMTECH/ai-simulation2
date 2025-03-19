import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, CheckCircle, AlertCircle, X, User, Calendar, Filter, Search } from 'lucide-react';
import { Alert, AlertCategory, AlertType, AlertPriority, alertService } from '../../services/alert-service';

interface SystemAlertsProps {
  isDarkMode: boolean;
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  height?: string;
  onResolve?: (alert: Alert) => void;
  onAssign?: (alert: Alert) => void;
  onViewDetails?: (alert: Alert) => void;
}

export function SystemAlerts({
  isDarkMode,
  limit = 10,
  showFilters = true,
  showSearch = true,
  height = '500px',
  onResolve,
  onAssign,
  onViewDetails
}: SystemAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<AlertCategory, number>>({} as Record<AlertCategory, number>);
  
  // Filtri
  const [selectedTypes, setSelectedTypes] = useState<AlertType[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<AlertPriority[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<AlertCategory[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = limit;

  // Carica gli avvisi
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const result = await alertService.getAlerts({
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        resolved: showResolved,
        search: searchQuery || undefined,
        offset: currentPage * pageSize,
        limit: pageSize
      });
      setAlerts(result);
      setError(null);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Errore nel caricamento degli avvisi');
    } finally {
      setLoading(false);
    }
  };

  // Carica i conteggi degli avvisi per categoria
  const loadAlertCounts = async () => {
    try {
      const counts = await alertService.getActiveAlertCounts();
      setCategoryCounts(counts);
    } catch (err) {
      console.error('Error loading alert counts:', err);
    }
  };

  // Carica gli avvisi all'avvio
  useEffect(() => {
    loadAlerts();
    loadAlertCounts();
  }, [selectedTypes, selectedPriorities, selectedCategories, showResolved, searchQuery, currentPage, pageSize]);

  // Ottieni l'icona per il tipo di avviso
  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={20} style={{ color: alertService.getAlertTypeColor(type) }} />;
      case 'warning':
        return <AlertTriangle size={20} style={{ color: alertService.getAlertTypeColor(type) }} />;
      case 'success':
        return <CheckCircle size={20} style={{ color: alertService.getAlertTypeColor(type) }} />;
      case 'info':
      default:
        return <Info size={20} style={{ color: alertService.getAlertTypeColor(type) }} />;
    }
  };

  // Gestisci il click sul tipo di filtro
  const handleTypeFilterClick = (type: AlertType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
    setCurrentPage(0);
  };

  // Gestisci il click sulla priorità del filtro
  const handlePriorityFilterClick = (priority: AlertPriority) => {
    if (selectedPriorities.includes(priority)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
    } else {
      setSelectedPriorities([...selectedPriorities, priority]);
    }
    setCurrentPage(0);
  };

  // Gestisci il click sulla categoria del filtro
  const handleCategoryFilterClick = (category: AlertCategory) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
    setCurrentPage(0);
  };

  // Gestisci il cambio della ricerca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  // Formatta la data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Formatta la priorità dell'avviso
  const formatPriority = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical':
        return 'Critica';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Bassa';
      default:
        return priority;
    }
  };

  // Gestisci il click su un avviso per visualizzare i dettagli
  const handleAlertClick = (alert: Alert) => {
    if (onViewDetails) {
      onViewDetails(alert);
    }
  };

  return (
    <div className="space-y-4">
      {/* Conteggi per categoria */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {Object.entries(categoryCounts)
            .filter(([_, count]) => count > 0)
            .sort(([_, countA], [__, countB]) => countB - countA)
            .slice(0, 5)
            .map(([category, count]) => (
              <div
                key={category}
                onClick={() => handleCategoryFilterClick(category as AlertCategory)}
                className={`p-2 rounded-lg ${
                  selectedCategories.includes(category as AlertCategory)
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-200'
                      : 'bg-gray-100 text-gray-800'
                } cursor-pointer flex items-center justify-between`}
              >
                <span className="capitalize">{category}</span>
                <span className="bg-white text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  {count}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Filtri e Ricerca */}
      {(showFilters || showSearch) && (
        <div className="space-y-3">
          {/* Filtri per tipo e priorità */}
          {showFilters && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tipo:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['info', 'warning', 'error', 'success'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeFilterClick(type as AlertType)}
                    className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                      selectedTypes.includes(type as AlertType)
                        ? 'bg-blue-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-200'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {getAlertIcon(type as AlertType)}
                    <span className="capitalize">{type}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Filter size={16} className="text-gray-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priorità:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['critical', 'high', 'medium', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityFilterClick(priority as AlertPriority)}
                    className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                      selectedPriorities.includes(priority as AlertPriority)
                        ? 'bg-blue-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-200'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                    style={{
                      color: selectedPriorities.includes(priority as AlertPriority)
                        ? 'white'
                        : alertService.getAlertPriorityColor(priority as AlertPriority),
                      borderColor: alertService.getAlertPriorityColor(priority as AlertPriority)
                    }}
                  >
                    <span className="capitalize">{formatPriority(priority as AlertPriority)}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={() => setShowResolved(!showResolved)}
                    className="form-checkbox h-4 w-4 text-blue-500"
                  />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mostra risolti
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Campo di ricerca */}
          {showSearch && (
            <div className="relative mt-3">
              <input
                type="text"
                placeholder="Cerca avvisi..."
                value={searchQuery}
                onChange={handleSearchChange}
                className={`w-full px-3 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search size={16} className="text-gray-400" />
              </div>
            </div>
          )}

          {/* Pulsante reset filtri */}
          {(selectedTypes.length > 0 || selectedPriorities.length > 0 || selectedCategories.length > 0 || showResolved || searchQuery) && (
            <button
              onClick={() => {
                setSelectedTypes([]);
                setSelectedPriorities([]);
                setSelectedCategories([]);
                setShowResolved(false);
                setSearchQuery('');
                setCurrentPage(0);
              }}
              className={`px-3 py-1 text-xs rounded ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
              }`}
            >
              Resetta tutti i filtri
            </button>
          )}
        </div>
      )}

      {/* Elenco avvisi */}
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
        ) : alerts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Nessun avviso trovato
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-colors ${
                  alert.resolved_at
                    ? isDarkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                    : alert.priority === 'critical'
                      ? 'bg-red-50 border-red-300'
                      : alert.priority === 'high'
                        ? 'bg-orange-50 border-orange-300'
                        : alert.priority === 'medium'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-blue-50 border-blue-300'
                } ${
                  isDarkMode && alert.priority === 'critical'
                    ? 'bg-red-900 bg-opacity-20 border-red-800'
                    : isDarkMode && alert.priority === 'high'
                      ? 'bg-orange-900 bg-opacity-20 border-orange-800'
                      : isDarkMode && alert.priority === 'medium'
                        ? 'bg-yellow-900 bg-opacity-20 border-yellow-800'
                        : isDarkMode && alert.priority === 'low'
                          ? 'bg-blue-900 bg-opacity-20 border-blue-800'
                          : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {alert.message}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {alert.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
                            style={{
                              backgroundColor: `${alertService.getAlertPriorityColor(alert.priority)}20`,
                              color: alertService.getAlertPriorityColor(alert.priority)
                            }}
                          >
                            {formatPriority(alert.priority)}
                          </span>
                          {alert.resolved_at && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                              Risolto
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Azioni sugli avvisi */}
                      {!alert.resolved_at && (
                        <div className="flex space-x-2">
                          {onResolve && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onResolve(alert);
                              }}
                              className={`p-1 rounded-full text-green-500 hover:bg-green-100 ${
                                isDarkMode ? 'hover:bg-green-900 hover:bg-opacity-20' : ''
                              }`}
                              title="Risolvi avviso"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {onAssign && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssign(alert);
                              }}
                              className={`p-1 rounded-full text-blue-500 hover:bg-blue-100 ${
                                isDarkMode ? 'hover:bg-blue-900 hover:bg-opacity-20' : ''
                              }`}
                              title="Assegna avviso"
                            >
                              <User size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar size={12} />
                        <span>{formatDate(alert.created_at)}</span>
                      </div>
                      {alert.resolved_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <CheckCircle size={12} />
                          <span>Risolto il {formatDate(alert.resolved_at)}</span>
                        </div>
                      )}
                      {alert.source && (
                        <div className="text-xs text-gray-400">
                          <span>Fonte: {alert.source}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {onViewDetails && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => onViewDetails(alert)}
                      className={`text-xs px-2 py-1 rounded ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      Dettagli
                    </button>
                  </div>
                )}
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
          disabled={alerts.length < pageSize || loading}
          className={`px-3 py-1 rounded ${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
          } ${alerts.length < pageSize || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Successiva
        </button>
      </div>
    </div>
  );
}
