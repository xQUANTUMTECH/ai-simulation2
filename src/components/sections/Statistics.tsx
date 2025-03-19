import React from 'react';
import { BarChart, Brain, Book, Users, FileText, CheckCircle2, Clock, Calendar, ArrowUp } from 'lucide-react';

interface StatisticsProps {
  isDarkMode: boolean;
}

export function Statistics({ isDarkMode }: StatisticsProps) {
  const metrics = {
    strengths: [
      { skill: 'Comunicazione con il paziente', score: 92, improvement: '+15%' },
      { skill: 'Gestione delle emergenze', score: 88, improvement: '+10%' },
      { skill: 'Leadership del team', score: 85, improvement: '+8%' },
      { skill: 'Processo decisionale', score: 87, improvement: '+12%' },
      { skill: 'Lavoro di squadra', score: 90, improvement: '+9%' }
    ],
    areasToImprove: [
      { skill: 'Procedure specialistiche', score: 65, recommendation: 'Revisione protocolli avanzati' },
      { skill: 'Gestione dello stress', score: 70, recommendation: 'Tecniche di mindfulness' },
      { skill: 'Documentazione clinica', score: 75, recommendation: 'Workshop sulla documentazione' },
      { skill: 'Comunicazione critica', score: 72, recommendation: 'Simulazioni avanzate' }
    ],
    detailedAnalysis: {
      cognitive: {
        problemSolving: 88,
        criticalThinking: 85,
        decisionMaking: 82
      },
      technical: {
        procedureAccuracy: 90,
        toolUsage: 87,
        documentation: 78
      },
      behavioral: {
        teamwork: 92,
        communication: 89,
        leadership: 84
      }
    },
    aiRecommendations: [
      {
        type: 'improvement',
        title: 'Miglioramento Comunicazione Critica',
        description: 'Basato sull\'analisi delle performance, si suggerisce di focalizzarsi su scenari di comunicazione in situazioni ad alta pressione.',
        actions: ['Partecipare a simulazioni avanzate', 'Workshop di comunicazione critica', 'Mentoring personalizzato']
      },
      {
        type: 'strength',
        title: 'Consolidamento Leadership',
        description: 'Le capacità di leadership mostrano un trend positivo. Continuare con scenari di team management.',
        actions: ['Guidare sessioni di debriefing', 'Mentoring di nuovi membri', 'Scenari di gestione crisi']
      }
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
      <h2 className="text-2xl font-bold">Statistiche</h2>

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

      {/* Detailed Analysis */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h3 className="text-xl font-semibold mb-6">Analisi Dettagliata</h3>
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(metrics.detailedAnalysis).map(([category, skills]) => (
            <div key={category} className="space-y-4">
              <h4 className="font-medium capitalize">{category}</h4>
              {Object.entries(skills).map(([skill, score]) => (
                <div key={skill} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-sm">{score}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold">Raccomandazioni IA</h3>
        </div>
        <div className="space-y-6">
          {metrics.aiRecommendations.map((rec, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {rec.type === 'improvement' ? (
                  <ArrowUp className="text-green-500" size={20} />
                ) : (
                  <CheckCircle2 className="text-blue-500" size={20} />
                )}
                <h4 className="font-medium">{rec.title}</h4>
              </div>
              <p className="text-sm text-gray-300 mb-4">{rec.description}</p>
              <div className="space-y-2">
                {rec.actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}