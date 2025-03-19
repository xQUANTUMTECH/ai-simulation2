import React, { useState } from 'react';
import { UnrealViewer } from './UnrealViewer';
import { SimulationTools } from './SimulationTools';
import { X, ChevronLeft, ChevronRight, PanelRightClose } from 'lucide-react';

interface VirtualRoomProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: {
    id: string;
    title: string;
  };
  isDarkMode: boolean;
}

export function VirtualRoom({ isOpen, onClose, scenario, isDarkMode }: VirtualRoomProps) {
  const [isSimulationReady, setIsSimulationReady] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);

  const handleSimulationLoad = () => {
    setIsSimulationReady(true);
    // Automatically open tools panel when simulation is ready
    setTimeout(() => setIsToolsPanelOpen(true), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex">
      {/* Main Simulation View */}
      <div className={`relative transition-all duration-300 ease-in-out ${
        isToolsPanelOpen ? 'flex-1' : 'w-full'
      }`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black to-transparent">
          <h1 className="text-xl font-semibold text-white">{scenario.title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsToolsPanelOpen(!isToolsPanelOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={isToolsPanelOpen ? "Nascondi pannello" : "Mostra pannello"}
            >
              <PanelRightClose className={`w-6 h-6 text-white transform transition-transform duration-300 ${
                !isToolsPanelOpen ? 'rotate-180' : ''
              }`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
        
        {/* Unreal Viewer */}
        <div className="h-full">
          <UnrealViewer
            streamUrl={`ws://localhost:8888/scenario/${scenario.id}`}
            isDarkMode={isDarkMode}
            onLoad={handleSimulationLoad}
            onError={(error) => console.error('Errore simulazione:', error)}
          />
        </div>
      </div>

      {/* Tools Panel */}
      <div
        className={`bg-gray-900 border-l border-gray-800 transition-all duration-300 ease-in-out ${
          isToolsPanelOpen ? 'w-96' : 'w-0 overflow-hidden'
        }`}
      >
        {isSimulationReady && isToolsPanelOpen && (
          <SimulationTools
            scenarioId={scenario.id}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}