import { VoiceConfig } from './voice-service';

interface CachedAudio {
  audio: ArrayBuffer;
  timestamp: number;
  config: Partial<VoiceConfig>;
}

interface CacheConfig {
  maxSize: number;        // Dimensione massima della cache in MB
  maxAge: number;         // Età massima degli elementi in cache in millisecondi
  preloadPhrases: string[]; // Frasi da precaricare
}

export class VoiceCacheService {
  private cache: Map<string, CachedAudio> = new Map();
  private totalSize: number = 0;
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB default
    maxAge: 24 * 60 * 60 * 1000, // 24 ore default
    preloadPhrases: []
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanupInterval();
  }

  // Genera una chiave unica per la cache basata sul testo e la configurazione
  private generateCacheKey(text: string, config?: Partial<VoiceConfig>): string {
    const configString = config ? JSON.stringify(config) : '';
    return `${text}:${configString}`;
  }

  // Aggiunge un audio alla cache
  async addToCache(text: string, audio: ArrayBuffer, config?: Partial<VoiceConfig>): Promise<void> {
    const key = this.generateCacheKey(text, config);
    const size = audio.byteLength;

    // Verifica se c'è spazio nella cache
    while (this.totalSize + size > this.config.maxSize) {
      const oldestKey = this.getOldestCacheKey();
      if (!oldestKey) break;
      this.removeFromCache(oldestKey);
    }

    // Se c'è ancora spazio, aggiungi il nuovo elemento
    if (this.totalSize + size <= this.config.maxSize) {
      this.cache.set(key, {
        audio,
        timestamp: Date.now(),
        config: config || {}
      });
      this.totalSize += size;
      return;
    }

    throw new Error('Cache full and unable to make space');
  }

  // Recupera un audio dalla cache
  getFromCache(text: string, config?: Partial<VoiceConfig>): ArrayBuffer | null {
    const key = this.generateCacheKey(text, config);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Verifica se l'elemento è scaduto
    if (Date.now() - cached.timestamp > this.config.maxAge) {
      this.removeFromCache(key);
      return null;
    }

    // Aggiorna il timestamp per l'algoritmo LRU
    cached.timestamp = Date.now();
    return cached.audio;
  }

  // Rimuove un elemento dalla cache
  private removeFromCache(key: string): void {
    const cached = this.cache.get(key);
    if (cached) {
      this.totalSize -= cached.audio.byteLength;
      this.cache.delete(key);
    }
  }

  // Trova la chiave dell'elemento più vecchio nella cache
  private getOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  // Pulisce periodicamente la cache
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.config.maxAge) {
          this.removeFromCache(key);
        }
      }
    }, 60 * 60 * 1000); // Esegui ogni ora
  }

  // Precaricare frasi comuni
  async preloadPhrases(ttsService: (text: string, config?: Partial<VoiceConfig>) => Promise<ArrayBuffer>): Promise<void> {
    const preloadPromises = this.config.preloadPhrases.map(async phrase => {
      try {
        // Verifica se la frase è già in cache e non è scaduta
        const cached = this.cache.get(this.generateCacheKey(phrase));
        if (cached && Date.now() - cached.timestamp <= this.config.maxAge) {
          return;
        }

        // Genera l'audio e aggiungilo alla cache
        const audio = await ttsService(phrase);
        await this.addToCache(phrase, audio);
      } catch (error) {
        console.error(`Failed to preload phrase: ${phrase}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  // Aggiunge frasi da precaricare
  addPreloadPhrases(phrases: string[]): void {
    this.config.preloadPhrases = [...new Set([...this.config.preloadPhrases, ...phrases])];
  }

  // Rimuove frasi dal precaricamento
  removePreloadPhrases(phrases: string[]): void {
    this.config.preloadPhrases = this.config.preloadPhrases.filter(
      phrase => !phrases.includes(phrase)
    );
  }

  // Ottiene statistiche sulla cache
  getCacheStats(): {
    size: number;
    maxSize: number;
    itemCount: number;
    preloadPhrasesCount: number;
  } {
    return {
      size: this.totalSize,
      maxSize: this.config.maxSize,
      itemCount: this.cache.size,
      preloadPhrasesCount: this.config.preloadPhrases.length
    };
  }

  // Pulisce la cache
  clearCache(): void {
    this.cache.clear();
    this.totalSize = 0;
  }
}

// Esporta l'istanza singleton
export const voiceCacheService = new VoiceCacheService();
