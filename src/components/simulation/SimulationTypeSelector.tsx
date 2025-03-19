import React, { useState } from 'react';
import { X, ChevronRight, UserRound, Users, Building, Monitor, Globe } from 'lucide-react';

interface SimulationTypeSelectorProps {
  isDarkMode: boolean;
  onTypeSelect: (type: string) => void;
  onCancel: () => void; // Nuovo handler per il pulsante annulla
}

interface SimulationType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

export function SimulationTypeSelector({ isDarkMode, onTypeSelect, onCancel }: SimulationTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const simulationTypes: SimulationType[] = [
    {
      id: 'single',
      title: 'Simulazione Individuale',
      description: 'Pratica 1-a-1 con un avatar AI in un ambiente controllato.',
      icon: <UserRound size={32} />,
      features: [
        'Feedback personalizzato in tempo reale',
        'Scenari adattivi basati sulle performance',
        'Registrazione delle sessioni per revisione'
      ]
    },
    {
      id: 'group',
      title: 'Simulazione di Gruppo',
      description: 'Simula interazioni con più partecipanti in scenari realistici di team.',
      icon: <Users size={32} />,
      features: [
        'Fino a 5 avatari AI come compagni di team',
        'Dinamiche di gruppo complesse',
        'Ruoli assegnabili per ogni partecipante'
      ]
    },
    {
      id: 'erp',
      title: 'Training ERP',
      description: 'Formazione specifica sull\'utilizzo di sistemi gestionali aziendali.',
      icon: <Building size={32} />,
      features: [
        'Interfaccia simulata dei principali sistemi ERP',
        'Gestione processi aziendali completi',
        'Scenari di errore e problem-solving'
      ]
    },
    {
      id: 'web',
      title: 'Simulazione Web',
      description: 'Ambiente 2D interattivo con avatari controllabili e audio spaziale.',
      icon: <Globe size={32} />,
      features: [
        'Posizionamento spaziale degli avatar',
        'Audio direzionale in tempo reale',
        'Condivisione documenti e strumenti collaborativi'
      ]
    },
    {
      id: 'vr',
      title: 'Simulazione VR',
      description: 'Esperienza immersiva con Unreal Engine per training avanzato.',
      icon: <Monitor size={32} />,
      features: [
        'Ambienti 3D realistici',
        'Interazioni fisiche con oggetti virtuali',
        'Tracking dei movimenti e delle espressioni facciali'
      ]
    }
  ];

  const handleSelect = (type: string) => {
    setSelectedType(type);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onTypeSelect(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-6">
      <div 
        className={`relative w-full max-w-4xl rounded-xl shadow-xl overflow-hidden ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`p-6 flex justify-between items-center border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold">Scegli tipo di simulazione</h2>
          <button 
            onClick={onCancel}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-800' 
                : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simulationTypes.map((type) => (
              <div
                key={type.id}
                className={`border rounded-xl p-5 cursor-pointer transition-all ${
                  selectedType === type.id
                    ? isDarkMode
                      ? 'border-purple-500 bg-purple-900 bg-opacity-20'
                      : 'border-purple-500 bg-purple-50'
                    : isDarkMode
                      ? 'border-gray-800 hover:border-gray-700'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelect(type.id)}
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg mr-4 ${
                    selectedType === type.id
                      ? 'bg-purple-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {type.icon}
                  </div>
                  <h3 className="font-bold text-lg">{type.title}</h3>
                </div>
                
                <p className={`mb-4 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {type.description}
                </p>
                
                <ul className="space-y-2">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <ChevronRight className={`mt-1 ${
                        selectedType === type.id
                          ? 'text-purple-500'
                          : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`} size={14} />
                      <span className={`ml-2 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer con pulsanti */}
        <div className={`p-6 border-t flex justify-between ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <button
            onClick={onCancel}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Annulla
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!selectedType}
            className={`px-6 py-2 rounded-lg transition-colors ${
              selectedType
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continua
          </button>
        </div>
      </div>
    </div>
  );
}
