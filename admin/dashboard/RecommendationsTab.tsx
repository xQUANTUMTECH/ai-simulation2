import React from 'react';
import { Lightbulb, BookOpen, User, Clock, Video, FileText } from 'lucide-react';
import { RecommendationsTabProps } from './types';

/**
 * Componente tab per i consigli generati dall'IA
 */
export function RecommendationsTab({ 
  isDarkMode, 
  recommendations, 
  isLoading 
}: RecommendationsTabProps) {

  // Funzione per ottenere l'icona appropriata per ogni raccomandazione
  const getIconForRecommendation = (text: string) => {
    if (text.toLowerCase().includes('cybersecurity') || text.toLowerCase().includes('sicurezza')) {
      return <FileText className="text-red-500" />;
    } else if (text.toLowerCase().includes('video')) {
      return <Video className="text-blue-500" />;
    } else if (text.toLowerCase().includes('utenti') || text.toLowerCase().includes('personalizzato')) {
      return <User className="text-green-500" />;
    } else if (text.toLowerCase().includes('tempo')) {
      return <Clock className="text-yellow-500" />;
    } else {
      return <BookOpen className="text-purple-500" />;
    }
  };

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center mb-6">
        <Lightbulb className="text-yellow-400 mr-3" size={24} />
        <h2 className="text-xl font-semibold">Consigli AI</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <div className={`p-4 rounded-lg mb-4 ${
              isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                Questi consigli sono stati generati automaticamente analizzando i pattern di errore, 
                le difficoltà e il comportamento degli utenti sulla piattaforma. L'analisi viene aggiornata 
                quotidianamente basandosi sui dati più recenti.
              </p>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4">Azioni Raccomandate</h3>
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg flex items-start ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100'
                } transition-colors duration-150`}
              >
                <div className="mr-3 mt-1">
                  {getIconForRecommendation(recommendation)}
                </div>
                <div>
                  <p>{recommendation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Impatto Atteso</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    isDarkMode ? 'bg-green-400' : 'bg-green-500'
                  }`}></div>
                  <h4 className="font-medium">Riduzione Errori</h4>
                </div>
                <p className="text-sm">Potenziale riduzione del 15-20% negli errori relativi alla comprensione delle normative</p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                  }`}></div>
                  <h4 className="font-medium">Engagement</h4>
                </div>
                <p className="text-sm">Aumento previsto del 25% nel tempo di fruizione dei materiali formativi</p>
              </div>
              
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
              }`}>
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    isDarkMode ? 'bg-purple-400' : 'bg-purple-500'
                  }`}></div>
                  <h4 className="font-medium">Completamento</h4>
                </div>
                <p className="text-sm">Incremento potenziale del 18% nel tasso di completamento dei corsi critici</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              className={`px-4 py-2 rounded-lg font-medium ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
              }`}
            >
              Implementa i consigli
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default RecommendationsTab;
