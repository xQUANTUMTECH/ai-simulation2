import React, { useState } from 'react';
import { Play, Book, FileText, CheckCircle, Clock, Users, ChevronRight, ArrowLeft, X } from 'lucide-react';

interface CourseDetailsProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export function CourseDetails({ isDarkMode, onBack }: CourseDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'resources' | 'progress' | 'quiz'>('overview');

  const [showCloseButton, setShowCloseButton] = useState(true);

  const course = {
    title: 'Gestione Emergenze Mediche',
    description: 'Corso completo sulla gestione delle emergenze in ambito ospedaliero',
    instructor: 'Dr. Marco Rossi',
    duration: '8 ore',
    videos: 12,
    documents: 5,
    progress: 60,
    objectives: [
      'Comprendere i protocolli di emergenza',
      'Sviluppare capacità decisionali rapide',
      'Gestire efficacemente il team in situazioni critiche',
      'Applicare le procedure standard di sicurezza'
    ],
    modules: [
      {
        title: 'Introduzione alle Emergenze',
        duration: '1h 30m',
        completed: true,
        items: [
          { type: 'video', title: 'Overview dei Protocolli', duration: '15:00', completed: true },
          { type: 'quiz', title: 'Verifica Iniziale', duration: '10:00', completed: true },
          { type: 'doc', title: 'Manuale Procedure', duration: '30:00', completed: true }
        ]
      },
      {
        title: 'Gestione Trauma',
        duration: '2h 45m',
        completed: false,
        items: [
          { type: 'video', title: 'Valutazione Primaria', duration: '20:00', completed: true },
          { type: 'simulation', title: 'Scenario Trauma', duration: '45:00', completed: false },
          { type: 'quiz', title: 'Verifica Competenze', duration: '15:00', completed: false }
        ]
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">{course.title}</h2>
          <p className="text-gray-400">{course.instructor}</p>
        </div>
        {showCloseButton && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-700 rounded-full h-2">
        <div 
          className="bg-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${course.progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-2 text-purple-500 mb-2">
            <Clock size={20} />
            <span className="font-medium">Durata</span>
          </div>
          <span className="text-2xl font-bold">{course.duration}</span>
        </div>
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Play size={20} />
            <span className="font-medium">Video</span>
          </div>
          <span className="text-2xl font-bold">{course.videos}</span>
        </div>
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <FileText size={20} />
            <span className="font-medium">Documenti</span>
          </div>
          <span className="text-2xl font-bold">{course.documents}</span>
        </div>
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-2 text-yellow-500 mb-2">
            <Users size={20} />
            <span className="font-medium">Studenti</span>
          </div>
          <span className="text-2xl font-bold">24</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'overview' 
              ? 'border-b-2 border-purple-500 text-purple-500' 
              : 'text-gray-400'
          }`}
        >
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'content'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400'
          }`}
        >
          Contenuti
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'resources'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400'
          }`}
        >
          Risorse
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'progress'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400'
          }`}
        >
          Progressi
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">{course.title}</h2>
        </div>
        <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            <div>
              <h3 className="text-lg font-medium mb-4">Descrizione</h3>
              <p className="text-gray-400">{course.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Obiettivi del Corso</h3>
              <div className="space-y-3">
                {course.objectives.map((objective, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <CheckCircle size={14} className="text-purple-500" />
                    </div>
                    <span>{objective}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            {course.modules.map((module, index) => (
              <div 
                key={index}
                className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{module.title}</h3>
                    <p className="text-sm text-gray-400">{module.duration}</p>
                  </div>
                  {module.completed ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle size={16} />
                      <span className="text-sm">Completato</span>
                    </div>
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </div>

                <div className="space-y-2">
                  {module.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex}
                      className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.type === 'quiz') {
                          setActiveTab('quiz');
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === 'video' && <Play size={16} />}
                        {item.type === 'doc' && <FileText size={16} />}
                        {item.type === 'quiz' && <Book size={16} />}
                        <span>{item.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">{item.duration}</span>
                        {item.completed && (
                          <CheckCircle size={16} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {activeTab === 'quiz' && (
        <Quiz
          isDarkMode={isDarkMode}
          onBack={() => setActiveTab('content')}
          onComplete={(score) => {
            console.log('Quiz completed with score:', score);
            setActiveTab('content');
          }}
        />
      )}
    </div>
  );
}