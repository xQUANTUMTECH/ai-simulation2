import { EventEmitter } from '../utils/event-emitter';
import { voiceService, VoiceConfig } from './voice-service';

export interface SpeechQueueItem {
  agentId: string;
  text: string;
  config?: Partial<VoiceConfig>;
  priority: number; // 0 = bassa, 10 = alta
  timestamp: number;
}

export interface AgentVoiceProfile {
  agentId: string;
  name: string;
  voiceConfig: Partial<VoiceConfig>;
  role: string;
  priority: number; // Priorità di base per questo agente
}

/**
 * Questo servizio gestisce una coda di messaggi vocali da pronunciare,
 * assicurando che un solo agente parli alla volta e prevenendo sovrapposizioni.
 */
class TTSQueueService extends EventEmitter {
  private queue: SpeechQueueItem[] = [];
  private isProcessing: boolean = false;
  private voiceProfiles: Map<string, AgentVoiceProfile> = new Map();
  private currentSpeakingAgent: string | null = null;
  private interruptionAllowed: boolean = false;
  private defaultPriority: number = 5;

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Ascolta gli eventi di fine parlato dal voice service
    voiceService.on('speakEnd', () => {
      this.currentSpeakingAgent = null;
      this.emit('agentStoppedSpeaking');
      
      // Processa il prossimo elemento della coda
      setTimeout(() => this.processQueue(), 300); // Piccola pausa tra un messaggio e l'altro
    });

    voiceService.on('speakStart', () => {
      this.emit('agentStartedSpeaking', this.currentSpeakingAgent);
    });
  }

  /**
   * Registra un profilo vocale per un agente AI
   */
  registerAgentVoice(profile: AgentVoiceProfile): void {
    this.voiceProfiles.set(profile.agentId, profile);
    console.log(`Agente registrato: ${profile.name} (${profile.agentId})`);
  }

  /**
   * Rimuove un profilo vocale per un agente
   */
  unregisterAgentVoice(agentId: string): void {
    this.voiceProfiles.delete(agentId);
  }

  /**
   * Ottiene il profilo vocale di un agente
   */
  getAgentProfile(agentId: string): AgentVoiceProfile | undefined {
    return this.voiceProfiles.get(agentId);
  }

  /**
   * Aggiunge un elemento alla coda di messaggi da pronunciare
   */
  enqueue(agentId: string, text: string, customConfig?: Partial<VoiceConfig>, customPriority?: number): void {
    // Ottieni il profilo vocale dell'agente per la configurazione di base
    const agentProfile = this.voiceProfiles.get(agentId);
    
    // Se l'agente non è registrato, usa una configurazione predefinita
    const config = agentProfile 
      ? { ...agentProfile.voiceConfig, ...customConfig }
      : customConfig || {};
      
    // Determina la priorità
    const priority = customPriority !== undefined
      ? customPriority
      : agentProfile?.priority || this.defaultPriority;

    // Crea l'elemento della coda
    const queueItem: SpeechQueueItem = {
      agentId,
      text,
      config,
      priority,
      timestamp: Date.now()
    };

    // Aggiungi l'elemento alla coda
    this.queue.push(queueItem);
    
    // Ordina la coda per priorità (decrescente) e timestamp (crescente)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Priorità più alta prima
      }
      return a.timestamp - b.timestamp; // A parità di priorità, prima arrivato prima servito
    });

    // Se non stiamo già processando la coda, avvia il processo
    if (!this.isProcessing) {
      this.processQueue();
    } else {
      // Se è consentita l'interruzione e il nuovo messaggio ha priorità superiore all'attuale,
      // interrompi il messaggio corrente
      if (this.interruptionAllowed && 
          this.currentSpeakingAgent && 
          priority > (this.voiceProfiles.get(this.currentSpeakingAgent)?.priority || 0)) {
        voiceService.cancel();
        this.currentSpeakingAgent = null;
        this.processQueue();
      }
    }
  }

  /**
   * Processa la coda di messaggi
   */
  private async processQueue(): Promise<void> {
    // Se stiamo già processando o la coda è vuota, esci
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Prendi il primo elemento della coda
      const nextItem = this.queue.shift();
      if (!nextItem) {
        this.isProcessing = false;
        return;
      }

      // Salva l'id dell'agente che sta parlando
      this.currentSpeakingAgent = nextItem.agentId;
      
      // Emetti evento prima che l'agente inizi a parlare
      this.emit('agentWillSpeak', {
        agentId: nextItem.agentId,
        text: nextItem.text
      });

      // Pronuncia il testo
      await voiceService.speak(nextItem.text, nextItem.config);
      
      // La fine del parlato viene gestita dall'event listener su speakEnd
    } catch (error) {
      console.error('Errore durante la pronuncia del messaggio:', error);
      this.currentSpeakingAgent = null;
      this.isProcessing = false;
      
      // Continua con il prossimo elemento
      this.processQueue();
    }
  }

  /**
   * Pulisce la coda
   */
  clearQueue(): void {
    this.queue = [];
    if (this.currentSpeakingAgent) {
      voiceService.cancel();
      this.currentSpeakingAgent = null;
    }
  }

  /**
   * Imposta se è consentito interrompere un agente mentre parla
   */
  setInterruptionAllowed(allowed: boolean): void {
    this.interruptionAllowed = allowed;
  }

  /**
   * Verifica se un agente sta parlando
   */
  isAgentSpeaking(agentId: string): boolean {
    return this.currentSpeakingAgent === agentId;
  }

  /**
   * Restituisce l'ID dell'agente attualmente parlante
   */
  getCurrentSpeakingAgent(): string | null {
    return this.currentSpeakingAgent;
  }

  /**
   * Restituisce la lunghezza attuale della coda
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

export const ttsQueueService = new TTSQueueService();
