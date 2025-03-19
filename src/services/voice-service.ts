import { EventEmitter } from '../utils/event-emitter';
import { voiceCacheService } from './voice-cache-service';

// Aggiunta delle definizioni dei tipi mancanti
declare global {
  // Aggiungiamo la definizione dell'interfaccia SpeechRecognition per TypeScript
  interface SpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
  }

  interface Window {
    SpeechRecognition?: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new(): SpeechRecognition;
    };
  }
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

// Definizione di un'interfaccia per il servizio TTS
export interface TTSService {
  textToSpeech(text: string, options?: {
    voice?: string;
    language?: string;
    emotion?: string;
  }): Promise<ArrayBuffer>;
}

export interface VoiceConfig {
  language: string;
  voice?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry';
  emphasis?: 'none' | 'moderate' | 'strong';
  preserveContext?: boolean;
}

class VoiceService extends EventEmitter {
  private synthesis: SpeechSynthesis;
  private recognition: SpeechRecognition | null = null;
  private ttsService: TTSService | null = null;
  private isListening: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private emotionSettings: Map<string, Partial<VoiceConfig>> = new Map([
    ['happy', { pitch: 1.1, rate: 1.1 }],
    ['sad', { pitch: 0.9, rate: 0.9 }],
    ['angry', { pitch: 1.2, rate: 1.2 }],
    ['neutral', { pitch: 1.0, rate: 1.0 }]
  ]);
  private defaultConfig: VoiceConfig = {
    language: 'it-IT',
    pitch: 1,
    rate: 1,
    volume: 1,
    emotion: 'neutral',
    emphasis: 'none',
    preserveContext: true
  };

  // Frasi comuni da precaricare
  private commonPhrases = [
    'Benvenuto',
    'Grazie',
    'Per favore',
    'Mi dispiace',
    'Un momento per favore',
    'Caricamento in corso',
    'Operazione completata',
    'Si è verificato un errore'
  ];

  constructor() {
    super();
    this.synthesis = window.speechSynthesis;
    this.setupRecognition();
    this.loadVoices();
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    // Aggiungi le frasi comuni alla cache
    voiceCacheService.addPreloadPhrases(this.commonPhrases);
    
    // Precarica le frasi se il servizio TTS è disponibile
    if (this.ttsService) {
      await voiceCacheService.preloadPhrases(async (text, config) => {
        const audioData = await this.ttsService!.textToSpeech(text, {
          voice: config?.voice,
          language: config?.language,
          emotion: config?.emotion
        });
        return audioData;
      });
    }
  }

  // Metodo per impostare il servizio TTS dopo l'inizializzazione
  setTTSService(service: TTSService): void {
    this.ttsService = service;
  }

  private async loadVoices() {
    // Wait for voices to be loaded
    if (this.synthesis.getVoices().length === 0) {
      await new Promise<void>((resolve) => {
        this.synthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
      });
    }
  }

  private setupRecognition() {
    // Verifica supporto Speech Recognition
    const speechRecognitionAvailable = 
      typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    
    if (speechRecognitionAvailable) {
      // Usa il costruttore corretto
      const SpeechRecognitionConstructor = 
        (window.SpeechRecognition || window.webkitSpeechRecognition) as any;
                                          
      if (SpeechRecognitionConstructor) {
        try {
          const recognition = new SpeechRecognitionConstructor();
          // Solo se la creazione ha successo, assegniamo il riconoscimento
          this.recognition = recognition;
          
          if (this.recognition) {
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.defaultConfig.language;

            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
              const result = event.results[event.results.length - 1];
              const transcript = result[0].transcript;
              
              if (result.isFinal) {
                this.emit('finalResult', transcript);
              } else {
                this.emit('interimResult', transcript);
              }
            };

            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
              this.emit('error', event.error);
            };
          }
        } catch (e) {
          console.error('Failed to initialize speech recognition:', e);
          this.recognition = null;
        }
      }
    }
  }

  async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    try {
      // Cancel any ongoing speech
      if (this.currentUtterance) {
        this.synthesis.cancel();
      }

      // Verifica se l'audio è in cache
      const cachedAudio = voiceCacheService.getFromCache(text, config);
      if (cachedAudio) {
        return this.playAudioBuffer(cachedAudio);
      }

      // Verifica se il servizio TTS è disponibile
      if (this.ttsService) {
        try {
          // Use TTS service
          const audioData = await this.ttsService.textToSpeech(text, {
            voice: config?.voice,
            language: config?.language,
            emotion: config?.emotion
          });

          // Salva l'audio in cache
          await voiceCacheService.addToCache(text, audioData, config);

          // Play audio
          return this.playAudioBuffer(audioData);
        } catch (ttsError) {
          console.error('TTS service error, falling back to browser TTS:', ttsError);
          // Log dell'errore ma continua con il fallback
          this.emit('ttsError', ttsError);
        }
      }

      // Fallback al sintetizzatore vocale del browser
      return this.speakWithBrowser(text, config);
    } catch (error) {
      console.error('Speech error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async playAudioBuffer(audioData: ArrayBuffer): Promise<void> {
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.emit('speakEnd');
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        this.emit('error', error);
        reject(error);
      };

      audio.play().catch(error => {
        URL.revokeObjectURL(audioUrl);
        this.emit('error', error);
        reject(error);
      });

      this.emit('speakStart');
    });
  }

  // Metodo per utilizzare il sintetizzatore vocale del browser come fallback
  private speakWithBrowser(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const mergedConfig = { ...this.defaultConfig, ...config };
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Applica le impostazioni di configurazione
        utterance.lang = mergedConfig.language;
        if (mergedConfig.voice) {
          const voices = this.getVoices();
          const voice = voices.find(v => v.name === mergedConfig.voice);
          if (voice) utterance.voice = voice;
        }
        
        utterance.pitch = mergedConfig.pitch || 1;
        utterance.rate = mergedConfig.rate || 1;
        utterance.volume = mergedConfig.volume || 1;

        // Applica le impostazioni di emozione se specificate
        if (mergedConfig.emotion && mergedConfig.emotion !== 'neutral') {
          const emotionSetting = this.emotionSettings.get(mergedConfig.emotion);
          if (emotionSetting) {
            utterance.pitch = emotionSetting.pitch || utterance.pitch;
            utterance.rate = emotionSetting.rate || utterance.rate;
          }
        }

        // Gestisci gli eventi
        utterance.onend = () => {
          this.currentUtterance = null;
          this.emit('speakEnd');
          resolve();
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
          this.currentUtterance = null;
          this.emit('error', event);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        // Salva l'utterance corrente e avvia la sintesi
        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
        this.emit('speakStart');
      } catch (error) {
        this.emit('error', error);
        reject(error);
      }
    });
  }

  startListening(): void {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (!this.isListening) {
      this.recognition.start();
      this.isListening = true;
      this.emit('listeningStart');
    }
  }

  stopListening(): void {
    if (!this.recognition) return;

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.emit('listeningStop');
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  setLanguage(language: string): void {
    this.defaultConfig.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window && 
           ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  pause(): void {
    this.synthesis.pause();
    this.emit('speakPause');
  }

  resume(): void {
    this.synthesis.resume();
    this.emit('speakResume');
  }

  cancel(): void {
    this.synthesis.cancel();
    this.currentUtterance = null;
    this.emit('speakCancel');
  }

  setEmotionSettings(emotion: string, settings: Partial<VoiceConfig>): void {
    this.emotionSettings.set(emotion, settings);
  }

  getEmotionSettings(emotion: string): Partial<VoiceConfig> | undefined {
    return this.emotionSettings.get(emotion);
  }
}

export const voiceService = new VoiceService();
