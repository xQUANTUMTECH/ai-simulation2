import React from 'react';
import { BarChart, Brain, Book, Users, FileText, CheckCircle2, Clock, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

interface TrainingProps {
  isDarkMode: boolean;
}

export function Training({ isDarkMode }: TrainingProps) {
  const trainingMetrics = {
    strengths: [
      { skill: 'Comunicazione con il paziente', score: 92, improvement: '+15%' },
      { skill: 'Gestione delle emergenze', score: 88, improvement: '+10%' },
      { skill: 'Leadership del team', score: 85, improvement: '+8%' }
    ],
    areasToImprove: [
      { skill: 'Procedure specialistiche', score: 65, recommendation: 'Revisione protocolli avanzati' },
      { skill: 'Gestione dello stress', score: 70, recommendation: 'Tecniche di mindfulness' },
      { skill: 'Documentazione clinica', score: 75, recommendation: 'Workshop sulla documentazione' }
    ],
    recentProgress: [
      { date: '2024-03-15', score: 82 },
      { date: '2024-03-10', score: 78 },
      { date: '2024-03-05', score: 75 }
    ],
    suggestedResources: [
      { title: 'Corso Avanzato di Gestione delle Emergenze', type: 'corso', duration: '4h' },
      { title: 'Workshop sulla Comunicazione Efficace', type: 'workshop', duration: '2h' },
      { title: 'Protocolli Clinici Aggiornati', type: 'documento', duration: '1h' }
    ]
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analisi della Formazione</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <BarChart className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-green-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              12%
            </span>
          </div>
          <h3 className="text-2xl font-bold">85%</h3>
          <p className="text-gray-400">Punteggio Medio</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-blue-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              8
            </span>
          </div>
          <h3 className="text-2xl font-bold">24</h3>
          <p className="text-gray-400">Scenari Completati</p>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-purple-500 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              15h
            </span>
          </div>
          <h3 className="text-2xl font-bold">48h</h3>
          <p className="text-gray-400">Ore di Formazione</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-xl font-semibold mb-4">Punti di Forza</h3>
          <div className="space-y-4">
            {trainingMetrics.strengths.map((strength, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{strength.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">{strength.score}%</span>
                    <span className="text-xs text-green-400">{strength.improvement}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Areas to Improve */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-xl font-semibold mb-4">Aree di Miglioramento</h3>
          <div className="space-y-4">
            {trainingMetrics.areasToImprove.map((area, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{area.skill}</span>
                  <span className="text-yellow-500">{area.score}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${area.score}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">{area.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Chart */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <h3 className="text-xl font-semibold mb-6">Progresso Recente</h3>
          <div className="h-48">
            <div className="h-40 flex items-end justify-between gap-2">
              {trainingMetrics.recentProgress.map((progress, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-purple-500 rounded-t-lg transition-all duration-500"
                    style={{ height: `${progress.score}%` }}
                  />
                  <span className="text-sm text-gray-400">
                    {new Date(progress.date).toLocaleDateString('it-IT', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold">Suggerimenti AI</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              {trainingMetrics.suggestedResources.map((resource, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-700">
                  {resource.type === 'corso' ? (
                    <Book className="text-blue-500" />
                  ) : resource.type === 'workshop' ? (
                    <Users className="text-green-500" />
                  ) : (
                    <FileText className="text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{resource.title}</p>
                    <p className="text-xs text-gray-400">Durata: {resource.duration}</p>
                  </div>
                  <CheckCircle2 className="text-gray-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}