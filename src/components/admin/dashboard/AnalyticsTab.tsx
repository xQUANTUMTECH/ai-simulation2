import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Download } from 'lucide-react';
import { AnalyticsTabProps, DifficultQuestion } from './types';

/**
 * Componente tab per visualizzare analisi avanzate
 */
export function AnalyticsTab({ 
  isDarkMode, 
  isLoading, 
  userProgressData, 
  difficultQuestions,
  onExportData 
}: AnalyticsTabProps) {
  // Stili per tema chiaro/scuro
  const tooltipStyle = { 
    backgroundColor: isDarkMode ? "#333" : "#fff",
    borderColor: isDarkMode ? "#555" : "#ddd",
    color: isDarkMode ? "#fff" : "#333"
  };
  const gridColor = isDarkMode ? "#444" : "#eee";
  const axisColor = isDarkMode ? "#aaa" : "#666";

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Analisi Avanzate</h2>
        {isLoading ? (
          <div className={`animate-pulse px-4 py-2 rounded ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            Caricamento dati...
          </div>
        ) : (
          <button
            onClick={onExportData}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            <Download size={16} />
            Esporta Report
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Progresso Utenti */}
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <h3 className="text-lg font-medium mb-4">Progresso Utenti (Ultimo Mese)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={userProgressData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={axisColor} />
                    <YAxis stroke={axisColor} />
                    <Tooltip 
                      contentStyle={tooltipStyle} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="nuovi" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Nuovi Iscritti"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="attivi" 
                      stackId="2"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Utenti Attivi"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completati" 
                      stackId="3"
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      name="Corsi Completati"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Domande Difficili */}
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <h3 className="text-lg font-medium mb-4">Domande con Maggiori Difficoltà</h3>
              <div className="overflow-x-auto">
                <table className={`min-w-full ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  <thead className={`${
                    isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                  }`}>
                    <tr>
                      <th className="px-4 py-2 text-left">Domanda</th>
                      <th className="px-4 py-2 text-left">Categoria</th>
                      <th className="px-4 py-2 text-right">Tasso Successo</th>
                      <th className="px-4 py-2 text-right">Frequenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    {difficultQuestions.map(question => (
                      <tr key={question.id} className={`${
                        isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 text-left">{question.text}</td>
                        <td className="px-4 py-3 text-left">{question.categoria}</td>
                        <td className="px-4 py-3 text-right">{question.tassoSuccesso}%</td>
                        <td className="px-4 py-3 text-right">{question.frequenza}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sezione di analisi e insight AI */}
          <div className={`p-4 rounded-lg mb-6 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <span className="mr-2">Insight generati dall'IA</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}>
                AI
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className="font-medium mb-2">Modelli di apprendimento</h4>
                <p className="text-sm">
                  L'analisi dei dati mostra che il 68% degli utenti completa i corsi 
                  più rapidamente quando preceduti da video introduttivi e seguiti da 
                  quiz di autovalutazione con feedback immediato.
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className="font-medium mb-2">Punti di difficoltà comuni</h4>
                <p className="text-sm">
                  Gli argomenti di Cybersecurity e Conformità Normativa presentano 
                  i tassi di errore più elevati, con concetti fraintesi ricorrenti 
                  relativi all'implementazione pratica delle norme GDPR.
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className="font-medium mb-2">Comportamento degli utenti</h4>
                <p className="text-sm">
                  Il tempo medio di completamento dei corsi è diminuito del 15% 
                  nell'ultimo trimestre, ma è aumentato del 28% il numero di accessi 
                  ripetuti ai contenuti anche dopo il completamento.
                </p>
              </div>
              
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className="font-medium mb-2">Predizione di tendenze</h4>
                <p className="text-sm">
                  Basandosi sui pattern attuali, si prevede un aumento del 22% 
                  nell'utilizzo di contenuti relativi alla sicurezza informatica 
                  e una crescente richiesta di materiali su leadership e gestione del team.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsTab;
