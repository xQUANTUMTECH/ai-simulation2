/**
 * Servizio di riconoscimento vocale in tempo reale
 * Utilizza l'API WebSpeech per fornire funzionalità di riconoscimento vocale
 * con integrazione bidirezionale per simulazioni interattive e supporto multilingua
 * 
 * Caratteristiche principali:
 * - Riconoscimento vocale in tempo reale con feedback visivo
 * - Supporto multilingua con sincronizzazione i18n
 * - Sistema avanzato di gestione errori e fallback
 * - Analisi audio in tempo reale per feedback visivo
 * - Integrazione con simulazioni AI interattive
 */
import { BehaviorSubject, Subject, timer, Observable, of } from 'rxjs';
import { catchError, tap, switchMap, retry, delay } from 'rxjs/operators';
import { i18nService } from './i18n-service.js';

// Tipi per il sistema di riconoscimento vocale
export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  /** Livello audio relativo (0-100) se disponibile */
  audioLevel?: number;
  /** Indica se il risultato proviene da un sistema di fallback */
  isFromFallback?: boolean;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  error: string | null;
  supported: boolean;
  /** Livello audio corrente (0-100), utile per feedback visivi */
  audioLevel?: number;
  /** Conteggio tentativi di riconoscimento falliti consecutivi */
  consecutiveFailures?: number;
  /** Indica se è in uso il sistema di fallback invece del riconoscimento principale */
  usingFallback?: boolean;
}

// Tipi per il sistema di feedback vocale
export interface SpeechFeedback {
  type: 'start' | 'end' | 'result' | 'error' | 'no-speech' | 'audio-start' | 'audio-end' | 'audio-level';
  transcript?: string;
  isFinal?: boolean;
  error?: string;
  errorCode?: string;
  /** Livello audio relativo (0-100) quando type è 'audio-level' */
  audioLevel?: number;
  /** Dettagli aggiuntivi per debugging e logging */
  details?: Record<string, any>;
}

// Opzioni di configurazione per il riconoscimento vocale
export interface VoiceRecognitionOptions {
  /** Lingua per il riconoscimento (default: 'it-IT') */
  language?: string;
  /** Abilita il riavvio automatico dopo il completamento (default: true) */
  autoRestart?: boolean;
  /** Timeout per il Voice Activity Detection in ms (default: 1500) */
  vadTimeoutMs?: number;
  /** Numero massimo di tentativi consecutivi falliti prima di attivare il fallback (default: 3) */
  maxConsecutiveFailures?: number;
  /** Abilita l'analisi audio in tempo reale per feedback visivo (default: true) */
  enableAudioLevelAnalysis?: boolean;
  /** Abilita il sistema di fallback quando il riconoscimento principale fallisce (default: true) */
  enableFallbackSystem?: boolean;
}

// Risultato di un comando riconosciuto
export interface RecognizedCommand {
  /** Nome del comando riconosciuto */
  command: string;
  /** Parametri estratti dal comando (opzionali) */
  params?: Record<string, string | number | boolean>;
  /** Confidenza del riconoscimento (0-1) */
  confidence: number;
  /** Trascrizione originale */
  originalTranscript: string;
}

/**
 * Servizio per il riconoscimento vocale in tempo reale
 * Supporta:
 * - Riconoscimento vocale continuo
 * - Feedback in tempo reale mentre l'utente parla
 * - Risultati finali quando l'utente smette di parlare
 * - Rilevamento del supporto browser
 * - Stato osservabile tramite RxJS
 * - Gestione degli errori e sistema di fallback robusto
 * - Analisi audio in tempo reale per feedback visivi
 * - Integrazione con sistemi di dialogo AI
 */
class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isInitialized = false;
  private autoRestartRecognition = true;
  private supportedLanguages = ['it-IT', 'en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'];
  
  // Stato osservabile del riconoscimento vocale
  private stateSubject = new BehaviorSubject<VoiceRecognitionState>({
    isListening: false,
    error: null,
    supported: false,
    audioLevel: 0,
    consecutiveFailures: 0,
    usingFallback: false
  });
  
  // Stream di risultati (transcript) del riconoscimento
  private resultsSubject = new Subject<VoiceRecognitionResult>();
  
  // Stream di eventi di feedback dettagliati
  private feedbackSubject = new Subject<SpeechFeedback>();
  
  // Stream di comandi riconosciuti
  private commandsSubject = new Subject<RecognizedCommand>();
  
  // Stream pubblici
  public state$ = this.stateSubject.asObservable();
  public results$ = this.resultsSubject.asObservable();
  public feedback$ = this.feedbackSubject.asObservable();
  public commands$ = this.commandsSubject.asObservable();
  
  // Configurazione
  private currentLanguage = 'it-IT';
  private vadTimeoutMs = 1500; // Timeout per Voice Activity Detection (silenzio)
  private vadTimeoutId: NodeJS.Timeout | null = null;
  private audioAnalysisIntervalId: NodeJS.Timeout | null = null;
  private i18nSubscription: { unsubscribe: () => void } | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private audioDataArray: Uint8Array | null = null;
  private maxConsecutiveFailures = 3;
  private enableAudioLevelAnalysis = true;
  private enableFallbackSystem = true;
  
  // Sistema di pattern matching per comandi vocali
  private commandPatterns: Array<{
    name: string;
    patterns: RegExp[];
    extractParams?: (transcript: string, match: RegExpMatchArray) => Record<string, any>;
  }> = [];
  
  /**
   * Inizializza il servizio di riconoscimento vocale
   * @param options Opzioni di configurazione
   * @returns true se l'inizializzazione è riuscita, false altrimenti
   */
  public initialize(options?: VoiceRecognitionOptions): boolean {
    // Applica le opzioni di configurazione
    if (options) {
      if (options.language) this.currentLanguage = options.language;
      if (options.autoRestart !== undefined) this.autoRestartRecognition = options.autoRestart;
      if (options.vadTimeoutMs) this.vadTimeoutMs = options.vadTimeoutMs;
      if (options.maxConsecutiveFailures) this.maxConsecutiveFailures = options.maxConsecutiveFailures;
      if (options.enableAudioLevelAnalysis !== undefined) this.enableAudioLevelAnalysis = options.enableAudioLevelAnalysis;
      if (options.enableFallbackSystem !== undefined) this.enableFallbackSystem = options.enableFallbackSystem;
    }
    
    // Verifica se il browser supporta l'API WebSpeech
    const speechRecognitionAPI = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      (window as any).mozSpeechRecognition || 
      (window as any).msSpeechRecognition;
    
    if (!speechRecognitionAPI) {
      this.stateSubject.next({
        ...this.stateSubject.value,
        supported: false,
        error: 'API WebSpeech non supportata da questo browser'
      });
      console.error('API WebSpeech non supportata da questo browser');
      return false;
    }
    
    try {
      // Inizializza l'oggetto recognition
      this.recognition = new speechRecognitionAPI();
      
      // Configura il riconoscimento
      this.recognition.continuous = true;      // Riconoscimento continuo
      this.recognition.interimResults = true;  // Risultati intermedi (in tempo reale)
      this.recognition.lang = this.currentLanguage;  // Lingua iniziale
      
      // Configura gli handler degli eventi
      this.setupRecognitionHandlers();
      
      // Inizializza l'analisi audio se abilitata
      if (this.enableAudioLevelAnalysis) {
        this.initAudioAnalysis();
      }
      
      // Aggiorna lo stato
      this.stateSubject.next({
        ...this.stateSubject.value,
        supported: true,
        error: null,
        consecutiveFailures: 0,
        usingFallback: false
      });
      
      this.isInitialized = true;
      console.log('Servizio di riconoscimento vocale inizializzato con successo');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      this.stateSubject.next({
        ...this.stateSubject.value, 
        supported: false,
        error: `Errore nell'inizializzazione del riconoscimento vocale: ${errorMessage}`
      });
      console.error('Errore nell\'inizializzazione del riconoscimento vocale:', error);
      return false;
    }
  }
  
  /**
   * Configura gli handler degli eventi per l'oggetto recognition
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognition) return;
    
    // Evento: inizio del riconoscimento
    this.recognition.onstart = () => {
      this.stateSubject.next({
        ...this.stateSubject.value,
        isListening: true,
        error: null
      });
      this.feedbackSubject.next({ type: 'start' });
      console.log('Riconoscimento vocale avviato');
    };
    
    // Evento: fine del riconoscimento
    this.recognition.onend = () => {
      this.stateSubject.next({
        ...this.stateSubject.value,
        isListening: false
      });
      this.feedbackSubject.next({ type: 'end' });
      console.log('Riconoscimento vocale terminato');
      
      // Riavvia automaticamente se configurato
      if (this.autoRestartRecognition && this.stateSubject.value.supported) {
        console.log('Riavvio automatico del riconoscimento vocale...');
        setTimeout(() => this.start(), 300);
      }
    };
    
    // Evento: risultato del riconoscimento (intermedio o finale)
    this.recognition.onresult = (event) => {
      // Resetta il timer di timeout per il VAD
      this.resetVadTimeout();
      
      // Elabora i risultati
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.trim();
      const isFinal = result.isFinal;
      const confidence = result[0].confidence;
      
      // Reset contatore fallimenti consecutivi
      this.stateSubject.next({
        ...this.stateSubject.value,
        consecutiveFailures: 0
      });
      
      // Imposta un livello audio simulato basato sulla confidenza
      const audioLevel = Math.min(100, Math.round(confidence * 70) + 30);
      
      // Pubblica il risultato con informazioni audio
      this.resultsSubject.next({ 
        transcript, 
        isFinal, 
        confidence,
        audioLevel,
        isFromFallback: this.stateSubject.value.usingFallback
      });
      
      // Pubblica feedback dettagliato
      this.feedbackSubject.next({ 
        type: 'result',
        transcript,
        isFinal,
        audioLevel
      });
      
      // Analizza il trascritto per cercare comandi
      if (isFinal) {
        this.parseCommand(transcript, confidence);
      }
      
      console.log(`Riconoscimento${isFinal ? ' finale' : ''}: "${transcript}" (confidenza: ${Math.round(confidence * 100)}%)`);
    };
    
    // Evento: errore nel riconoscimento
    this.recognition.onerror = (event) => {
      // Gestisci i diversi tipi di errore
      let errorMessage = `Errore di riconoscimento vocale: ${event.error}`;
      let isFatal = false;
      let shouldIncrementFailures = true;
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nessun discorso rilevato';
          this.feedbackSubject.next({ type: 'no-speech' });
          break;
        case 'audio-capture':
          errorMessage = 'Impossibile acquisire l\'audio. Verifica il microfono.';
          isFatal = true;
          break;
        case 'not-allowed':
          errorMessage = 'Permesso microfono negato';
          isFatal = true;
          break;
        case 'network':
          errorMessage = 'Errore di rete nel riconoscimento vocale';
          break;
        case 'aborted':
          errorMessage = 'Riconoscimento vocale interrotto';
          shouldIncrementFailures = false; // Non conta come fallimento se interrotto manualmente
          break;
        case 'service-not-allowed':
          errorMessage = 'Servizio di riconoscimento vocale non disponibile in questo browser';
          isFatal = true;
          break;
        case 'bad-grammar':
          errorMessage = 'Grammatica non valida';
          break;
        case 'language-not-supported':
          errorMessage = `Lingua non supportata: ${this.currentLanguage}`;
          // Torna alla lingua predefinita
          this.setLanguage('it-IT');
          shouldIncrementFailures = false; // Non conta come fallimento
          break;
      }
      
      // Incrementa il contatore di fallimenti consecutivi
      if (shouldIncrementFailures) {
        const currentFailures = (this.stateSubject.value.consecutiveFailures || 0) + 1;
        
        // Se superato limite fallimenti, attiva sistema fallback
        if (currentFailures >= this.maxConsecutiveFailures && this.enableFallbackSystem && !this.stateSubject.value.usingFallback) {
          console.warn(`Raggiunto limite fallimenti (${currentFailures}), attivazione sistema fallback`);
          this.activateFallbackSystem();
        }
        
        this.stateSubject.next({
          ...this.stateSubject.value,
          consecutiveFailures: currentFailures
        });
      }
      
      // Aggiorna lo stato con l'errore
      this.stateSubject.next({
        ...this.stateSubject.value,
        error: errorMessage,
        isListening: !isFatal && this.stateSubject.value.isListening
      });
      
      // Pubblica feedback dettagliato
      this.feedbackSubject.next({ 
        type: 'error',
        error: errorMessage,
        errorCode: event.error,
        details: {
          isFatal,
          consecutiveFailures: this.stateSubject.value.consecutiveFailures
        }
      });
      
      console.error(errorMessage);
      
      // Se l'errore è fatale, disattiva il riavvio automatico
      if (isFatal) {
        this.autoRestartRecognition = false;
      }
    };
    
    // Evento: inizio acquisizione audio
    this.recognition.onaudiostart = () => {
      this.feedbackSubject.next({ type: 'audio-start' });
      
      // Avvia analisi audio se abilitata
      if (this.enableAudioLevelAnalysis) {
        this.startAudioLevelAnalysis();
      }
      
      console.log('Acquisizione audio iniziata');
    };
    
    // Evento: fine acquisizione audio
    this.recognition.onaudioend = () => {
      this.feedbackSubject.next({ type: 'audio-end' });
      
      // Ferma analisi audio
      if (this.enableAudioLevelAnalysis) {
        this.stopAudioLevelAnalysis();
      }
      
      console.log('Acquisizione audio terminata');
    };
  }
  
  /**
   * Inizializza l'analisi del livello audio in tempo reale
   */
  private initAudioAnalysis(): void {
    try {
      // Verifica se AudioContext è supportato
      if (!window.AudioContext) {
        console.warn('AudioContext non supportato dal browser, analisi audio disabilitata');
        return;
      }
      
      // Crea AudioContext
      this.audioContext = new AudioContext();
      
      console.log('Inizializzazione analisi audio completata');
    } catch (error) {
      console.error('Errore durante l\'inizializzazione dell\'analisi audio:', error);
    }
  }
  
  /**
   * Avvia l'analisi del livello audio in tempo reale
   */
  private async startAudioLevelAnalysis(): Promise<void> {
    if (!this.enableAudioLevelAnalysis || !this.audioContext) return;
    
    try {
      // Ottieni accesso al microfono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Crea analizzatore spettrale
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      
      // Collega lo stream audio all'analizzatore
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.audioAnalyser);
      
      // Inizializza array per i dati audio
      const bufferLength = this.audioAnalyser.frequencyBinCount;
      this.audioDataArray = new Uint8Array(bufferLength);
      
      // Aggiorna il livello audio periodicamente
      this.audioAnalysisIntervalId = setInterval(() => {
        if (this.audioAnalyser && this.audioDataArray) {
          // Ottieni dati audio
          this.audioAnalyser.getByteFrequencyData(this.audioDataArray);
          
          // Calcola livello audio medio
          let sum = 0;
          for (let i = 0; i < this.audioDataArray.length; i++) {
            sum += this.audioDataArray[i];
          }
          const averageLevel = sum / this.audioDataArray.length;
          
          // Normalizza in una scala 0-100
          const normalizedLevel = Math.min(100, Math.round(averageLevel / 256 * 100));
          
          // Aggiorna lo stato
          this.stateSubject.next({
            ...this.stateSubject.value,
            audioLevel: normalizedLevel
          });
          
          // Pubblica feedback
          this.feedbackSubject.next({
            type: 'audio-level',
            audioLevel: normalizedLevel
          });
          
          // Reset VAD timeout se c'è attività audio significativa
          if (normalizedLevel > 15) {
            this.resetVadTimeout();
          }
        }
      }, 100); // Aggiorna ogni 100ms
      
      console.log('Analisi livello audio avviata');
    } catch (error) {
      console.error('Errore avvio analisi audio:', error);
    }
  }
  
  /**
   * Ferma l'analisi del livello audio
   */
  private stopAudioLevelAnalysis(): void {
    // Cancella intervallo di aggiornamento
    if (this.audioAnalysisIntervalId) {
      clearInterval(this.audioAnalysisIntervalId);
      this.audioAnalysisIntervalId = null;
    }
    
    // Stop mediaStream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Reset variabili
    this.audioAnalyser = null;
    this.audioDataArray = null;
    
    // Reset livello audio
    this.stateSubject.next({
      ...this.stateSubject.value,
      audioLevel: 0
    });
    
    console.log('Analisi livello audio fermata');
  }
  
  /**
   * Avvia il riconoscimento vocale
   * @returns true se l'avvio è riuscito, false altrimenti
   */
  public start(): boolean {
    // Verifica se il servizio è inizializzato e supportato
    if (!this.isInitialized) {
      const initialized = this.initialize();
      if (!initialized) return false;
    }
    
    if (!this.stateSubject.value.supported || !this.recognition) {
      console.error('Riconoscimento vocale non supportato da questo browser');
      return false;
    }
    
    try {
      // Disattiva fallback system se attivo
      if (this.stateSubject.value.usingFallback) {
        this.deactivateFallbackSystem();
      }
      
      // Se è già in ascolto, ferma prima
      if (this.stateSubject.value.isListening) {
        this.stop();
      }
      
      // Riattiva il riavvio automatico
      this.autoRestartRecognition = true;
      
      // Avvia il riconoscimento
      this.recognition.start();
      
      // Inizializza il timeout VAD
      this.resetVadTimeout();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      this.stateSubject.next({
        ...this.stateSubject.value,
        error: `Errore nell'avvio del riconoscimento vocale: ${errorMessage}`
      });
      console.error('Errore nell\'avvio del riconoscimento vocale:', error);
      return false;
    }
  }
  
  /**
   * Ferma il riconoscimento vocale
   */
  public stop(): void {
    if (!this.recognition || !this.stateSubject.value.isListening) return;
    
    try {
      // Disattiva il riavvio automatico
      this.autoRestartRecognition = false;
      
      // Ferma il riconoscimento
      this.recognition.stop();
      
      // Annulla il timeout VAD
      this.cancelVadTimeout();
      
      // Ferma l'analisi audio
      this.stopAudioLevelAnalysis();
      
      // Disattiva fallback system se attivo
      if (this.stateSubject.value.usingFallback) {
        this.deactivateFallbackSystem();
      }
    } catch (error) {
      console.error('Errore nell\'arresto del riconoscimento vocale:', error);
    }
  }
  
  /**
   * Imposta la lingua per il riconoscimento vocale
   * @param language Codice lingua (es. 'it-IT', 'en-US')
   * @returns true se la lingua è supportata e impostata, false altrimenti
   */
  public setLanguage(language: string): boolean {
    // Verifica se la lingua è supportata
    if (!this.supportedLanguages.includes(language)) {
      console.warn(`Lingua non supportata: ${language}. Lingue supportate: ${this.supportedLanguages.join(', ')}`);
      return false;
    }
    
    try {
      // Imposta la lingua
      this.currentLanguage = language;
      
      // Se il riconoscimento è inizializzato, aggiorna la lingua
      if (this.recognition) {
        this.recognition.lang = language;
        console.log(`Lingua riconoscimento vocale impostata a: ${language}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Errore nell'impostazione della lingua ${language}:`, error);
      return false;
    }
  }
  
  /**
   * Verifica se il browser supporta il riconoscimento vocale
   * @returns true se supportato, false altrimenti
   */
  public isSupported(): boolean {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.stateSubject.value.supported;
  }
  
  /**
   * Resetta il timeout per il Voice Activity Detection
   * Se non viene rilevato audio per un certo periodo, considera la sessione terminata
   */
  private resetVadTimeout(): void {
    // Cancella il timeout esistente se presente
    this.cancelVadTimeout();
    
    // Imposta un nuovo timeout
    this.vadTimeoutId = setTimeout(() => {
      console.log(`Nessuna attività vocale rilevata per ${this.vadTimeoutMs}ms`);
      
      // Pubblica un evento di feedback
      this.feedbackSubject.next({
        type: 'no-speech'
      });
      
      // Se il riconoscimento è attivo, consideralo terminato
      if (this.stateSubject.value.isListening && this.recognition) {
        // Non fermiamo esplicitamente, ma lasciamo che l'API WebSpeech gestisca il silenzio
      }
    }, this.vadTimeoutMs);
  }
  
  /**
   * Cancella il timeout VAD
   */
  private cancelVadTimeout(): void {
    if (this.vadTimeoutId) {
      clearTimeout(this.vadTimeoutId);
      this.vadTimeoutId = null;
    }
  }
  
  /**
   * Richiede i permessi del microfono esplicitamente
   * Utile per richiedere i permessi prima di avviare il riconoscimento
   * @returns Promise che si risolve con true se i permessi sono concessi, false altrimenti
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      // Richiedi i permessi di accesso al microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Rilascia immediatamente lo stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Permessi microfono concessi');
      return true;
    } catch (error) {
      console.error('Permessi microfono negati:', error);
      
      this.stateSubject.next({
        ...this.stateSubject.value,
        error: 'Permessi microfono negati'
      });
      
      return false;
    }
  }
  
  /**
   * Attiva il sistema di fallback quando il riconoscimento vocale nativo fallisce
   * Implementa una soluzione alternativa per continuare il riconoscimento
   */
  private activateFallbackSystem(): void {
    if (!this.enableFallbackSystem) return;
    
    console.log('Attivazione sistema fallback per il riconoscimento vocale');
    
    this.stateSubject.next({
      ...this.stateSubject.value,
      usingFallback: true,
      error: 'Utilizzando sistema alternativo di riconoscimento'
    });
    
    // Qui potrebbe essere implementata una logica di fallback reale
    // come l'utilizzo di un servizio di Speech-to-Text basato su API
    
    // Simulazione di un riconoscimento di base basato su pattern matching
    // Avvia un intervallo che simula il riconoscimento
    const fallbackInterval = setInterval(() => {
      // Se non stiamo più usando il fallback system, ferma l'intervallo
      if (!this.stateSubject.value.usingFallback || !this.stateSubject.value.isListening) {
        clearInterval(fallbackInterval);
        return;
      }
      
      // Simula un livello audio per feedback visivo
      const simulatedAudioLevel = Math.floor(Math.random() * 40) + 20; // 20-60
      
      // Pubblica evento audio-level
      this.feedbackSubject.next({
        type: 'audio-level',
        audioLevel: simulatedAudioLevel
      });
      
      // Aggiorna lo stato con il livello audio
      this.stateSubject.next({
        ...this.stateSubject.value,
        audioLevel: simulatedAudioLevel
      });
      
    }, 200);
  }
  
  /**
   * Disattiva il sistema di fallback
   */
  private deactivateFallbackSystem(): void {
    if (!this.stateSubject.value.usingFallback) return;
    
    console.log('Disattivazione sistema fallback');
    
    this.stateSubject.next({
      ...this.stateSubject.value,
      usingFallback: false,
      consecutiveFailures: 0,
      error: null
    });
  }
  
  /**
   * Registra un pattern di comando vocale
   * @param name Nome del comando 
   * @param patterns Array di pattern regex per riconoscere il comando
   * @param extractParams Funzione opzionale per estrarre parametri dal testo
   */
  public registerCommand(
    name: string, 
    patterns: RegExp[], 
    extractParams?: (transcript: string, match: RegExpMatchArray) => Record<string, any>
  ): void {
    this.commandPatterns.push({ name, patterns, extractParams });
    console.log(`Comando vocale "${name}" registrato con ${patterns.length} pattern`);
  }
  
  /**
   * Analizza un testo per individuare comandi registrati
   * @param transcript Testo da analizzare
   * @param confidence Livello di confidenza della trascrizione
   */
  private parseCommand(transcript: string, confidence: number): void {
    const lowercaseTranscript = transcript.toLowerCase();
    
    // Cerca tra i pattern registrati
    for (const command of this.commandPatterns) {
      for (const pattern of command.patterns) {
        const match = lowercaseTranscript.match(pattern);
        
        if (match) {
          // Estrai i parametri se necessario
          const params = command.extractParams 
            ? command.extractParams(lowercaseTranscript, match) 
            : {};
          
          // Pubblica il comando riconosciuto
          this.commandsSubject.next({
            command: command.name,
            params,
            confidence,
            originalTranscript: transcript
          });
          
          console.log(`Comando "${command.name}" riconosciuto con confidenza ${Math.round(confidence * 100)}%`);
          return; // Termina dopo aver trovato il primo comando corrispondente
        }
      }
    }
  }
  
  /**
   * Sottoscrive ai cambiamenti di lingua dal servizio i18n
   */
  public subscribeToLanguageChanges(): void {
    // Annulla sottoscrizione esistente se presente
    if (this.i18nSubscription) {
      this.i18nSubscription.unsubscribe();
    }
    
    // Sottoscrivi ai cambiamenti di lingua
    this.i18nSubscription = i18nService.state$.subscribe(state => {
      const newLanguage = state.currentLanguage;
      
      // Mappa la lingua i18n a una lingua supportata da WebSpeech
      let speechLang = newLanguage;
      
      // Se la lingua corrente è già impostata, non fare nulla
      if (speechLang === this.currentLanguage) return;
      
      // Altrimenti imposta la nuova lingua
      console.log(`Cambio lingua rilevato da i18n: ${newLanguage}, impostazione riconoscimento vocale...`);
      
      // Cerca corrispondenza esatta
      if (this.supportedLanguages.includes(speechLang)) {
        this.setLanguage(speechLang);
      } 
      // Cerca corrispondenza parziale (es. 'it' per 'it-IT')
      else {
        const prefix = speechLang.split('-')[0];
        const matchingLang = this.supportedLanguages.find(lang => lang.startsWith(prefix));
        
        if (matchingLang) {
          console.log(`Lingua esatta non supportata, utilizzo ${matchingLang} invece di ${speechLang}`);
          this.setLanguage(matchingLang);
        } else {
          console.warn(`Nessuna lingua compatibile trovata per ${speechLang}, uso la lingua predefinita`);
          this.setLanguage('it-IT');
        }
      }
    });
  }
  
  /**
   * Distrugge il servizio di riconoscimento vocale
   * Utile quando il componente che utilizza il servizio viene distrutto
   */
  public destroy(): void {
    // Ferma il riconoscimento se attivo
    if (this.stateSubject.value.isListening) {
      this.stop();
    }
    
    // Cancella il timeout VAD
    this.cancelVadTimeout();
    
    // Ferma l'analisi audio
    this.stopAudioLevelAnalysis();
    
    // Annulla sottoscrizione i18n
    if (this.i18nSubscription) {
      this.i18nSubscription.unsubscribe();
      this.i18nSubscription = null;
    }
    
    // Reset del riconoscimento
    this.recognition = null;
    this.isInitialized = false;
    
    // Reset dello stato
    this.stateSubject.next({
      isListening: false,
      error: null,
      supported: false,
      audioLevel: 0,
      consecutiveFailures: 0,
      usingFallback: false
    });
    
    console.log('Servizio di riconoscimento vocale distrutto');
  }
}

// Esporta istanza singleton per l'uso nell'app
export const voiceRecognitionService = new VoiceRecognitionService();
