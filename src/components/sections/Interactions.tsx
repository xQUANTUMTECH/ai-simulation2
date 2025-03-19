import React from 'react';
import { MessageSquare, Users, Send, Search, Plus, History, X, ChevronLeft } from 'lucide-react'; 
import { useState } from 'react';
import { Modal } from '../Modal';

interface InteractionsProps {
  isDarkMode: boolean;
}

export function Interactions({ isDarkMode }: InteractionsProps) {
  const [showAvatarDetails, setShowAvatarDetails] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<{
    name: string;
    scenarios: Array<{
      title: string;
      date: string;
      status: string;
      performance: number;
    }>;
    summary: string;
  } | null>(null);

  const [showNewInteractionModal, setShowNewInteractionModal] = useState(false);
  const [selectedAvatarForChat, setSelectedAvatarForChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    content: string;
    sender: 'user' | 'avatar';
    timestamp: string;
  }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [availableAvatars] = useState([
    { id: '1', name: 'Assistente Legale', role: 'Esperto Legale', status: 'online' },
    { id: '2', name: 'Consulente Medico', role: 'Medico', status: 'offline' },
    { id: '3', name: 'Analista Finanziario', role: 'Finanza', status: 'online' }
  ]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add user message
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: newMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setNewMessage('');

      // Simulate avatar response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: 'Grazie per il messaggio. Come posso aiutarti oggi?',
          sender: 'avatar',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }, 1000);
    }
  };

  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory] = useState([
    {
      id: '1',
      avatar: {
        id: '1',
        name: 'Assistente Legale',
        role: 'Esperto Legale',
        status: 'online'
      },
      date: '2024-03-15',
      lastMessage: 'Analisi del contratto completata',
      unread: 2,
      messages: [
        { id: '1', content: 'Come posso aiutarti con l\'analisi del contratto?', sender: 'avatar', timestamp: '10:30' },
        { id: '2', content: 'Ho bisogno di una revisione della clausola 3.2', sender: 'user', timestamp: '10:31' }
      ]
    },
    {
      id: '2',
      avatar: {
        id: '2',
        name: 'Consulente Finanziario',
        role: 'Finanza',
        status: 'offline'
      },
      date: '2024-03-14',
      lastMessage: 'Revisione del budget Q1 completata',
      unread: 0,
      messages: [
        { id: '3', content: 'Buongiorno, ho una domanda sulla proprietà intellettuale', sender: 'user', timestamp: '15:20' },
        { id: '4', content: 'Certamente, in cosa posso esserti utile?', sender: 'avatar', timestamp: '15:21' }
      ]
    }
  ]);

  const handleChatSelect = (chat: any) => {
    setSelectedAvatarForChat(chat.avatar.id);
    setChatMessages(chat.messages);
    setShowChatHistory(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Interazioni</h2>
        <button 
          onClick={() => setShowNewInteractionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <MessageSquare size={20} />
          Nuova Interazione
        </button>
      </div>

      <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="divide-y divide-gray-700">
          {[
            { avatar: 'Assistente Legale', message: 'Analisi del contratto completata', time: '10 minuti fa' },
            { avatar: 'Consulente Finanziario', message: 'Revisione del budget Q1', time: '1 ora fa' },
            { avatar: 'Esperto Tecnico', message: 'Valutazione specifiche tecniche', time: '3 ore fa' }
          ].map((interaction, index) => (
            <div key={index} onClick={() => {
              setSelectedAvatar({
                name: interaction.avatar,
                scenarios: [
                  { title: 'Analisi Contrattuale', date: '2024-03-15', status: 'Completato', performance: 92 },
                  { title: 'Negoziazione', date: '2024-03-10', status: 'In Corso', performance: 85 }
                ],
                summary: 'L\'avatar ha dimostrato eccellenti capacità di analisi e comunicazione. Particolarmente efficace nella gestione di scenari complessi e nella risoluzione di problemi in tempo reale.'
              });
              setSelectedAvatarForChat(index.toString());
            }} className={`p-4 hover:bg-gray-800 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Users size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{interaction.avatar}</h3>
                    <span className="text-sm text-gray-400">{interaction.time}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{interaction.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avatar Details Modal */}
      <Modal
        isOpen={showAvatarDetails}
        onClose={() => setShowAvatarDetails(false)}
        title={selectedAvatar?.name || ''}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Riepilogo IA</h3>
            <p className="text-gray-300 bg-gray-700 p-4 rounded-lg">
              {selectedAvatar?.summary}
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-4">Scenari Partecipati</h3>
            <div className="space-y-3">
              {selectedAvatar?.scenarios.map((scenario, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{scenario.title}</h4>
                      <p className="text-sm text-gray-400">{scenario.date}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      scenario.status === 'Completato' 
                        ? 'bg-green-500 bg-opacity-20 text-green-500' 
                        : 'bg-blue-500 bg-opacity-20 text-blue-500'
                    }`}>
                      {scenario.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-600 rounded-full">
                      <div 
                        className="h-2 bg-purple-500 rounded-full"
                        style={{ width: `${scenario.performance}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{scenario.performance}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* New Interaction Modal */}
      <Modal
        isOpen={showNewInteractionModal}
        onClose={() => setShowNewInteractionModal(false)}
        title="Nuova Interazione"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca avatar..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div className="space-y-2">
            {availableAvatars.map((avatar) => (
              <div
                key={avatar.id}
                onClick={() => {
                  setShowNewInteractionModal(false);
                  setSelectedAvatarForChat(avatar.id);
                }}
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{avatar.name}</p>
                    <p className="text-sm text-gray-400">{avatar.role}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  avatar.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Chat Modal */}
      <Modal
        isOpen={selectedAvatarForChat !== null}
        onClose={() => setSelectedAvatarForChat(null)}
        title={showChatHistory ? 'Cronologia Chat' : availableAvatars.find(a => a.id === selectedAvatarForChat)?.name || ''}
        isDarkMode={isDarkMode}
      >
        <div className="flex flex-col h-[600px] relative">
          {/* Header Actions */}
          <div className="absolute top-0 right-0 flex items-center gap-2 p-4 z-10">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <History size={20} />
            </button>
            <button
              onClick={() => setSelectedAvatarForChat(null)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1">
            {showChatHistory ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Chat Recenti</h3>
                    <button
                      onClick={() => setShowChatHistory(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatSelect(chat)}
                      className="p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                            <Users size={24} className="text-white" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${
                            chat.avatar.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{chat.avatar.name}</h4>
                            <span className="text-sm text-gray-400">{chat.date}</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">{chat.lastMessage}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">{chat.avatar.role}</span>
                            {chat.unread > 0 && (
                              <span className="px-2 py-0.5 bg-purple-500 rounded-full text-xs">
                                {chat.unread} nuovi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-lg ${
                        message.sender === 'user' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-700'
                      }`}>
                        <p className="mb-1">{message.content}</p>
                        <p className="text-xs text-gray-400">{message.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 p-4 bg-gray-800 rounded-lg">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}