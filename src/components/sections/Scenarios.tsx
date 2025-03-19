import React, { useState, useCallback, useEffect } from 'react';
import { PlusCircle, Gamepad2 } from 'lucide-react';
import { Modal } from '../Modal';
import { InviteModal } from '../InviteModal';
import { RoomSelector } from '../simulation/RoomSelector';
import { CreateScenarioForm } from '../scenarios/CreateScenarioForm';
import { ScenarioCard } from '../scenarios/ScenarioCard';
import { aiService } from '../../services/ai-service';
import { scenarioService, Scenario as ScenarioType } from '../../services/scenario-service';
import { supabase } from '../../services/supabase';
import { Brain, MessageSquare, X, Clock, Users } from 'lucide-react';

interface ScenariosProps {
  isDarkMode: boolean;
}

export function Scenarios({ isDarkMode }: ScenariosProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState<'form' | 'chat' | false>(false);
  const [scenarios, setScenarios] = useState<ScenarioType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<{
    name: string;
    role: string;
    stats: {
      accuracy: number;
      interactions: number;
      satisfaction: number;
    };
    specializations: string[];
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Ciao! Sono qui per aiutarti a creare un nuovo scenario. Descrivimi che tipo di scenario vorresti creare.' }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Carica gli scenari all'avvio
  useEffect(() => {
    loadScenarios();
  }, []);
  
  const loadScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ottieni l'utente corrente
      let userId = 'anonymous';
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }
      
      // Carica gli scenari
      const loadedScenarios = await scenarioService.getScenarios(userId);
      console.log('Scenari caricati:', loadedScenarios);
      setScenarios(loadedScenarios);
    } catch (err) {
      console.error('Errore nel caricamento degli scenari:', err);
      setError('Impossibile caricare gli scenari. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = useCallback(async (newScenario: Partial<ScenarioType>) => {
    try {
      // Ottieni l'utente corrente
      let userId = 'anonymous';
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      }
      
      // Crea lo scenario con il servizio
      const createdScenario = await scenarioService.createScenario({
        ...newScenario,
        created_by: userId,
        status: 'Disponibile',
        avatars: newScenario.avatars || 2
      });
      
      // Aggiorna la lista degli scenari
      setScenarios(prev => [...prev, createdScenario]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Errore nella creazione dello scenario:', err);
      // Potremmo mostrare un messaggio di errore qui
    }
  }, []);

  const handleStartSimulation = (scenario: ScenarioType) => {
    setSelectedScenario(scenario);
    setShowRoomSelector(true);
  };

  const handleInvite = (scenario: ScenarioType) => {
    setSelectedScenario(scenario);
    setShowInviteModal(true);
  };

  const handleAvatarClick = () => {
    setSelectedAvatar({
      name: 'Assistente Chirurgo',
      role: 'Chirurgo Specializzato',
      stats: {
        accuracy: 92,
        interactions: 156,
        satisfaction: 4.8
      },
      specializations: [
        'Chirurgia mini-invasiva',
        'Procedure di emergenza',
        'Coordinamento team'
      ]
    });
    setShowAvatarModal(true);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isGenerating) return;

    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: currentMessage }]);
    setCurrentMessage('');

    // If we have enough context, generate scenario
    if (chatMessages.length >= 3) {
      setIsGenerating(true);
      try {
        const scenario = await aiService.generateScenarioFromChat(chatMessages);
        
        // Add success message
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Ho generato uno scenario basato sulla nostra conversazione:\n\n` +
            `Titolo: ${scenario.title}\n` +
            `Descrizione: ${scenario.description}\n\n` +
            `Lo scenario è stato creato con successo! Puoi trovarlo nella lista degli scenari.`
        }]);

        // Salva lo scenario usando il servizio
        const userId = 'anonymous';
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const userId = user.id;
          }
        }

        // Crea lo scenario
        handleCreateScenario({
          title: scenario.title,
          description: scenario.description,
          avatars: scenario.roles?.length || 2,
          status: 'Disponibile',
          created_by: userId
        });

        // Close modal after delay
        setTimeout(() => setShowCreateModal(false), 2000);
      } catch (error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Mi dispiace, si è verificato un errore durante la generazione dello scenario. Riprova.'
        }]);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Add assistant response asking for more details
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Grazie per le informazioni. Puoi dirmi di più sugli obiettivi specifici o i ruoli che vorresti includere nello scenario?'
        }]);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Scenari di Simulazione</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCreateModal('chat')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <MessageSquare size={20} />
            Crea con Chat
          </button>
          <button 
            onClick={() => setShowCreateModal('form')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <PlusCircle size={20} />
            Crea Manualmente
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Caricamento scenari...</p>
        </div>
      ) : scenarios.length > 0 ? (
        scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id} 
            scenario={scenario}
            onStart={() => handleStartSimulation(scenario)}
            onInvite={() => handleInvite(scenario)}
            onAvatarDetails={handleAvatarClick}
          />
        ))
      ) : (
        <div className="p-6 text-center border border-gray-700 rounded-lg">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gamepad2 size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-medium mb-2">Nessuno scenario trovato</h3>
          <p className="text-gray-400 mb-4">
            Crea il tuo primo scenario di simulazione o analizza un documento per generare scenari automaticamente.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowCreateModal('form')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Crea Manualmente
            </button>
          </div>
        </div>
      )}

      {/* Virtual Room Modal */}
      {selectedScenario && (
        <RoomSelector
          isOpen={showRoomSelector}
          onClose={() => setShowRoomSelector(false)}
          scenarioId={selectedScenario.id}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Invite Modal */}
      {selectedScenario && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          isDarkMode={isDarkMode}
          scenario={selectedScenario}
        />
      )}

      {/* Avatar Details Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Dettagli Avatar"
        isDarkMode={isDarkMode}
      >
        {selectedAvatar && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-purple-500 flex items-center justify-center">
                <Users size={32} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedAvatar.name}</h3>
                <p className="text-gray-400">{selectedAvatar.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Brain size={20} className="text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{selectedAvatar.stats.accuracy}%</div>
                <div className="text-sm text-gray-400">Accuratezza</div>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare size={20} className="text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{selectedAvatar.stats.interactions}</div>
                <div className="text-sm text-gray-400">Interazioni</div>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-green-500" />
                </div>
                <div className="text-2xl font-bold">{selectedAvatar.stats.satisfaction}</div>
                <div className="text-sm text-gray-400">Soddisfazione</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Specializzazioni</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAvatar.specializations.map((spec, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Scenario Modal */}
      <Modal
        isOpen={showCreateModal === 'form'}
        onClose={() => setShowCreateModal(false)}
        title="Crea Nuovo Scenario"
        isDarkMode={isDarkMode}
      >
        <CreateScenarioForm
          onSubmit={handleCreateScenario}
          isDarkMode={isDarkMode}
        />
      </Modal>

      {/* Chat Creation Modal */}
      <Modal
        isOpen={showCreateModal === 'chat'}
        onClose={() => setShowCreateModal(false)}
        title="Crea Scenario con AI"
        isDarkMode={isDarkMode}
      >
        <div className="flex flex-col h-[600px]">
          {/* AI Assistant Header */}
          <div className="flex items-center gap-3 mb-4 p-4 bg-gray-700 rounded-lg">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <Brain size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-800" />
            </div>
            <div>
              <h3 className="font-medium">Assistente AI</h3>
              <p className="text-sm text-gray-400">Online</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 px-4">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideIn`}
              >
                <div className="flex items-end gap-2 max-w-[80%]">
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <Brain size={16} className="text-white" />
                    </div>
                  )}
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white rounded-br-none'
                      : isDarkMode 
                        ? 'bg-gray-700 rounded-bl-none' 
                        : 'bg-gray-100 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Brain size={16} className="text-white animate-pulse" />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
            {isTyping && !isGenerating && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Brain size={16} className="text-white" />
                </div>
                <div className="px-4 py-2 bg-gray-700 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2 p-4 mt-4 bg-gray-700 rounded-lg">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => {
                setCurrentMessage(e.target.value);
                if (!isTyping && e.target.value) {
                  setIsTyping(true);
                  setTimeout(() => setIsTyping(false), 1000);
                }
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Descrivi lo scenario che vuoi creare..."
              className={`flex-1 px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-800 focus:bg-gray-900' 
                  : 'bg-gray-100 focus:bg-gray-50'
              } outline-none transition-colors focus:ring-2 focus:ring-purple-500`}
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating}
              className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 disabled:hover:bg-purple-500"
            >
              <MessageSquare size={20} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
