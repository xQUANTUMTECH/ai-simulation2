import React, { useState } from 'react';
import { ArrowLeft, Plus, FileText, Book, Video, Clock, Users, Trash2, Upload, Save } from 'lucide-react';

interface CourseCreationProps {
  isDarkMode: boolean;
  onBack: () => void;
}

interface Module {
  id: string;
  title: string;
  description: string;
  items: Array<{
    id: string;
    type: 'video' | 'quiz' | 'document';
    title: string;
    duration?: string;
    file?: File;
  }>;
}

export function CourseCreation({ isDarkMode, onBack }: CourseCreationProps) {
  const [activeStep, setActiveStep] = useState<'basic' | 'content' | 'settings'>('basic');
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: 'business',
    level: 'intermediate',
    objectives: [''],
    prerequisites: [''],
    targetAudience: [''],
    duration: '',
    maxParticipants: 20
  });

  const [modules, setModules] = useState<Module[]>([
    {
      id: '1',
      title: '',
      description: '',
      items: []
    }
  ]);

  const handleAddModule = () => {
    setModules(prev => [...prev, {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      items: []
    }]);
  };

  const handleAddModuleItem = (moduleId: string, type: 'video' | 'quiz' | 'document') => {
    setModules(prev => prev.map(module => {
      if (module.id === moduleId) {
        return {
          ...module,
          items: [...module.items, {
            id: crypto.randomUUID(),
            type,
            title: ''
          }]
        };
      }
      return module;
    }));
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const handleRemoveModuleItem = (moduleId: string, itemId: string) => {
    setModules(prev => prev.map(module => {
      if (module.id === moduleId) {
        return {
          ...module,
          items: module.items.filter(item => item.id !== itemId)
        };
      }
      return module;
    }));
  };

  const handleSubmit = async () => {
    // TODO: Implement course creation logic
    console.log('Course data:', { ...courseData, modules });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">Crea Nuovo Corso</h2>
        </div>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Save size={20} />
          Salva Corso
        </button>
      </div>

      {/* Steps */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'basic', label: 'Informazioni Base' },
          { id: 'content', label: 'Contenuti' },
          { id: 'settings', label: 'Impostazioni' }
        ].map((step) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(step.id as any)}
            className={`flex-1 p-3 rounded-lg transition-colors ${
              activeStep === step.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {activeStep === 'basic' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Titolo del Corso
            </label>
            <input
              type="text"
              value={courseData.title}
              onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Es: Gestione Efficace dei Team Aziendali"
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descrizione
            </label>
            <textarea
              value={courseData.description}
              onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrivi il corso e i suoi obiettivi principali..."
              className="w-full h-32 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Categoria
              </label>
              <select
                value={courseData.category}
                onChange={(e) => setCourseData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600"
              >
                <option value="business">Business & Management</option>
                <option value="leadership">Leadership</option>
                <option value="communication">Comunicazione</option>
                <option value="project">Project Management</option>
                <option value="hr">Risorse Umane</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Livello
              </label>
              <select
                value={courseData.level}
                onChange={(e) => setCourseData(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600"
              >
                <option value="beginner">Base</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzato</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Obiettivi del Corso
            </label>
            {courseData.objectives.map((objective, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => {
                    const newObjectives = [...courseData.objectives];
                    newObjectives[index] = e.target.value;
                    setCourseData(prev => ({ ...prev, objectives: newObjectives }));
                  }}
                  placeholder="Aggiungi un obiettivo..."
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    const newObjectives = courseData.objectives.filter((_, i) => i !== index);
                    setCourseData(prev => ({ ...prev, objectives: newObjectives }));
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setCourseData(prev => ({ 
                ...prev, 
                objectives: [...prev.objectives, '']
              }))}
              className="flex items-center gap-2 px-4 py-2 text-purple-500 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Aggiungi Obiettivo
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeStep === 'content' && (
        <div className="space-y-6">
          {modules.map((module, moduleIndex) => (
            <div 
              key={module.id}
              className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={module.title}
                  onChange={(e) => setModules(prev => prev.map(m => 
                    m.id === module.id ? { ...m, title: e.target.value } : m
                  ))}
                  placeholder={`Modulo ${moduleIndex + 1}`}
                  className="text-lg font-medium bg-transparent border-none focus:outline-none"
                />
                <button
                  onClick={() => handleRemoveModule(module.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <textarea
                value={module.description}
                onChange={(e) => setModules(prev => prev.map(m =>
                  m.id === module.id ? { ...m, description: e.target.value } : m
                ))}
                placeholder="Descrizione del modulo..."
                className="w-full h-24 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 mb-4"
              />

              <div className="space-y-4">
                {module.items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      {item.type === 'video' && <Video size={20} className="text-purple-500" />}
                      {item.type === 'quiz' && <Book size={20} className="text-purple-500" />}
                      {item.type === 'document' && <FileText size={20} className="text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => setModules(prev => prev.map(m =>
                          m.id === module.id ? {
                            ...m,
                            items: m.items.map(i =>
                              i.id === item.id ? { ...i, title: e.target.value } : i
                            )
                          } : m
                        ))}
                        placeholder={`Titolo ${item.type === 'video' ? 'video' : item.type === 'quiz' ? 'quiz' : 'documento'}`}
                        className="w-full bg-transparent border-none focus:outline-none"
                      />
                    </div>
                    {item.type === 'video' && (
                      <input
                        type="text"
                        value={item.duration}
                        onChange={(e) => setModules(prev => prev.map(m =>
                          m.id === module.id ? {
                            ...m,
                            items: m.items.map(i =>
                              i.id === item.id ? { ...i, duration: e.target.value } : i
                            )
                          } : m
                        ))}
                        placeholder="Durata (es: 10:00)"
                        className="w-24 px-3 py-1 bg-gray-600 rounded-lg text-sm"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveModuleItem(module.id, item.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAddModuleItem(module.id, 'video')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Video size={16} />
                  Video
                </button>
                <button
                  onClick={() => handleAddModuleItem(module.id, 'quiz')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Book size={16} />
                  Quiz
                </button>
                <button
                  onClick={() => handleAddModuleItem(module.id, 'document')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <FileText size={16} />
                  Documento
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddModule}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus size={20} />
            Aggiungi Modulo
          </button>
        </div>
      )}

      {/* Settings */}
      {activeStep === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Durata Stimata
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={courseData.duration}
                  onChange={(e) => setCourseData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="Es: 8 ore"
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                />
                <Clock size={20} className="text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Numero Massimo Partecipanti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={courseData.maxParticipants}
                  onChange={(e) => setCourseData(prev => ({ 
                    ...prev, 
                    maxParticipants: parseInt(e.target.value) 
                  }))}
                  min="1"
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                />
                <Users size={20} className="text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Prerequisiti
            </label>
            {courseData.prerequisites.map((prerequisite, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={prerequisite}
                  onChange={(e) => {
                    const newPrerequisites = [...courseData.prerequisites];
                    newPrerequisites[index] = e.target.value;
                    setCourseData(prev => ({ ...prev, prerequisites: newPrerequisites }));
                  }}
                  placeholder="Aggiungi un prerequisito..."
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    const newPrerequisites = courseData.prerequisites.filter((_, i) => i !== index);
                    setCourseData(prev => ({ ...prev, prerequisites: newPrerequisites }));
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setCourseData(prev => ({ 
                ...prev, 
                prerequisites: [...prev.prerequisites, '']
              }))}
              className="flex items-center gap-2 px-4 py-2 text-purple-500 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Aggiungi Prerequisito
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Target di Riferimento
            </label>
            {courseData.targetAudience.map((target, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={target}
                  onChange={(e) => {
                    const newTargets = [...courseData.targetAudience];
                    newTargets[index] = e.target.value;
                    setCourseData(prev => ({ ...prev, targetAudience: newTargets }));
                  }}
                  placeholder="Es: Manager di medio livello"
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    const newTargets = courseData.targetAudience.filter((_, i) => i !== index);
                    setCourseData(prev => ({ ...prev, targetAudience: newTargets }));
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setCourseData(prev => ({ 
                ...prev, 
                targetAudience: [...prev.targetAudience, '']
              }))}
              className="flex items-center gap-2 px-4 py-2 text-purple-500 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Aggiungi Target
            </button>
          </div>
        </div>
      )}
    </div>
  );
}