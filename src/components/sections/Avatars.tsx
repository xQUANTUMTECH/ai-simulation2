import React, { useState, useRef } from 'react';
import { Users, PlusCircle, MessageSquare, Book, Brain, Settings as SettingsIcon, X, Upload, Zap, ChevronDown, Search, Sparkles, Clock, FileText, Sliders, History, BarChart, Download, Share2, Copy, RefreshCw, AlertTriangle, Bell, Tag, Filter, Play, Pause } from 'lucide-react';
import { Modal } from '../Modal';

interface AvatarsProps {
  isDarkMode: boolean;
}

interface Avatar {
  name: string;
  status: string;
  interactions: number;
  role: string;
  expertise: string[];
  description: string;
  prompts: {
    greeting: string;
    analysis: string;
    response: string;
  };
  version?: string;
  metrics?: {
    accuracy: number;
    responseTime: string;
    satisfaction: number;
    totalInteractions: number;
  };
  tags?: string[];
  lastModified?: string;
  notifications?: {
    type: string;
    message: string;
    date: string;
  }[];
}

export function Avatars({ isDarkMode }: AvatarsProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'quick' | 'pro'>('quick');
  const [activeTab, setActiveTab] = useState('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isTestMode, setIsTestMode] = useState(false);
  const [showBrainstormModal, setShowBrainstormModal] = useState(false);
  const [brainstormMessages, setBrainstormMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    name: string;
    type: string;
    size: string;
    uploadedAt: string;
  }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [avatarSummary, setAvatarSummary] = useState('');
  const [activeAvatarTab, setActiveAvatarTab] = useState('info');
  const [avatarSettings, setAvatarSettings] = useState({
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    stopSequences: [],
    responseStyle: 'balanced',
    languageStyle: 'formal',
    expertise: 'intermediate',
    personality: {
      openness: 0.7,
      conscientiousness: 0.8,
      extraversion: 0.6,
      agreeableness: 0.9,
      neuroticism: 0.3
    },
    learningRate: 0.5,
    adaptability: 0.7,
    contextWindow: 4096,
    specializations: [],
    safetyFilters: {
      profanity: true,
      bias: true,
      sensitivity: 'medium'
    }
  });

  const avatars: Avatar[] = [
    {
      name: 'Assistente Legale',
      status: 'Attivo',
      interactions: 156,
      role: 'Esperto in Diritto Civile e Commerciale',
      expertise: ['Contrattualistica', 'Diritto Societario', 'Proprietà Intellettuale'],
      description: 'Specializzato nell\'analisi di documenti legali e nella consulenza su questioni di diritto civile e commerciale.',
      prompts: {
        greeting: 'Salve, sono il suo assistente legale. Come posso aiutarla oggi?',
        analysis: 'Analizzerò il documento dal punto di vista legale, considerando {context} e fornendo un\'analisi dettagliata.',
        response: 'Basandomi sulla mia esperienza in {expertise}, posso suggerire che...'
      },
      version: '1.2.3',
      metrics: {
        accuracy: 95,
        responseTime: '1.2s',
        satisfaction: 4.8,
        totalInteractions: 1250
      },
      tags: ['Legale', 'Contratti', 'Consulenza'],
      lastModified: '2024-03-15',
      notifications: [
        {
          type: 'update',
          message: 'Nuova versione disponibile',
          date: '2024-03-15'
        }
      ]
    }
  ];

  const handleAvatarClick = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Avatar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors relative"
          >
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">3</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <PlusCircle size={20} />
            Nuovo Avatar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Filter size={20} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca avatar per nome, ruolo o competenza..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {avatars.map((avatar, index) => (
          <div key={index} className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700 hover:border-purple-500' : 'border-gray-200 hover:border-purple-300'} transition-colors cursor-pointer`}
               onClick={() => handleAvatarClick(avatar)}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-purple-500 flex items-center justify-center">
                <Users size={32} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{avatar.name}</h3>
                <p className="text-sm text-gray-400">{avatar.interactions} interazioni</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs rounded-full ${
                avatar.status === 'Attivo' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                avatar.status === 'In Pausa' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                'bg-blue-500 bg-opacity-20 text-blue-500'
              }`}>
                {avatar.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                {avatar.tags?.map((tag, i) => (
                  <span key={i} className="px-2 py-1 text-xs bg-gray-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Clone avatar
                    alert('Clonazione avatar...');
                  }}
                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Share avatar
                    alert('Condivisione avatar...');
                  }}
                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Esporta Avatar"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-4">Seleziona Formato</h4>
            <div className="space-y-2">
              <label className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer">
                <input type="radio" name="format" className="mr-3" />
                <div>
                  <p className="font-medium">JSON</p>
                  <p className="text-sm text-gray-400">Formato completo con tutti i dati</p>
                </div>
              </label>
              <label className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer">
                <input type="radio" name="format" className="mr-3" />
                <div>
                  <p className="font-medium">YAML</p>
                  <p className="text-sm text-gray-400">Formato leggibile e strutturato</p>
                </div>
              </label>
            </div>
          </div>
          <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Esporta Avatar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={creationMode === 'quick' ? 'Crea Nuovo Avatar' : 'Configurazione Avanzata Avatar'}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setCreationMode('quick')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                creationMode === 'quick'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Zap size={16} />
              Rapido
            </button>
            <button
              onClick={() => setCreationMode('pro')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                creationMode === 'pro'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Sliders size={16} />
              Pro
            </button>
          </div>

          {creationMode === 'quick' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nome dell'Avatar
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                  placeholder="Inserisci il nome dell'avatar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Descrizione dell'Avatar
                </label>
                <textarea
                  className="w-full h-32 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                  placeholder="Descrivi l'avatar che vuoi creare..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Prompt di Generazione
                </label>
                <textarea
                  className="w-full h-32 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                  placeholder="Descrivi il comportamento e le competenze dell'avatar..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-4">
                  Documenti di Conoscenza
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-1">
                    Trascina qui i documenti o clicca per selezionare
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, TXT - Max 50MB per file
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setShowBrainstormModal(true);
                }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Inizia Brainstorming
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                    placeholder="Nome dell'avatar"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Ruolo
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                    placeholder="Es: Chirurgo, Consulente"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Descrizione
                </label>
                <textarea
                  className="w-full h-32 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                  placeholder="Descrizione dettagliata dell'avatar..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Competenze
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                    placeholder="Aggiungi una competenza e premi Enter"
                  />
                </div>
              </div>
              
              {/* AI Model Settings */}
              <div>
                <h3 className="text-lg font-medium mb-4">Impostazioni AI</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Temperatura (Creatività) - {avatarSettings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={avatarSettings.temperature}
                      onChange={(e) => setAvatarSettings(prev => ({
                        ...prev,
                        temperature: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stile di Risposta
                    </label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
                      value={avatarSettings.responseStyle}
                      onChange={(e) => setAvatarSettings(prev => ({
                        ...prev,
                        responseStyle: e.target.value
                      }))}
                    >
                      <option value="concise">Conciso</option>
                      <option value="balanced">Bilanciato</option>
                      <option value="detailed">Dettagliato</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Personalità
                    </label>
                    <div className="space-y-3">
                      {Object.entries(avatarSettings.personality).map(([trait, value]) => (
                        <div key={trait}>
                          <label className="block text-sm text-gray-400 capitalize mb-1">
                            {trait} - {value}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={value}
                            onChange={(e) => setAvatarSettings(prev => ({
                              ...prev,
                              personality: {
                                ...prev.personality,
                                [trait]: parseFloat(e.target.value)
                              }
                            }))}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Advanced Settings */}
              <div>
                <h3 className="text-lg font-medium mb-4">Impostazioni Avanzate</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Velocità di Apprendimento - {avatarSettings.learningRate}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={avatarSettings.learningRate}
                      onChange={(e) => setAvatarSettings(prev => ({
                        ...prev,
                        learningRate: parseFloat(e.target.value)
                      }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Filtri di Sicurezza
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={avatarSettings.safetyFilters.profanity}
                          onChange={(e) => setAvatarSettings(prev => ({
                            ...prev,
                            safetyFilters: {
                              ...prev.safetyFilters,
                              profanity: e.target.checked
                            }
                          }))}
                          className="mr-2"
                        />
                        Filtro Linguaggio Inappropriato
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={avatarSettings.safetyFilters.bias}
                          onChange={(e) => setAvatarSettings(prev => ({
                            ...prev,
                            safetyFilters: {
                              ...prev.safetyFilters,
                              bias: e.target.checked
                            }
                          }))}
                          className="mr-2"
                        />
                        Riduzione Bias
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                Crea Avatar
              </button>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Brainstorming Modal */}
      <Modal
        isOpen={showBrainstormModal}
        onClose={() => setShowBrainstormModal(false)}
        title="Brainstorming Avatar"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="flex-1 space-y-4 mb-4 max-h-96 overflow-y-auto">
            {brainstormMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{message.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Descrivi le caratteristiche dell'avatar..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
            />
            <button
              onClick={() => {
                if (currentMessage.trim()) {
                  setBrainstormMessages(prev => [
                    ...prev,
                    {
                      role: 'user',
                      content: currentMessage,
                      timestamp: new Date().toLocaleTimeString()
                    }
                  ]);
                  setCurrentMessage('');
                  // Simulate AI response
                  setTimeout(() => {
                    setBrainstormMessages(prev => [
                      ...prev,
                      {
                        role: 'assistant',
                        content: 'Ho capito. Posso aiutarti a sviluppare questo aspetto dell\'avatar...',
                        timestamp: new Date().toLocaleTimeString()
                      }
                    ]);
                  }, 1000);
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Invia
            </button>
          </div>
          
          <button
            onClick={() => {
              setShowBrainstormModal(false);
              // Here you would process the brainstorming conversation
              // and generate the avatar
            }}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Genera Avatar
          </button>
        </div>
      </Modal>
      
      {/* Avatar Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAvatar?.name || ''}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-gray-700 mb-6">
            {[
              { id: 'info', icon: <Users size={20} />, label: 'Informazioni' },
              { id: 'metrics', icon: <BarChart size={20} />, label: 'Metriche' },
              { id: 'settings', icon: <SettingsIcon size={20} />, label: 'Impostazioni' },
              { id: 'history', icon: <History size={20} />, label: 'Cronologia' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveAvatarTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 -mb-px ${
                  activeAvatarTab === tab.id
                    ? 'border-b-2 border-purple-500 text-purple-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeAvatarTab === 'info' && selectedAvatar && (
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Aggiorna Conoscenze
                </button>
                <button
                  onClick={() => setShowChatModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={16} />
                  Modifica con Chat
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Users size={40} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedAvatar.name}</h3>
                  <p className="text-gray-400">{selectedAvatar.role}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Descrizione</h4>
                <p className="text-gray-300">{selectedAvatar.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Competenze</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAvatar.expertise.map((exp, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeAvatarTab === 'metrics' && selectedAvatar?.metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Accuratezza</span>
                    <span className="text-lg font-semibold text-green-500">
                      {selectedAvatar.metrics.accuracy}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${selectedAvatar.metrics.accuracy}%` }}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Soddisfazione</span>
                    <span className="text-lg font-semibold text-blue-500">
                      {selectedAvatar.metrics.satisfaction}/5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      Basato su ```
                      {selectedAvatar.metrics.totalInteractions} interazioni
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeAvatarTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Prompt di Sistema</h4>
                <div className="space-y-4">
                  {Object.entries(selectedAvatar?.prompts || {}).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm text-gray-400 capitalize mb-2">
                        {key}
                      </label>
                      <textarea
                        defaultValue={value}
                        className="w-full h-24 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeAvatarTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Cronologia Versioni</h4>
                <span className="text-sm text-gray-400">
                  Versione attuale: {selectedAvatar?.version}
                </span>
              </div>
              
              <div className="space-y-2">
                {[
                  { version: '1.2.3', date: '2024-03-15', changes: 'Miglioramento accuratezza risposte' },
                  { version: '1.2.2', date: '2024-03-10', changes: 'Aggiunta nuove competenze' },
                  { version: '1.2.1', date: '2024-03-05', changes: 'Ottimizzazione performance' }
                ].map((version, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">v{version.version}</span>
                      <span className="text-sm text-gray-400">{version.date}</span>
                    </div>
                    <p className="text-sm text-gray-300">{version.changes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Update Knowledge Modal */}
      <Modal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        title="Aggiorna Conoscenze Avatar"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
            <Upload size={32} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-400 mb-1">
              Trascina qui i documenti o clicca per selezionare
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOCX, TXT - Max 50MB per file
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Documenti Caricati</h3>
            {uploadedDocuments.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-gray-400" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-400">{doc.size} • {doc.uploadedAt}</p>
                  </div>
                </div>
                <button className="text-red-400 hover:text-red-300">
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>

          <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Aggiorna Conoscenze
          </button>
        </div>
      </Modal>

      {/* Chat Modification Modal */}
      <Modal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="Modifica Avatar con Chat"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div className="flex-1 space-y-4 mb-4 max-h-96 overflow-y-auto">
            {brainstormMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700'
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{message.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Descrivi le modifiche che vuoi apportare..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
            />
            <button
              onClick={() => {
                if (currentMessage.trim()) {
                  setBrainstormMessages(prev => [
                    ...prev,
                    {
                      role: 'user',
                      content: currentMessage,
                      timestamp: new Date().toLocaleTimeString()
                    }
                  ]);
                  setCurrentMessage('');
                  // Simulate AI response
                  setTimeout(() => {
                    setBrainstormMessages(prev => [
                      ...prev,
                      {
                        role: 'assistant',
                        content: 'Capisco. Procedo con la modifica richiesta...',
                        timestamp: new Date().toLocaleTimeString()
                      }
                    ]);
                  }, 1000);
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Invia
            </button>
          </div>

          <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            Applica Modifiche
          </button>
        </div>
      </Modal>
    </div>
  );
}