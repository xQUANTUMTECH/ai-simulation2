import React, { useState } from 'react';
import { UnrealViewer } from './UnrealViewer';
import { WebRoom } from './WebRoom';
import { Monitor, Globe, Users, MessageSquare, ArrowRight } from 'lucide-react';

interface RoomSelectorProps {
  scenarioId: string;
  isDarkMode: boolean;
  onClose: () => void;
}

export function RoomSelector({ scenarioId, isDarkMode, onClose }: RoomSelectorProps) {
  const [roomType, setRoomType] = useState<'unreal' | 'web' | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'ai' | 'user' }>>([
    { text: 'Ciao! Sono qui per aiutarti a configurare la simulazione. Vuoi che ti guidi attraverso il processo?', sender: 'ai' }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [participants] = useState([
    { 
      id: '1', 
      name: 'Dr. Rossi', 
      isAI: false, 
      role: 'Chirurgo',
      state: {
        speaking: true,
        emotion: 'neutral',
        activity: 'Discussione',
        position: { x: 0, y: 0, rotation: 0 }
      }
    },
    { 
      id: '2', 
      name: 'AI Assistant', 
      isAI: true, 
      role: 'Assistente AI',
      state: {
        speaking: false,
        emotion: 'happy',
        activity: 'Supporto',
        position: { x: 0, y: 0, rotation: 0 }
      }
    },
    { 
      id: '3', 
      name: 'Dr. Bianchi', 
      isAI: false, 
      role: 'Anestesista',
      state: {
        speaking: false,
        emotion: 'neutral',
        activity: 'Monitoraggio',
        position: { x: 0, y: 0, rotation: 0 }
      }
    }
  ]);

  const handleSkip = () => {
    setShowChat(false);
  };

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setMessages(prev => [...prev, { text: currentMessage, sender: 'user' }]);
      setCurrentMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: 'Perfetto! Ora puoi scegliere il tipo di stanza che preferisci.',
          sender: 'ai'
        }]);
        setShowChat(false);
      }, 1000);
    }
  };

  if (roomType === 'unreal') {
    return (
      <UnrealViewer
        streamUrl={`ws://localhost:8888/scenario/${scenarioId}`}
        isDarkMode={isDarkMode}
        onError={(error) => console.error('Errore simulazione:', error)}
      />
    );
  }

  if (roomType === 'web') {
    return (
      <WebRoom
        roomId={scenarioId}
        participants={participants}
        isDarkMode={isDarkMode}
        onLeave={() => setRoomType(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-6">
      {showChat ? (
        <div className={`w-full max-w-2xl p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Configurazione Simulazione</h2>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Salta
            </button>
          </div>

          <div className="h-96 overflow-y-auto mb-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-purple-500'
                    : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Scrivi un messaggio..."
              className={`flex-1 px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 focus:bg-gray-600' 
                  : 'bg-gray-100 focus:bg-gray-50'
              } outline-none transition-colors`}
            />
            <button
              onClick={handleSendMessage}
              className="p-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className={`w-full max-w-4xl rounded-2xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
          <div className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold mb-6">Seleziona Tipo di Stanza</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setRoomType('unreal')}
                className={`p-6 rounded-xl transition-colors flex flex-col items-center gap-4 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Monitor size={48} className="text-purple-500" />
                <div className="text-center">
                  <h3 className="font-medium mb-2">Unreal Engine</h3>
                  <p className="text-sm text-gray-400">Esperienza 3D completa</p>
                </div>
              </button>
              <button
                onClick={() => setRoomType('web')}
                className={`p-6 rounded-xl transition-colors flex flex-col items-center gap-4 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Globe size={48} className="text-blue-500" />
                <div className="text-center">
                  <h3 className="font-medium mb-2">Web Room</h3>
                  <p className="text-sm text-gray-400">Accesso veloce via browser</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
