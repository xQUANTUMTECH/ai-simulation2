/**
 * Componente UI per il riconoscimento vocale in tempo reale
 * Fornisce un'interfaccia utente che mostra lo stato del riconoscimento vocale,
 * un feedback visivo durante il parlato e i risultati riconosciuti
 * Con supporto per multilingua attraverso il sistema i18n
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { voiceRecognitionService, VoiceRecognitionResult, VoiceRecognitionState, SpeechFeedback } from '../../services/voice-recognition-service';
import { useTranslation } from '../../services/i18n-context';

interface VoiceRecognitionUIProps {
  onTranscriptChange?: (transcript: string, isFinal: boolean) => void;
  onSupportError?: (errorMessage: string) => void;
  autoStart?: boolean;
  language?: string;
  showInterimResults?: boolean;
  showControls?: boolean;
  showStatus?: boolean;
  className?: string;
}

const VoiceRecognitionUI: React.FC<VoiceRecognitionUIProps> = ({
  onTranscriptChange,
  onSupportError,
  autoStart = false,
  language = 'it-IT',
  showInterimResults = true,
  showControls = true,
  showStatus = true,
  className = ''
}) => {
  // Stato riconoscimento vocale
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    error: null,
    supported: true
  });

  // Risultati riconoscimento (testo)
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  
  // Stato feedback audio (visualizzazione volume, ecc.)
  const [audioLevel, setAudioLevel] = useState(0);
  const [showAudioFeedback, setShowAudioFeedback] = useState(false);
  
  // Flag per evitare errori durante unmount
  const isMounted = useRef(true);
  
  // Timer per simulare diminuzione del volume
  const audioLevelTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Riferimento al contenitore per effetti visivi
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Hook per le traduzioni
  const { t } = useTranslation();
  
  /**
   * Avvia il riconoscimento vocale
   */
  const startRecognition = useCallback(() => {
    if (state.isListening) return;
    
    const success = voiceRecognitionService.start();
    if (!success && state.supported) {
      // Se supportato ma fallisce l'avvio, richiedi esplicitamente i permessi
      voiceRecognitionService.requestMicrophonePermission()
        .then(granted => {
          if (granted) {
            // Riprova ad avviare dopo permessi concessi
            voiceRecognitionService.start();
          }
        });
    }
  }, [state.isListening, state.supported]);
  
  /**
   * Ferma il riconoscimento vocale
   */
  const stopRecognition = useCallback(() => {
    if (!state.isListening) return;
    voiceRecognitionService.stop();
  }, [state.isListening]);
  
  /**
   * Applica effetto visivo per il feedback audio
   * @param level Livello audio (0-100)
   */
  const applyAudioLevelEffect = useCallback((level: number) => {
    setAudioLevel(level);
    setShowAudioFeedback(level > 0);
    
    // Simulazione decadimento naturale del livello audio
    if (audioLevelTimer.current) {
      clearTimeout(audioLevelTimer.current);
    }
    
    audioLevelTimer.current = setTimeout(() => {
      if (isMounted.current) {
        if (level > 0) {
          // Riduci gradualmente il livello
          applyAudioLevelEffect(Math.max(0, level - 15));
        } else {
          setShowAudioFeedback(false);
        }
      }
    }, 200);
  }, []);
  
  /**
   * Gestisci i risultati del riconoscimento vocale
   */
  const handleResult = useCallback((result: VoiceRecognitionResult) => {
    const { transcript, isFinal, confidence } = result;
    
    // Genera livello audio simulato basato sulla confidenza del riconoscimento
    const audioLevel = Math.min(100, Math.round(confidence * 70) + 30);
    applyAudioLevelEffect(audioLevel);
    
    if (isFinal) {
      // Risultato finale
      setFinalTranscript(prev => {
        const newText = prev ? `${prev} ${transcript}` : transcript;
        // Notifica al componente padre
        if (onTranscriptChange) {
          onTranscriptChange(newText, true);
        }
        return newText;
      });
      setInterimTranscript('');
    } else if (showInterimResults) {
      // Risultato intermedio (in tempo reale)
      setInterimTranscript(transcript);
      // Notifica al componente padre
      if (onTranscriptChange) {
        onTranscriptChange(transcript, false);
      }
    }
  }, [applyAudioLevelEffect, onTranscriptChange, showInterimResults]);
  
  /**
   * Gestisci eventi di feedback dettagliati
   */
  const handleFeedback = useCallback((feedback: SpeechFeedback) => {
    switch (feedback.type) {
      case 'start':
        // Attivazione microfono
        applyAudioLevelEffect(30); // Effetto visivo iniziale
        break;
      case 'audio-start':
        // Inizio acquisizione audio
        setShowAudioFeedback(true);
        break;
      case 'audio-end':
        // Fine acquisizione audio
        applyAudioLevelEffect(0);
        break;
      case 'no-speech':
        // Nessun discorso rilevato
        applyAudioLevelEffect(0);
        break;
      case 'error':
        // Gestione errori
        if (feedback.errorCode === 'not-allowed') {
          // Errore permessi microfono
          if (onSupportError) {
            onSupportError(t('error.microphoneDenied'));
          }
        }
        break;
    }
  }, [applyAudioLevelEffect, onSupportError, t]);
  
  /**
   * Pulisci trascrizione
   */
  const clearTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    if (onTranscriptChange) {
      onTranscriptChange('', true);
    }
  }, [onTranscriptChange]);
  
  /**
   * Effetto di inizializzazione e pulizia
   */
  useEffect(() => {
    // Inizializza il servizio e imposta la lingua
    voiceRecognitionService.initialize();
    if (language) {
      voiceRecognitionService.setLanguage(language);
    }
    
    // Attiva sottoscrizione ai cambiamenti di lingua
    voiceRecognitionService.subscribeToLanguageChanges();
    
    // Sottoscrivi agli aggiornamenti di stato
    const stateSubscription = voiceRecognitionService.state$.subscribe(newState => {
      if (isMounted.current) {
        setState(newState);
        
        // Notifica errori di supporto
        if (!newState.supported && onSupportError) {
          onSupportError(t('voice.notSupported'));
        }
      }
    });
    
    // Sottoscrivi ai risultati
    const resultsSubscription = voiceRecognitionService.results$.subscribe(result => {
      if (isMounted.current) {
        handleResult(result);
      }
    });
    
    // Sottoscrivi ai feedback dettagliati
    const feedbackSubscription = voiceRecognitionService.feedback$.subscribe(feedback => {
      if (isMounted.current) {
        handleFeedback(feedback);
      }
    });
    
    // Avvio automatico se richiesto
    if (autoStart) {
      // Piccolo ritardo per assicurarsi che il componente sia montato completamente
      setTimeout(() => {
        if (isMounted.current) {
          startRecognition();
        }
      }, 500);
    }
    
    // Cleanup alla distruzione del componente
    return () => {
      isMounted.current = false;
      if (audioLevelTimer.current) {
        clearTimeout(audioLevelTimer.current);
      }
      
      // Annulla sottoscrizioni
      stateSubscription.unsubscribe();
      resultsSubscription.unsubscribe();
      feedbackSubscription.unsubscribe();
      
      // Ferma il riconoscimento
      voiceRecognitionService.stop();
    };
  }, [autoStart, handleFeedback, handleResult, language, onSupportError, startRecognition, t]);
  
  return (
    <div 
      ref={containerRef}
      className={`voice-recognition-container ${className}`}
      style={{ position: 'relative' }}
    >
      {/* Controlli per avvio/stop */}
      {showControls && (
        <div className="voice-controls">
          <button
            className={`voice-button ${state.isListening ? 'active' : ''}`}
            onClick={state.isListening ? stopRecognition : startRecognition}
            disabled={!state.supported}
            title={state.isListening ? t('voice.stop') : t('voice.start')}
          >
            <i className={`icon ${state.isListening ? 'stop-icon' : 'mic-icon'}`}></i>
            {state.isListening ? t('common.stop') : t('common.microphone')}
          </button>
          
          {finalTranscript && (
            <button
              className="clear-button"
              onClick={clearTranscript}
              title={t('common.clear')}
            >
              <i className="trash-icon"></i>
              {t('common.clear')}
            </button>
          )}
        </div>
      )}
      
      {/* Indicatore stato */}
      {showStatus && (
        <div className="voice-status">
          {!state.supported ? (
            <div className="status-error">
              <i className="warning-icon"></i>
              {t('voice.notSupported')}
            </div>
          ) : state.error ? (
            <div className="status-error">
              <i className="warning-icon"></i>
              {state.error}
            </div>
          ) : state.isListening ? (
            <div className="status-listening">
              <div className={`listening-indicator ${showAudioFeedback ? 'active' : ''}`}>
                <div className="wave" style={{ height: `${audioLevel}%` }}></div>
              </div>
              {t('voice.listening')}
            </div>
          ) : (
            <div className="status-ready">
              {t('voice.ready')}
            </div>
          )}
        </div>
      )}
      
      {/* Area trascrizione */}
      <div className="transcript-area">
        {finalTranscript && (
          <div className="final-transcript">
            {finalTranscript}
          </div>
        )}
        
        {showInterimResults && interimTranscript && (
          <div className="interim-transcript">
            {interimTranscript}
          </div>
        )}
        
        {!finalTranscript && !interimTranscript && state.isListening && (
          <div className="transcript-placeholder">
            {t('voice.speakNow')}
          </div>
        )}
        
        {!finalTranscript && !interimTranscript && !state.isListening && (
          <div className="transcript-placeholder">
            {state.supported ? t('voice.clickToStart') : t('voice.notSupported')}
          </div>
        )}
      </div>
      
      {/* Stili CSS */}
      <style>
        {`
        .voice-recognition-container {
          font-family: Arial, sans-serif;
          padding: 15px;
          border-radius: 8px;
          background: #f5f7fa;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          width: 100%;
        }
        
        .voice-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .voice-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          border-radius: 20px;
          border: none;
          background: #4a6cf7;
          color: white;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .voice-button:hover {
          background: #3452d9;
        }
        
        .voice-button.active {
          background: #e53935;
        }
        
        .voice-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .clear-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          border-radius: 20px;
          border: none;
          background: #f0f0f0;
          color: #555;
          cursor: pointer;
        }
        
        .clear-button:hover {
          background: #e0e0e0;
        }
        
        .voice-status {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          height: 30px;
        }
        
        .status-error {
          color: #e53935;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .status-listening {
          color: #4a6cf7;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .status-ready {
          color: #666;
        }
        
        .listening-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #eef2ff;
          position: relative;
          overflow: hidden;
        }
        
        .listening-indicator.active {
          background: #d4e2ff;
        }
        
        .listening-indicator .wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #4a6cf7;
          transition: height 0.2s ease-out;
        }
        
        .transcript-area {
          min-height: 100px;
          max-height: 300px;
          overflow-y: auto;
          padding: 15px;
          border-radius: 8px;
          background: white;
          border: 1px solid #e0e0e0;
        }
        
        .final-transcript {
          color: #333;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        
        .interim-transcript {
          color: #666;
          font-style: italic;
        }
        
        .transcript-placeholder {
          color: #aaa;
          font-style: italic;
        }
        
        /* Icone (rappresentate con emoji per semplicità) */
        .mic-icon:before {
          content: '🎤';
        }
        
        .stop-icon:before {
          content: '⏹️';
        }
        
        .trash-icon:before {
          content: '🗑️';
        }
        
        .warning-icon:before {
          content: '⚠️';
        }
        `}
      </style>
    </div>
  );
};

export default VoiceRecognitionUI;
