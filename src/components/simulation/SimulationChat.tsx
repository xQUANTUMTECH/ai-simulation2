/**
 * Componente per la chat interattiva nelle simulazioni
 * Integra il riconoscimento vocale, la sintesi vocale e l'avatar virtuale
 * per conversazioni interattive con supporto multilingua
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import VoiceRecognitionUI from './VoiceRecognitionUI';
import AvatarComponent from './AvatarComponent';
import { voiceRecognitionService } from '../../services/voice-recognition-service';
import { useTranslation } from '../../services/i18n-service.js';
import { useChatPerformance } from '../../hooks/useChatPerformance';

// Tipi di messaggio nella chat
type MessageType = 'user' | 'ai' | 'system';

// Struttura di un messaggio in chat
interface ChatMessage {
  id: string;
  text: string;
  type: MessageType;
  timestamp: Date;
  isFinal?: boolean;
  audioUrl?: string;
}

interface SimulationChatProps {
  avatarId?: string;
  avatarName?: string;
  avatarImageUrl?: string;
  initialMessages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<string>;
  onGenerateAudio?: (text: string) => Promise<string>;
  className?: string;
  autoStart?: boolean;
}

const SimulationChat: React.FC<SimulationChatProps> = ({
  avatarId,
  avatarName = 'Assistente',
  avatarImageUrl = '/assets/default-avatar.png',
  initialMessages = [],
  onSendMessage,
  onGenerateAudio,
  className = '',
  autoStart = false
}) => {
  // Stato della chat
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [useVoiceInput, setUseVoiceInput] = useState(autoStart);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Riferimenti DOM
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Hook per ottimizzazioni performance
  const { 
    settings: perfSettings, 
    styles: perfStyles, 
    optimizeScroll,
    getVisibleMessagesFilter,
    metrics: perfMetrics
  } = useChatPerformance();
  
  // ID per i messaggi
  const generateId = useCallback(() => 
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
  []);
  
  /**
   * Scorrimento automatico alla fine della chat, ottimizzato per le performance
   */
  const scrollToBottom = useCallback(() => {
    // Usa la funzione di ottimizzazione scroll che applica throttling e requestAnimationFrame
    optimizeScroll(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [optimizeScroll]);
  
  /**
   * Gestione trascrizione dal riconoscimento vocale
   */
  const handleTranscriptChange = useCallback((transcript: string, isFinal: boolean) => {
    if (!transcript) return;
    
    if (isFinal) {
      // Quando il riconoscimento è completato, invia il messaggio
      handleSendMessage(transcript);
    } else {
      // Aggiorna il messaggio temporaneo dell'utente durante il riconoscimento
      setMessages(prevMessages => {
        // Cerca se c'è già un messaggio temporaneo
        const tempIndex = prevMessages.findIndex(m => m.type === 'user' && m.isFinal === false);
        
        if (tempIndex >= 0) {
          // Aggiorna il messaggio temporaneo esistente
          const newMessages = [...prevMessages];
          newMessages[tempIndex] = {
            ...newMessages[tempIndex],
            text: transcript
          };
          return newMessages;
        } else {
          // Crea un nuovo messaggio temporaneo
          return [
            ...prevMessages,
            {
              id: generateId(),
              text: transcript,
              type: 'user',
              timestamp: new Date(),
              isFinal: false
            }
          ];
        }
      });
    }
  }, []);
  
  /**
   * Gestione errori di supporto del riconoscimento vocale
   */
  const handleSupportError = useCallback((errorMessage: string) => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: generateId(),
        text: `Errore: ${errorMessage}`,
        type: 'system',
        timestamp: new Date(),
        isFinal: true
      }
    ]);
    
    // Disattiva input vocale se non supportato
    setUseVoiceInput(false);
  }, []);
  
  /**
   * Invio messaggio (testo o vocale)
   */
  const handleSendMessage = useCallback(async (text: string = inputText) => {
    if (!text.trim()) return;
    
    // Disattiva momentaneamente riconoscimento vocale durante l'elaborazione
    if (useVoiceInput) {
      voiceRecognitionService.stop();
    }
    
    setIsProcessing(true);
    
    // Aggiungi il messaggio dell'utente (finale)
    const userMessage: ChatMessage = {
      id: generateId(),
      text,
      type: 'user',
      timestamp: new Date(),
      isFinal: true
    };
    
    // Aggiorna lo stato dei messaggi
    setMessages(prevMessages => {
      // Filtra eventuali messaggi temporanei dell'utente
      const filteredMessages = prevMessages.filter(m => m.type !== 'user' || m.isFinal === true);
      return [...filteredMessages, userMessage];
    });
    
    // Pulisci input
    setInputText('');
    
    try {
      // Richiedi risposta all'AI
      if (onSendMessage) {
        // Indicatore di elaborazione
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: generateId(),
            text: '...',
            type: 'ai',
            timestamp: new Date(),
            isFinal: false
          }
        ]);
        
        // Attendi risposta AI
        const aiResponse = await onSendMessage(text);
        
        // Funzione per controllare riproduzione audio
        let audioUrl: string | undefined;
        
        // Genera audio se richiesto e disponibile
        if (onGenerateAudio) {
          try {
            audioUrl = await onGenerateAudio(aiResponse);
          } catch (error) {
            console.error('Errore nella generazione audio:', error);
          }
        }
        
        // Aggiorna messaggi con risposta AI finale
        setMessages(prevMessages => {
          // Rimuovi indicatore di elaborazione
          const filteredMessages = prevMessages.filter(m => m.isFinal !== false || m.type !== 'ai');
          
          // Aggiungi messaggio AI finale
          return [
            ...filteredMessages,
            {
              id: generateId(),
              text: aiResponse,
              type: 'ai',
              timestamp: new Date(),
              isFinal: true,
              audioUrl
            }
          ];
        });
        
        // Riproduci audio se disponibile
        if (audioUrl && audioRef.current) {
          setIsSpeaking(true);
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Errore nell\'invio del messaggio:', error);
      
      // Aggiungi messaggio di errore
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: generateId(),
          text: 'Si è verificato un errore nella comunicazione con l\'assistente.',
          type: 'system',
          timestamp: new Date(),
          isFinal: true
        }
      ]);
    } finally {
      setIsProcessing(false);
      
      // Riattiva riconoscimento vocale se era attivo
      if (useVoiceInput) {
        // Piccolo ritardo per assicurarsi che l'audio sia terminato
        setTimeout(() => {
          voiceRecognitionService.start();
        }, 500);
      }
    }
  }, [inputText, onGenerateAudio, onSendMessage, useVoiceInput]);
  
  /**
   * Gestione input da tastiera
   */
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Toggle input vocale
   */
  const toggleVoiceInput = () => {
    if (useVoiceInput) {
      // Disattiva input vocale
      voiceRecognitionService.stop();
      setUseVoiceInput(false);
    } else {
      // Attiva input vocale
      setUseVoiceInput(true);
    }
  };
  
  /**
   * Evento fine riproduzione audio
   */
  const handleAudioEnded = () => {
    setIsSpeaking(false);
  };
  
  /**
   * Effetto scorrimento alla fine quando arrivano nuovi messaggi
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  return (
    <div className={`simulation-chat ${className}`} ref={chatContainerRef}>
      {/* Intestazione chat */}
      <div className="chat-header">
        <div className="avatar-info">
          <span className="avatar-name">{avatarName}</span>
        </div>
        <div className="chat-controls">
          <button 
            className={`voice-toggle ${useVoiceInput ? 'active' : ''}`}
            onClick={toggleVoiceInput}
            disabled={isProcessing}
            title={useVoiceInput ? 'Disattiva input vocale' : 'Attiva input vocale'}
          >
            <i className="mic-icon"></i>
          </button>
        </div>
      </div>
      
      {/* Avatar animato */}
      <div className="avatar-container">
        <AvatarComponent
          avatarId={avatarId}
          avatarName={avatarName}
          avatarImageUrl={avatarImageUrl}
          initialState={isSpeaking ? 'speaking' : 'idle'}
          audioUrl={messages.find(m => m.type === 'ai' && m.audioUrl)?.audioUrl}
          audioConfig={{ volume: 1.0, speed: 1.0 }}
          onAudioComplete={() => setIsSpeaking(false)}
          expression={isSpeaking ? 'neutral' : 'smile'}
          showControls={false}
          className="chat-avatar"
        />
      </div>
      
      {/* Contenitore messaggi con ottimizzazioni performance */}
      <div 
        className="chat-messages" 
        style={{ 
          ...perfStyles.scrollable,
          ...perfStyles.messages
        }}
      >
        {messages
          // Applica filtro per virtualizzazione se necessario (mostra solo messaggi visibili)
          .filter(getVisibleMessagesFilter(messages.length))
          .map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.type} ${!message.isFinal ? 'interim' : ''}`}
          >
            {message.type === 'ai' && (
              <img src={avatarImageUrl} alt={avatarName} className="message-avatar" />
            )}
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-meta">
                {message.isFinal && (
                  <span className="message-time">
                    {new Intl.DateTimeFormat('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(message.timestamp)}
                  </span>
                )}
                {message.type === 'ai' && message.audioUrl && message.isFinal && (
                  <button 
                    className="replay-audio"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.src = message.audioUrl!;
                        audioRef.current.play();
                        setIsSpeaking(true);
                      }
                    }}
                    title="Riproduci messaggio"
                  >
                    <i className="audio-icon"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Area input */}
      <div className="chat-input-area">
        {useVoiceInput ? (
          // Input vocale
          <VoiceRecognitionUI
            onTranscriptChange={handleTranscriptChange}
            onSupportError={handleSupportError}
            autoStart={true}
            showControls={false}
            showStatus={true}
            className="voice-recognition"
          />
        ) : (
          // Input testuale
          <div className="text-input-container">
            <input
              type="text"
              className="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Scrivi un messaggio..."
              disabled={isProcessing}
            />
            <button
              className="send-button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isProcessing}
              title="Invia messaggio"
            >
              <i className="send-icon"></i>
            </button>
          </div>
        )}
      </div>
      
      {/* Elemento audio nascosto per la riproduzione */}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded}
        style={{ display: 'none' }}
      />
      
      {/* Stili CSS */}
      <style>
        {`
        .simulation-chat {
          display: flex;
          flex-direction: column;
          height: 600px;
          max-height: 80vh;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background: white;
          font-family: Arial, sans-serif;
        }
        
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: #4a6cf7;
          color: white;
        }
        
        .avatar-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .avatar-image {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .avatar-name {
          font-size: 16px;
          font-weight: 500;
        }
        
        .chat-controls button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s ease;
        }
        
        .chat-controls button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .chat-controls button.active {
          background: #3852c5;
        }
        
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          background: #f9f9f9;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .message {
          display: flex;
          margin-bottom: 10px;
          max-width: 80%;
        }
        
        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        
        .message.ai {
          align-self: flex-start;
        }
        
        .message.system {
          align-self: center;
          max-width: 90%;
          text-align: center;
          background: #f0f0f0;
          border-radius: 10px;
          padding: 8px 15px;
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .message.interim {
          opacity: 0.7;
        }
        
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          margin: 0 8px;
        }
        
        .message-content {
          padding: 10px 15px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          max-width: calc(100% - 50px);
        }
        
        .message.user .message-content {
          background: #4a6cf7;
          color: white;
          border-radius: 18px 18px 0 18px;
        }
        
        .message.ai .message-content {
          background: white;
          color: #333;
          border-radius: 18px 18px 18px 0;
        }
        
        .message-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 5px;
          font-size: 12px;
          color: #999;
        }
        
        .message.user .message-meta {
          justify-content: flex-end;
        }
        
        .message.ai .message-meta {
          justify-content: flex-start;
        }
        
        .replay-audio {
          background: none;
          border: none;
          cursor: pointer;
          color: #4a6cf7;
        }
        
        .chat-input-area {
          padding: 15px;
          background: white;
          border-top: 1px solid #eee;
        }
        
        .text-input-container {
          display: flex;
          gap: 10px;
        }
        
        .text-input {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 15px;
          outline: none;
        }
        
        .text-input:focus {
          border-color: #4a6cf7;
        }
        
        .send-button {
          background: #4a6cf7;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
        }
        
        .send-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .voice-recognition {
          margin-bottom: 0;
        }
        
        /* Icone */
        .send-icon:before {
          content: '➤';
        }
        
        .mic-icon:before {
          content: '🎤';
        }
        
        .audio-icon:before {
          content: '🔊';
        }
        `}
      </style>
    </div>
  );
};

export default SimulationChat;
