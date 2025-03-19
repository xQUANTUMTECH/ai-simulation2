/**
 * Componente per la visualizzazione e animazione di un avatar virtuale
 * Supporta sincronizzazione con audio, espressioni facciali e stati emotivi
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from '../../services/i18n-service.js';
import { useAvatarPerformance, useOptimizedMouthAnimation } from '../../hooks/useAvatarPerformance';

// Stati possibili dell'avatar
type AvatarState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'confused' | 'happy' | 'sad';
// Espressioni facciali disponibili
type FacialExpression = 'neutral' | 'smile' | 'frown' | 'surprised' | 'confused';

interface AudioConfig {
  volume?: number;
  speed?: number;
  pitch?: number;
}

interface AvatarComponentProps {
  avatarId?: string;
  avatarImageUrl?: string; 
  avatarName?: string;
  initialState?: AvatarState;
  audioUrl?: string;
  audioConfig?: AudioConfig;
  onAnimationComplete?: () => void;
  onAudioComplete?: () => void;
  className?: string;
  showControls?: boolean;
  expression?: FacialExpression;
  isDarkMode?: boolean;
}

const AvatarComponent: React.FC<AvatarComponentProps> = ({
  avatarId,
  avatarImageUrl = '/assets/avatars/default.png',
  avatarName,
  initialState = 'idle',
  audioUrl,
  audioConfig = { volume: 1.0, speed: 1.0, pitch: 1.0 },
  onAnimationComplete,
  onAudioComplete,
  className = '',
  showControls = false,
  expression = 'neutral',
  isDarkMode = false
}) => {
  // Stato corrente dell'avatar
  const [avatarState, setAvatarState] = useState<AvatarState>(initialState);
  // Espressione facciale corrente
  const [facialExpression, setFacialExpression] = useState<FacialExpression>(expression);
  // Flag per indicare se l'audio è in riproduzione
  const [isPlaying, setIsPlaying] = useState(false);
  // Flag per indicare se il componente è stato inizializzato
  const [isInitialized, setIsInitialized] = useState(false);
  // Valore corrente dell'animazione (0-100)
  const [animationValue, setAnimationValue] = useState(0);
  // Stato per tracciare errori audio
  const [audioError, setAudioError] = useState<string | null>(null);
  // Flag per indicare se l'audio è caricato
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  
  // Riferimenti
  const avatarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>(0);
  
  // Hook per traduzioni
  const { t } = useTranslation();

  // Hook per ottimizzazioni performance
  const { 
    settings: perfSettings, 
    styles: perfStyles, 
    deviceInfo,
    shouldUseLightweightMode 
  } = useAvatarPerformance();
  
  // Calcolo ottimizzato animazione bocca
  const mouthAnimation = useOptimizedMouthAnimation(
    avatarState === 'speaking',
    animationValue
  );
  
  /**
   * Avvia l'animazione parlato con ottimizzazioni per le prestazioni
   * e migliorata sincronizzazione con l'audio
   */
  const startSpeakingAnimation = () => {
    if (avatarState !== 'speaking') {
      setAvatarState('speaking');
    }
    
    // Implementazione animazione con requestAnimationFrame ottimizzata
    let startTime: number | null = null;
    const duration = 2000; // Durata dell'animazione in ms
    
    // Usa l'intervallo di aggiornamento ottimizzato per le prestazioni
    const updateInterval = perfSettings.mouthAnimationUpdateRate;
    let lastUpdateTime = 0;
    
    // Analizza l'audio per migliorare la sincronizzazione
    let audioAnalyzer: (() => number) | null = null;
    if (audioRef.current && window.AudioContext && perfSettings.animationQuality > 1) {
      try {
        // Crea un AudioContext per analizzare l'audio se supportato
        const audioContext = new window.AudioContext();
        const mediaElement = audioRef.current;
        const source = audioContext.createMediaElementSource(mediaElement);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // Prepara l'array per i dati di frequenza
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Funzione per analizzare l'audio
        audioAnalyzer = () => {
          analyser.getByteFrequencyData(dataArray);
          // Calcola il valore medio (per la bocca)
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          return sum / bufferLength;
        };
      } catch (error) {
        console.warn('Audio analysis not supported:', error);
        // Fallback al metodo standard
      }
    }
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Throttling basato sulle prestazioni del dispositivo
      if (timestamp - lastUpdateTime >= updateInterval) {
        lastUpdateTime = timestamp;
        
        let value;
        // Se abbiamo l'analizzatore audio, usa quello
        if (audioAnalyzer) {
          try {
            // Ottieni dati in tempo reale dall'audio
            const audioLevel = audioAnalyzer();
            // Mappa il valore audio (0-255) a valori di animazione (0-100)
            value = Math.min(100, audioLevel * 0.4);
          } catch (e) {
            // Fallback all'animazione sinusoidale standard
            value = 50 + 40 * Math.sin(elapsed / 150);
          }
        } else {
          // Animazione standard basata sulla qualità delle prestazioni
          if (perfSettings.animationQuality === 1) {
            // Versione semplificata per prestazioni basse
            value = 50 + 30 * Math.sin(elapsed / 200);
          } else if (perfSettings.animationQuality === 2) {
            // Versione media
            value = 50 + 40 * Math.sin(elapsed / 150);
          } else {
            // Versione completa per prestazioni alte
            value = 50 + 50 * Math.sin(elapsed / 150) * (0.8 + 0.2 * Math.sin(elapsed / 50));
          }
        }
        
        setAnimationValue(value);
      }
      
      if (elapsed < duration && isPlaying) {
        // Continua l'animazione finché l'audio è in riproduzione
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Termina l'animazione
        setAnimationValue(0);
        if (avatarState === 'speaking') {
          setAvatarState('idle');
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      }
    };
    
    // Avvia il loop di animazione
    animationRef.current = requestAnimationFrame(animate);
  };
  
  /**
   * Ferma l'animazione parlato
   */
  const stopSpeakingAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    
    setAnimationValue(0);
    if (avatarState === 'speaking') {
      setAvatarState('idle');
    }
  };
  
  /**
   * Gestisce il cambio di stato dell'avatar
   */
  useEffect(() => {
    if (avatarState === 'speaking' && !isPlaying && audioUrl && isAudioLoaded) {
      // Se l'avatar deve parlare ma l'audio non è in riproduzione, avvialo
      if (audioRef.current) {
        audioRef.current.play().catch(error => {
          console.error('Errore nella riproduzione audio:', error);
          setAudioError(`Errore riproduzione: ${error.message}`);
          stopSpeakingAnimation();
        });
      }
    } else if (avatarState === 'listening') {
      // Implementa animazione ascolto
      setFacialExpression('neutral');
    } else if (avatarState === 'thinking') {
      // Implementa animazione pensiero
      setFacialExpression('confused');
    } else if (avatarState === 'confused') {
      setFacialExpression('confused');
    } else if (avatarState === 'happy') {
      setFacialExpression('smile');
    } else if (avatarState === 'sad') {
      setFacialExpression('frown');
    }
  }, [avatarState, audioUrl, isPlaying, isAudioLoaded]);
  
  /**
   * Gestisce il cambio dell'URL audio
   */
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      // Reset stato caricamento audio
      setIsAudioLoaded(false);
      setAudioError(null);
      
      // Configura l'elemento audio
      audioRef.current.src = audioUrl;
      audioRef.current.volume = audioConfig.volume || 1.0;
      audioRef.current.playbackRate = audioConfig.speed || 1.0;
      
      // Precarica l'audio
      audioRef.current.load();
    }
  }, [audioUrl, audioConfig]);
  
  /**
   * Gestisce eventi audio
   */
  useEffect(() => {
    const audioElement = audioRef.current;
    
    if (!audioElement) return;
    
    const handlePlay = () => {
      setIsPlaying(true);
      setAudioError(null);
      startSpeakingAnimation();
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      stopSpeakingAnimation();
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      stopSpeakingAnimation();
      
      if (onAudioComplete) {
        onAudioComplete();
      }
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e);
      setAudioError(`Errore audio: ${e.message || 'Errore sconosciuto'}`);
      setIsPlaying(false);
      stopSpeakingAnimation();
    };
    
    const handleLoadedData = () => {
      setIsAudioLoaded(true);
      setAudioError(null);
      
      // Avvia automaticamente l'audio se l'avatar è in stato speaking
      if (avatarState === 'speaking') {
        audioElement.play().catch(error => {
          console.error('Errore avvio automatico audio:', error);
          setAudioError(`Errore avvio: ${error.message}`);
        });
      }
    };
    
    // Aggiungi event listeners
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError as EventListener);
    audioElement.addEventListener('loadeddata', handleLoadedData);
    
    // Cleanup
    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError as EventListener);
      audioElement.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [onAudioComplete, avatarState]);
  
  /**
   * Inizializzazione e cleanup
   */
  useEffect(() => {
    setIsInitialized(true);
    
    // Cleanup quando il componente viene smontato
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);
  
  /**
   * Aggiornamento espressione quando cambia la prop expression
   */
  useEffect(() => {
    setFacialExpression(expression);
  }, [expression]);
  
  /**
   * Funzioni di utility per stato avatar
   */
  const playAudio = () => {
    if (audioRef.current && audioUrl && isAudioLoaded) {
      setAvatarState('speaking');
      audioRef.current.play().catch(error => {
        console.error('Errore nella riproduzione audio:', error);
        setAudioError(`Errore riproduzione: ${error.message}`);
      });
    } else if (audioUrl && !isAudioLoaded) {
      // Se l'audio non è ancora caricato, imposta lo stato speaking
      // e il listener handleLoadedData si occuperà di avviare l'audio
      setAvatarState('speaking');
    }
  };
  
  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
  };
  
  const setAvatarExpression = (newExpression: FacialExpression) => {
    setFacialExpression(newExpression);
  };
  
  /**
   * Rendering dell'avatar con espressione facciale
   */
  return (
    <div 
      className={`avatar-container ${className} ${isDarkMode ? 'dark-mode' : ''}`}
      ref={avatarRef}
      data-testid="avatar-component"
    >
      <div className={`avatar-wrapper state-${avatarState} expression-${facialExpression}`}>
        <div className="avatar-display">
          {/* Avatar principale */}
          <div className="avatar-image" style={{
            ...perfStyles.avatarContainer,
            willChange: perfSettings.useGpuAcceleration ? 'transform' : 'auto'
          }}>
            <img 
              src={avatarImageUrl}
              alt={avatarName || t('common.avatar')}
              className="avatar-main-image"
              style={perfStyles.avatarImage}
              data-testid="avatar-img"
            />
            
            {/* Overlay bocca animata - ottimizzato per le performance */}
            {avatarState === 'speaking' && (
              <div 
                className="mouth-animation-overlay" 
                style={{ 
                  height: `${animationValue * 0.3}%`,
                  opacity: animationValue / 100,
                  transition: `height ${perfSettings.mouthAnimationUpdateRate}ms ease`,
                  // Applica stili di performance dal hook
                  ...perfStyles.mouthAnimation,
                  // Usa GPU acceleration se disponibile
                  transform: perfSettings.useGpuAcceleration ? 'translateZ(0)' : '',
                  willChange: perfSettings.useGpuAcceleration ? 'height, opacity' : 'auto'
                }}
                data-testid="mouth-animation"
              ></div>
            )}
            
            {/* Overlay espressione facciale */}
            <div 
              className={`expression-overlay expression-${facialExpression}`}
              data-testid="expression-overlay"
            ></div>
          </div>
          
          {/* Nome avatar */}
          {avatarName && (
            <div className="avatar-name">{avatarName}</div>
          )}
          
          {/* Indicatore stato */}
          <div 
            className={`avatar-status-indicator state-${avatarState}`}
            data-testid="avatar-status"
          >
            {avatarState === 'speaking' && (
              <div className="speaking-indicator">
                <div className="sound-wave">
                  <span style={{ height: `${20 + animationValue * 0.6}%` }}></span>
                  <span style={{ height: `${30 + animationValue * 0.5}%` }}></span>
                  <span style={{ height: `${50 + animationValue * 0.5}%` }}></span>
                  <span style={{ height: `${40 + animationValue * 0.6}%` }}></span>
                  <span style={{ height: `${20 + animationValue * 0.4}%` }}></span>
                </div>
              </div>
            )}
            
            {avatarState === 'listening' && (
              <div className="listening-indicator">
                <div className="mic-icon"></div>
                <div className="pulse-animation"></div>
              </div>
            )}
            
            {avatarState === 'thinking' && (
              <div className="thinking-indicator">
                <div className="dots-loader">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
          
          {/* Indicatore errore audio */}
          {audioError && (
            <div className="audio-error-message" data-testid="audio-error">
              <div className="error-icon">⚠️</div>
              <p>{audioError}</p>
            </div>
          )}
        </div>
        
        {/* Controlli avatar (opzionali) */}
        {showControls && (
          <div className="avatar-controls" data-testid="avatar-controls">
            <button 
              onClick={playAudio} 
              disabled={!audioUrl || isPlaying}
              title={t('avatar.playAudio')}
              className="avatar-control-button"
              data-testid="play-button"
            >
              <i className="play-icon"></i>
              {t('avatar.speak')}
            </button>
            
            <button 
              onClick={pauseAudio} 
              disabled={!isPlaying}
              title={t('avatar.pauseAudio')}
              className="avatar-control-button"
              data-testid="pause-button"
            >
              <i className="pause-icon"></i>
              {t('avatar.pause')}
            </button>
            
            <div className="expression-controls">
              <button 
                onClick={() => setAvatarExpression('smile')}
                title={t('avatar.expressionSmile')}
                className={`expression-button ${facialExpression === 'smile' ? 'active' : ''}`}
                data-testid="smile-button"
              >
                <i className="smile-icon">😊</i>
              </button>
              <button 
                onClick={() => setAvatarExpression('neutral')}
                title={t('avatar.expressionNeutral')}
                className={`expression-button ${facialExpression === 'neutral' ? 'active' : ''}`}
                data-testid="neutral-button"
              >
                <i className="neutral-icon">😐</i>
              </button>
              <button 
                onClick={() => setAvatarExpression('confused')}
                title={t('avatar.expressionConfused')}
                className={`expression-button ${facialExpression === 'confused' ? 'active' : ''}`}
                data-testid="confused-button"
              >
                <i className="confused-icon">😕</i>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Elemento audio nascosto */}
      <audio ref={audioRef} style={{ display: 'none' }} preload="auto" />
      
      {/* Stili CSS */}
      <style>
        {`
        .avatar-container {
          width: 300px;
          font-family: Arial, sans-serif;
        }
        
        .avatar-container.dark-mode {
          --avatar-bg: #2a2a2a;
          --avatar-text: #fff;
          --avatar-controls-bg: #333;
          --avatar-controls-hover: #444;
          --avatar-border: #444;
        }
        
        .avatar-container:not(.dark-mode) {
          --avatar-bg: #f5f5f5;
          --avatar-text: #333;
          --avatar-controls-bg: #e0e0e0;
          --avatar-controls-hover: #d0d0d0;
          --avatar-border: #ddd;
        }
        
        .avatar-wrapper {
          background: var(--avatar-bg);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--avatar-border);
          color: var(--avatar-text);
        }
        
        .avatar-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        
        .avatar-image {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          margin-bottom: 10px;
        }
        
        .avatar-main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .avatar-name {
          font-size: 18px;
          font-weight: 500;
          margin-top: 10px;
        }
        
        .mouth-animation-overlay {
          position: absolute;
          bottom: 25%;
          left: 50%;
          transform: translateX(-50%);
          width: 30%;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          transition: height 0.05s ease;
        }
        
        .expression-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        
        .avatar-status-indicator {
          margin-top: 15px;
          height: 30px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .audio-error-message {
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.5);
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #dc3545;
          max-width: 100%;
          text-align: left;
        }
        
        .audio-error-message .error-icon {
          font-size: 16px;
        }
        
        .speaking-indicator .sound-wave {
          display: flex;
          align-items: center;
          height: 30px;
        }
        
        .speaking-indicator .sound-wave span {
          display: block;
          width: 4px;
          margin: 0 2px;
          background: #4a6cf7;
          border-radius: 3px;
          transition: height 0.2s ease;
        }
        
        .listening-indicator {
          display: flex;
          align-items: center;
        }
        
        .listening-indicator .mic-icon {
          width: 16px;
          height: 16px;
          background: #e53935;
          border-radius: 50%;
          position: relative;
        }
        
        .listening-indicator .mic-icon:before {
          content: '🎤';
        }
        
        .listening-indicator .pulse-animation {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 2px solid #e53935;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        .thinking-indicator .dots-loader {
          display: flex;
          align-items: center;
        }
        
        .thinking-indicator .dots-loader span {
          width: 6px;
          height: 6px;
          margin: 0 3px;
          background: #4a6cf7;
          border-radius: 50%;
          animation: dots 1.4s infinite ease-in-out;
        }
        
        .thinking-indicator .dots-loader span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .thinking-indicator .dots-loader span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .thinking-indicator .dots-loader span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes dots {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        .avatar-controls {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
        }
        
        .avatar-control-button {
          padding: 8px 16px;
          border-radius: 20px;
          border: none;
          background: var(--avatar-controls-bg);
          color: var(--avatar-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }
        
        .avatar-control-button:hover:not(:disabled) {
          background: var(--avatar-controls-hover);
          transform: translateY(-2px);
        }
        
        .avatar-control-button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .avatar-control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .avatar-control-button i {
          font-size: 16px;
        }
        
        .expression-controls {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          width: 100%;
          justify-content: center;
        }
        
        .expression-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: var(--avatar-controls-bg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, transform 0.1s ease;
        }
        
        .expression-button.active {
          background: #4a6cf7;
          color: white;
        }
        
        .expression-button:hover:not(.active) {
          background: var(--avatar-controls-hover);
          transform: translateY(-2px);
        }
        
        .expression-button:active:not(.active) {
          transform: translateY(0);
        }
        `}
      </style>
    </div>
  );
};

export default AvatarComponent;
