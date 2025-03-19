import React, { useState, useEffect, useRef } from 'react';
import { UnrealViewer } from './UnrealViewer';
import { FileText, Users, Brain, MessageSquare, BarChart, Clock, CheckSquare, AlertTriangle, PenTool, Save, Send } from 'lucide-react';
import { useUnrealIntegration } from '../hooks/useUnrealIntegration';
import { aiAgentService } from '../services/ai-agent-service';
import { ttsService } from '../services/tts-service';

interface SimulationInterfaceProps {
  scenarioId: string;
  isDarkMode: boolean;
  onClose: () => void;
}

interface Note {
  id: string;
  text: string;
  timestamp: string;
  type: 'observation' | 'feedback' | 'action';
}

interface SimulationMetric {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'avatar';
  avatarId?: string;
  text: string;
  timestamp: string;
}

export function SimulationInterface({ scenarioId, isDarkMode, onClose }: SimulationInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'avatars' | 'metrics' | 'chat'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteType, setCurrentNoteType] = useState<Note['type']>('observation');
  const { sendActionToUnreal } = useUnrealIntegration(scenarioId);

  // Dati simulazione
  const [metrics] = useState<SimulationMetric[]>([
    { name: 'Accuratezza Comunicazione', value: 85, target: 90, trend: 'up' },
    { name: 'Tempo Decisionale', value: 75, target: 80, trend: 'stable' },
    { name: 'Collaborazione Team', value: 92, target: 85, trend: 'up' },
    { name: 'Gestione Stress', value: 78, target: 85, trend: 'down' }
  ]);

  const [activeAvatars] = useState([
    { id: '1', name: 'Dr. Rossi', role: 'Chirurgo', status: 'active', confidence: 0.92 },
    { id: '2', name: 'Dr. Bianchi', role: 'Anestesista', status: 'active', confidence: 0.88 },
    { id: '3', name: 'Inf. Verdi', role: 'Infermiere', status: 'active', confidence: 0.95 }
  ]);
  
  // Stato per la chat con avatar AI
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Effetto per scrollare automaticamente in basso quando arrivano nuovi messaggi
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Carica lo scenario e inizializza il contesto della conversazione
  useEffect(() => {
    const loadScenario = async () => {
      try {
        console.log(`Caricamento scenario ${scenarioId}...`);
        // In una implementazione completa, qui caricheresti lo scenario dal DB
        
        // Imposta l'avatar selezionato di default (il primo disponibile)
        if (activeAvatars.length > 0 && !selectedAvatarId) {
          setSelectedAvatarId(activeAvatars[0].id);
          
          // Aggiungi un messaggio di benvenuto
          setChatMessages([
            {
              id: 'welcome',
              sender: 'avatar',
              avatarId: activeAvatars[0].id,
              text: 'Benvenuto nella simulazione. Seleziona un avatar per iniziare la conversazione.',
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
        }
      } catch (err) {
        console.error('Errore nel caricamento dello scenario:', err);
      }
    };
    
    loadScenario();
  }, [scenarioId, activeAvatars, selectedAvatarId]);
  
  // Metodo per inviare un messaggio e ricevere risposta dall'avatar AI
  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedAvatarId) return;
    
    // Trova l'avatar selezionato
    const selectedAvatar = activeAvatars.find(a => a.id === selectedAvatarId);
    if (!selectedAvatar) return;
    
    // Aggiungi il messaggio dell'utente alla chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessingResponse(true);
    
    try {
      // Crea contesto per la richiesta all'aiAgentService
      const context = {
        agentRole: selectedAvatar.role,
        conversationHistory: chatMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        scenario: {
          title: 'Simulazione interattiva',
          objectives: ['Fornire informazioni accurate', 'Mantenere un tono professionale']
        }
      };
      
      // Chiama aiAgentService per generare la risposta
      const response = await aiAgentService.getResponse(
        selectedAvatarId,
        currentMessage,
        context
      );
      
      // Se disponibile il testo, generalo con il TTS
      if (response && response.text) {
        // Aggiungi la risposta alla chat
        const avatarMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: 'avatar',
          avatarId: selectedAvatarId,
          text: response.text,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setChatMessages(prev => [...prev, avatarMessage]);
        
        // Genera audio con TTS
        console.log("Generando audio TTS per la risposta...");
        try {
          // Utilizza il servizio TTS per sintetizzare la risposta
          const audioBuffer = await ttsService.synthesize(response.text, {
            language: 'it',
            voice: 'alloy'
          });
          
          // In un'implementazione reale, qui ci sarebbe il codice per riprodurre l'audio
          console.log("Audio TTS generato con successo");
        } catch (ttsError) {
          console.error("Errore nella generazione audio TTS:", ttsError);
        }
      } else {
        throw new Error("Risposta dell'agente non valida");
      }
    } catch (err) {
      console.error('Errore nella comunicazione con l\'agente AI:', err);
      
      // Aggiungi un messaggio di errore alla chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'avatar',
        avatarId: selectedAvatarId,
        text: "Mi dispiace, si è verificato un errore nella comunicazione. Riprova più tardi.",
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingResponse(false);
    }
  };
  
  // Metodo per selezionare un avatar per la chat e iniziare una nuova conversazione
  const selectAvatar = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    
    // Trova l'avatar selezionato
    const selectedAvatar = activeAvatars.find(a => a.id === avatarId);
    if (!selectedAvatar) return;
    
    // Aggiunge un messaggio di benvenuto personalizzato dall'avatar
    setChatMessages([
      {
        id: 'welcome-' + avatarId,
        sender: 'avatar',
        avatarId: avatarId,
        text: `Salve, sono ${selectedAvatar.name}, ${selectedAvatar.role}. Come posso aiutarti oggi?`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const addNote = () => {
    if (currentNote.trim()) {
      setNotes(prev => [...prev, {
        id: Date.now().toString(),
        text: currentNote,
        timestamp: new Date().toLocaleTimeString(),
        type: currentNoteType
      }]);
      setCurrentNote('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex">
      {/* Main Simulation View */}
      <div className="flex-1 p-4">
        <div className="h-full rounded-lg overflow-hidden">
          <UnrealViewer
            streamUrl="ws://localhost:8888"
            isDarkMode={isDarkMode}
            onError={(error) => console.error('Errore simulazione:', error)}
          />
        </div>
      </div>

      {/* Tools Panel */}
      <div className={`w-96 border-l ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'notes' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-400'
            }`}
          >
            <PenTool size={20} />
            Note
          </button>
          <button
            onClick={() => setActiveTab('avatars')}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'avatars' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-400'
            }`}
          >
            <Users size={20} />
            Avatar
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'metrics' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-400'
            }`}
          >
            <BarChart size={20} />
            Metriche
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 ${
              activeTab === 'chat' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-400'
            }`}
          >
            <MessageSquare size={20} />
            Chat
          </button>
        </div>

        {/* Content */}
        <div className="p-4 h-[calc(100vh-57px)] overflow-y-auto">
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Note Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentNoteType('observation')}
                    className={`flex-1 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                      currentNoteType === 'observation'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700'
                    }`}
                  >
                    <FileText size={16} />
                    Osservazione
                  </button>
                  <button
                    onClick={() => setCurrentNoteType('feedback')}
                    className={`flex-1 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                      currentNoteType === 'feedback'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700'
                    }`}
                  >
                    <CheckSquare size={16} />
                    Feedback
                  </button>
                  <button
                    onClick={() => setCurrentNoteType('action')}
                    className={`flex-1 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                      currentNoteType === 'action'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-700'
                    }`}
                  >
                    <AlertTriangle size={16} />
                    Azione
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    placeholder="Aggiungi una nota..."
                    className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                  />
                  <button
                    onClick={addNote}
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    <Save size={20} />
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg ${
                      note.type === 'observation' ? 'bg-blue-500 bg-opacity-10' :
                      note.type === 'feedback' ? 'bg-green-500 bg-opacity-10' :
                      'bg-yellow-500 bg-opacity-10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${
                        note.type === 'observation' ? 'text-blue-400' :
                        note.type === 'feedback' ? 'text-green-400' :
                        'text-yellow-400'
                      }`}>
                        {note.type === 'observation' ? 'Osservazione' :
                         note.type === 'feedback' ? 'Feedback' : 'Azione'}
                      </span>
                      <span className="text-sm text-gray-400">{note.timestamp}</span>
                    </div>
                    <p className="text-sm">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'avatars' && (
            <div className="space-y-4">
              {activeAvatars.map((avatar) => (
                <div 
                  key={avatar.id} 
                  className="p-4 bg-gray-800 rounded-lg cursor-pointer"
                  onClick={() => selectAvatar(avatar.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${selectedAvatarId === avatar.id ? 'bg-purple-500' : 'bg-gray-600'} flex items-center justify-center`}>
                        <Users size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">{avatar.name}</h4>
                        <p className="text-sm text-gray-400">{avatar.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain size={16} className="text-purple-500" />
                      <span className="text-sm">{(avatar.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Stato</span>
                      <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-500 rounded-full text-xs">
                        Attivo
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Interazioni</span>
                      <span>24</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {metrics.map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${
                        metric.trend === 'up' ? 'text-green-500' :
                        metric.trend === 'down' ? 'text-red-500' :
                        'text-gray-400'
                      }`}>
                        {metric.value}%
                      </span>
                      <span className="text-xs text-gray-400">
                        Target: {metric.target}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        metric.trend === 'up' ? 'bg-green-500' :
                        metric.trend === 'down' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-4">Riepilogo Prestazioni</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Tempo Trascorso</span>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-purple-500" />
                      <span>45:23</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Obiettivi Completati</span>
                    <div className="flex items-center gap-2">
                      <CheckSquare size={16} className="text-green-500" />
                      <span>7/10</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Punteggio Medio</span>
                    <div className="flex items-center gap-2">
                      <BarChart size={16} className="text-blue-500" />
                      <span>85%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto" ref={chatContainerRef}>
                {chatMessages.map(message => (
                  <div 
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-purple-500 bg-opacity-10 ml-10' 
                        : 'bg-gray-700 mr-10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${
                        message.sender === 'user' ? 'text-purple-400' : 'text-gray-300'
                      }`}>
                        {message.sender === 'user' 
                          ? 'Tu' 
                          : activeAvatars.find(a => a.id === message.avatarId)?.name || 'Avatar'
                        }
                      </span>
                      <span className="text-sm text-gray-400">{message.timestamp}</span>
                    </div>
                    <p className="text-sm">{message.text}</p>
                  </div>
                ))}
                {isProcessingResponse && (
                  <div className="p-3 bg-gray-700 rounded-lg mr-10">
                    <div className="animate-pulse flex space-x-2 justify-center">
                      <div className="rounded-full bg-gray-500 h-2 w-2"></div>
                      <div className="rounded-full bg-gray-500 h-2 w-2"></div>
                      <div className="rounded-full bg-gray-500 h-2 w-2"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Scrivi un messaggio..."
                  disabled={isProcessingResponse || !selectedAvatarId}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 disabled:opacity-50"
                />
                <button 
                  onClick={sendMessage}
                  disabled={isProcessingResponse || !selectedAvatarId || !currentMessage.trim()}
                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:bg-gray-600"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
