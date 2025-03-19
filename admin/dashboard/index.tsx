import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Video, FileText, Award, Brain,
  ExternalLink, Download, AlertTriangle
} from 'lucide-react';
import { ActivityFeed } from '../ActivityFeed';
import { SystemAlerts } from '../SystemAlerts';
import { Activity } from '../../src/services/activity-service';
import { Alert, alertService } from '../../src/services/alert-service';
import { teamAdminAnalysisService } from '../../src/services/analysis/team-admin-analysis';
import { learningAnalysisService } from '../../src/services/analysis/learning-analysis';

// Importa componenti del dashboard
import StatCard from './StatCard';
import DashboardCharts from './DashboardCharts';
import AnalyticsTab from './AnalyticsTab';
import RecommendationsTab from './RecommendationsTab';
import ActivityTab from './ActivityTab';
import AlertsTab from './AlertsTab';

// Importa tipi
import { 
  DashboardProps, 
  StatsData, 
  TimeSeriesDataPoint, 
  CompletionRateDataPoint, 
  QuizErrorDataPoint, 
  TimeSpentDataPoint,
  UserProgressDataPoint,
  DifficultQuestion
} from './types';

export function AdminDashboard({ isDarkMode }: DashboardProps) {
  // Stato per tab attivo
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity' | 'alerts' | 'recommendations'>('overview');
  
  // Stato per modale dettagli
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Stato per dati e caricamento
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<any[]>([]);

  // Dati statistici
  const stats: StatsData = {
    users: { value: 1250, change: 12.5 },
    courses: { value: 45, change: 8.3 },
    videos: { value: 320, change: -5.2 },
    documents: { value: 892, change: 15.2 },
    certificates: { value: 450, change: 10.7 },
    aiInteractions: { value: 15600, change: 25.4 }
  };

  // Dati per i grafici della dashboard
  const timeSeriesData: TimeSeriesDataPoint[] = [
    { name: 'Gen', utenti: 420, videosVisti: 120, completamenti: 80 },
    { name: 'Feb', utenti: 480, videosVisti: 150, completamenti: 90 },
    { name: 'Mar', utenti: 510, videosVisti: 180, completamenti: 110 },
    { name: 'Apr', utenti: 550, videosVisti: 220, completamenti: 150 },
    { name: 'Mag', utenti: 600, videosVisti: 260, completamenti: 190 },
    { name: 'Giu', utenti: 650, videosVisti: 300, completamenti: 210 },
    { name: 'Lug', utenti: 700, videosVisti: 340, completamenti: 230 },
    { name: 'Ago', utenti: 720, videosVisti: 360, completamenti: 250 },
    { name: 'Set', utenti: 780, videosVisti: 400, completamenti: 270 },
    { name: 'Ott', utenti: 820, videosVisti: 430, completamenti: 290 },
    { name: 'Nov', utenti: 950, videosVisti: 480, completamenti: 320 },
    { name: 'Dic', utenti: 1250, videosVisti: 520, completamenti: 450 }
  ];

  const completionRateData: CompletionRateDataPoint[] = [
    { name: 'Gestione dei Rischi', value: 86 },
    { name: 'Conformità Normativa', value: 92 },
    { name: 'Cybersecurity', value: 75 },
    { name: 'Leadership', value: 80 },
    { name: 'Economia', value: 68 }
  ];

  const quizErrorsData: QuizErrorDataPoint[] = [
    { name: 'Errori di comprensione', value: 42 },
    { name: 'Errori di applicazione', value: 28 },
    { name: 'Errori concettuali', value: 18 },
    { name: 'Errori tecnici', value: 12 }
  ];

  const timeSpentData: TimeSpentDataPoint[] = [
    { name: 'Video', value: 40 },
    { name: 'Quiz', value: 30 },
    { name: 'Documenti', value: 20 },
    { name: 'Simulazioni', value: 10 }
  ];

  // Dati dettagliati per la dashboard analitica
  const userProgressData: UserProgressDataPoint[] = [
    { name: 'Settimana 1', nuovi: 65, attivi: 45, completati: 12 },
    { name: 'Settimana 2', nuovi: 58, attivi: 52, completati: 15 },
    { name: 'Settimana 3', nuovi: 90, attivi: 63, completati: 20 },
    { name: 'Settimana 4', nuovi: 72, attivi: 58, completati: 22 }
  ];

  const difficultQuestions: DifficultQuestion[] = [
    { id: 1, text: "Quale regolamento definisce le norme GDPR?", categoria: "Conformità", tassoSuccesso: 32, frequenza: 122 },
    { id: 2, text: "Quali sono i principali rischi del mercato finanziario?", categoria: "Economia", tassoSuccesso: 41, frequenza: 95 },
    { id: 3, text: "Come si implementa un sistema di controllo interno?", categoria: "Gestione", tassoSuccesso: 36, frequenza: 108 },
    { id: 4, text: "Quali sono le misure di sicurezza raccomandate?", categoria: "Cybersecurity", tassoSuccesso: 29, frequenza: 134 },
    { id: 5, text: "Come identificare un tentativo di phishing?", categoria: "Cybersecurity", tassoSuccesso: 38, frequenza: 143 },
  ];

  // Colori per i grafici
  const COLORS = isDarkMode 
    ? ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#FFBB28']
    : ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#FFBB28'];

  useEffect(() => {
    // Carica i dati di analisi quando viene selezionata la tab analytics
    if (activeTab === 'analytics' && !analyticsData) {
      loadAnalyticsData();
    }

    // Carica i consigli basati sugli errori quando viene selezionata la tab recommendations
    if (activeTab === 'recommendations' && recommendations.length === 0) {
      loadRecommendations();
    }
  }, [activeTab]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const data = await teamAdminAnalysisService.getAdminAnalyticsDashboard();
      setAnalyticsData(data);
      
      // Estrai pattern di errori dagli utenti
      const weakAreas = await learningAnalysisService.getUserWeakAreas();
      setErrorPatterns(weakAreas);
      
    } catch (error) {
      console.error('Errore nel caricamento dei dati di analisi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      // Simula consigli IA basati sui dati
      const defaultRecommendations = [
        "Intensificare la formazione su cybersecurity, dove gli utenti commettono il 42% degli errori",
        "Creare brevi video esplicativi sui concetti di conformità normativa più fraintesi",
        "I quiz sulla gestione dei rischi mostrano problemi di comprensione - considerare una revisione del materiale didattico",
        "Gli utenti trascorrono poco tempo sui documenti fondamentali - migliorare l'engagement con contenuti interattivi",
        "Identificati 15 utenti con difficoltà persistenti nei quiz finanziari - considerare supporto personalizzato",
        "L'analisi dei dati suggerisce che il modulo di cybersecurity è troppo tecnico - semplificare il linguaggio",
        "Creare più esempi pratici per il modulo di gestione dei rischi per migliorare la comprensione"
      ];
      
      // In un ambiente reale, questi dati verrebbero calcolati dall'analisi delle performance
      setRecommendations(defaultRecommendations);
      
    } catch (error) {
      console.error('Errore nel caricamento dei consigli:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewActivityDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setSelectedAlert(null);
    setShowDetails(true);
  };

  const handleViewAlertDetails = (alert: Alert) => {
    setSelectedAlert(alert);
    setSelectedActivity(null);
    setShowDetails(true);
  };

  const handleResolveAlert = (alert: Alert) => {
    console.log('Risolvi alert:', alert);
    // Esempio: alertService.resolveAlert(alert.id, 'user-id');
  };

  const handleAssignAlert = (alert: Alert) => {
    console.log('Assegna alert:', alert);
    // Esempio: alertService.assignAlert(alert.id, 'user-id-assigned', 'user-id-assigning');
  };

  const handleExportData = () => {
    // Funzione per esportare i dati analitici
    console.log('Esportazione dati...');
    alert('Esportazione dei dati in corso. Il file verrà scaricato a breve.');
  };

  // Renderizza il componente
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportData}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            <Download size={16} />
            Esporta Dati
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Ultimo aggiornamento:</span>
            <span className="text-sm">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 overflow-x-auto">
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'overview'
              ? `border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}`
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Panoramica
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'analytics'
              ? `border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}`
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          Analisi Avanzate
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'recommendations'
              ? `border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}`
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('recommendations')}
        >
          Consigli AI
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'activity'
              ? `border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}`
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('activity')}
        >
          Attività Recenti
        </button>
        <button
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'alerts'
              ? `border-b-2 ${isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-500 text-blue-500'}`
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('alerts')}
        >
          Avvisi di Sistema
        </button>
      </div>

      {/* Contenuto basato sul tab attivo */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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

          <DashboardCharts 
            isDarkMode={isDarkMode}
            timeSeriesData={timeSeriesData}
            completionRateData={completionRateData}
            quizErrorsData={quizErrorsData}
            timeSpentData={timeSpentData}
            colors={COLORS}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Preview */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Attività Recenti</h2>
                <button
                  className="text-sm text-blue-500 flex items-center gap-1"
                  onClick={() => setActiveTab('activity')}
                >
                  Vedi tutte <ExternalLink size={14} />
                </button>
              </div>
              <ActivityFeed
                isDarkMode={isDarkMode}
                limit={5}
                showFilters={false}
                showSearch={false}
                height="300px"
                onViewDetails={handleViewActivityDetails}
              />
            </div>

            {/* System Alerts Preview */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Avvisi di Sistema</h2>
                <button
                  className="text-sm text-blue-500 flex items-center gap-1"
                  onClick={() => setActiveTab('alerts')}
                >
                  Vedi tutti <ExternalLink size={14} />
                </button>
              </div>
              <SystemAlerts
                isDarkMode={isDarkMode}
                limit={5}
                showFilters={false}
                showSearch={false}
                height="300px"
                onResolve={handleResolveAlert}
                onAssign={handleAssignAlert}
                onViewDetails={handleViewAlertDetails}
              />
            </div>
          </div>
        </>
      )}

      {/* Tabs per altri contenuti */}
      {activeTab === 'analytics' && (
        <AnalyticsTab 
          isDarkMode={isDarkMode}
          isLoading={isLoading}
          userProgressData={userProgressData}
          difficultQuestions={difficultQuestions}
          onExportData={handleExportData}
        />
      )}

      {activeTab === 'recommendations' && (
        <RecommendationsTab
          isDarkMode={isDarkMode}
          recommendations={recommendations}
          isLoading={isLoading}
        />
      )}

      {activeTab === 'activity' && (
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Attività Recenti</h2>
          <ActivityFeed
            isDarkMode={isDarkMode}
            limit={10}
            showFilters={true}
            showSearch={true}
            height="600px"
            onViewDetails={handleViewActivityDetails}
          />
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Avvisi di Sistema</h2>
          <SystemAlerts
            isDarkMode={isDarkMode}
            limit={10}
            showFilters={true}
            showSearch={true}
            height="600px"
            onResolve={handleResolveAlert}
            onAssign={handleAssignAlert}
            onViewDetails={handleViewAlertDetails}
          />
        </div>
      )}

      {/* Modal dettagli */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-2xl p-6 rounded-xl ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedActivity ? 'Dettagli Attività' : 'Dettagli Avviso'}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <AlertTriangle size={20} />
              </button>
            </div>
            
            {selectedActivity && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className="font-medium">Messaggio:</p>
                  <p>{selectedActivity.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Tipo:</p>
                    <p className="capitalize">{selectedActivity.type}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Importanza:</p>
                    <p className="capitalize">{selectedActivity.importance}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Data:</p>
                    <p>{new Date(selectedActivity.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">ID:</p>
                    <p className="text-sm font-mono">{selectedActivity.id}</p>
                  </div>
                </div>
                {selectedActivity.details && Object.keys(selectedActivity.details).length > 0 && (
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Dettagli:</p>
                    <pre className={`mt-2 p-2 rounded ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    } text-xs overflow-auto`}>
                      {JSON.stringify(selectedActivity.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {selectedAlert && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className="font-medium">Messaggio:</p>
                  <p>{selectedAlert.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Tipo:</p>
                    <p className="capitalize">{selectedAlert.type}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Categoria:</p>
                    <p className="capitalize">{selectedAlert.category}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Priorità:</p>
                    <p className="capitalize">{selectedAlert.priority}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Stato:</p>
                    <p>{selectedAlert.resolved_at ? 'Risolto' : 'Attivo'}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Creato:</p>
                    <p>{new Date(selectedAlert.created_at).toLocaleString()}</p>
                  </div>
                  {selectedAlert.resolved_at && (
                    <div className={`p-4 rounded-lg ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <p className="font-medium">Risolto:</p>
                      <p>{new Date(selectedAlert.resolved_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {selectedAlert.details && Object.keys(selectedAlert.details).length > 0 && (
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">Dettagli:</p>
                    <pre className={`mt-2 p-2 rounded ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    } text-xs overflow-auto`}>
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                {!selectedAlert.resolved_at && (
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleAssignAlert(selectedAlert)}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      Assegna
                    </button>
                    <button
                      onClick={() => {
                        handleResolveAlert(selectedAlert);
                        setShowDetails(false);
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        isDarkMode
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      Risolvi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export * from './types';
export { StatCard, DashboardCharts, AnalyticsTab, RecommendationsTab, ActivityTab, AlertsTab };
export default AdminDashboard;
