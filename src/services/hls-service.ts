import Hls from 'hls.js';
import { EventEmitter } from '../utils/event-emitter';

interface VideoSource {
  id: string;
  name: string;
  url: string;
  type: 'hls' | 'mp4' | 'webm'; 
  thumbnailUrl?: string;
  duration?: number;
  quality?: string;
  metadata?: Record<string, any>;
}

type VideoQuality = 'auto' | '240p' | '360p' | '480p' | '720p' | '1080p';

interface PlaybackOptions {
  autoplay?: boolean;
  startTime?: number;
  muted?: boolean;
  loop?: boolean;
  quality?: VideoQuality;
}

class HlsService extends EventEmitter {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentSource: VideoSource | null = null;
  private sources: Map<string, VideoSource> = new Map();
  private qualityLevels: VideoQuality[] = ['auto'];
  private currentQuality: VideoQuality = 'auto';
  private isPlaying: boolean = false;
  private pendingSeek: number | null = null;
  
  constructor() {
    super();
    this.checkHlsSupport();
  }
  
  /**
   * Controlla se il browser supporta HLS nativo o tramite libreria
   */
  private checkHlsSupport(): boolean {
    if (Hls.isSupported()) {
      console.log('HLS.js supportato');
      return true;
    } else if (this.isNativeHlsSupported()) {
      console.log('HLS nativo supportato');
      return true;
    }
    
    console.warn('HLS non supportato su questo browser');
    this.emit('error', { type: 'support', message: 'HLS non supportato su questo browser' });
    return false;
  }
  
  /**
   * Controlla se il browser ha supporto nativo per HLS
   */
  private isNativeHlsSupported(): boolean {
    const video = document.createElement('video');
    return Boolean(
      video.canPlayType('application/vnd.apple.mpegurl') || 
      video.canPlayType('application/x-mpegURL')
    );
  }
  
  /**
   * Registra un elemento video per il controllo HLS
   */
  public attachMedia(videoElement: HTMLVideoElement): void {
    this.videoElement = videoElement;
    
    // Aggiungi listener eventi al video
    this.videoElement.addEventListener('play', this.handlePlay);
    this.videoElement.addEventListener('pause', this.handlePause);
    this.videoElement.addEventListener('ended', this.handleEnded);
    this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate);
    this.videoElement.addEventListener('waiting', this.handleBuffering);
    this.videoElement.addEventListener('canplay', this.handleCanPlay);
    this.videoElement.addEventListener('error', this.handleError);
    
    if (this.currentSource) {
      this.loadSource(this.currentSource, { autoplay: this.isPlaying });
    }
  }
  
  /**
   * Rimuove il controllo HLS dall'elemento video
   */
  public detachMedia(): void {
    if (this.videoElement) {
      this.videoElement.removeEventListener('play', this.handlePlay);
      this.videoElement.removeEventListener('pause', this.handlePause);
      this.videoElement.removeEventListener('ended', this.handleEnded);
      this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate);
      this.videoElement.removeEventListener('waiting', this.handleBuffering);
      this.videoElement.removeEventListener('canplay', this.handleCanPlay);
      this.videoElement.removeEventListener('error', this.handleError);
      
      this.videoElement = null;
    }
    
    this.destroyHls();
  }
  
  /**
   * Distrugge l'istanza HLS liberando le risorse
   */
  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
  
  /**
   * Carica una sorgente video HLS
   */
  public loadSource(source: VideoSource, options: PlaybackOptions = {}): void {
    // Salva le opzioni richieste
    this.currentSource = source;
    this.isPlaying = options.autoplay || false;
    this.currentQuality = options.quality || 'auto';
    this.pendingSeek = options.startTime || null;
    
    if (!this.videoElement) {
      console.warn('Nessun elemento video associato');
      return;
    }
    
    // Distruggi l'istanza precedente
    this.destroyHls();
    
    if (source.type === 'hls') {
      if (Hls.isSupported()) {
        this.setupHls(source.url, options);
      } else if (this.isNativeHlsSupported()) {
        this.setupNativeHls(source.url, options);
      } else {
        this.emit('error', { 
          type: 'support', 
          message: 'Il browser non supporta HLS' 
        });
      }
    } else {
      // Per video non-HLS
      this.videoElement.src = source.url;
      this.applyPlaybackOptions(options);
    }
  }
  
  /**
   * Configura HLS.js per lo streaming
   */
  private setupHls(url: string, options: PlaybackOptions): void {
    if (!this.videoElement) return;
    
    try {
      // Crea una nuova istanza di HLS
      this.hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferSize: 30 * 1000 * 1000, // 30 MB
        maxBufferLength: 60,
        startLevel: -1, // Auto
        debug: false
      });
      
      // Gestione eventi HLS
      this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS: Media attached');
        this.hls!.loadSource(url);
      });
      
      this.hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log(`HLS: Manifest parsed, livelli: ${data.levels.length}`);
        this.updateQualityLevels(data.levels);
        this.applyPlaybackOptions(options);
      });
      
      this.hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('HLS: Errore di rete, tentativo di recupero');
              this.hls!.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('HLS: Errore media, tentativo di recupero');
              this.hls!.recoverMediaError();
              break;
            default:
              console.error('HLS: Errore fatale', data);
              this.destroyHls();
              break;
          }
          
          this.emit('error', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            message: data.reason || 'Errore HLS sconosciuto'
          });
        }
      });
      
      // Collegamento all'elemento video
      this.hls.attachMedia(this.videoElement);
    } catch (error) {
      console.error('Errore nell\'inizializzazione di HLS:', error);
      this.emit('error', { 
        type: 'init', 
        message: 'Errore nell\'inizializzazione dello streaming' 
      });
    }
  }
  
  /**
   * Configura il supporto HLS nativo
   */
  private setupNativeHls(url: string, options: PlaybackOptions): void {
    if (!this.videoElement) return;
    
    try {
      this.videoElement.src = url;
      this.applyPlaybackOptions(options);
    } catch (error) {
      console.error('Errore nell\'inizializzazione di HLS nativo:', error);
      this.emit('error', { 
        type: 'init', 
        message: 'Errore nell\'inizializzazione dello streaming nativo' 
      });
    }
  }
  
  /**
   * Applica le opzioni di riproduzione all'elemento video
   */
  private applyPlaybackOptions(options: PlaybackOptions): void {
    if (!this.videoElement) return;
    
    // Applica le opzioni
    if (options.muted !== undefined) this.videoElement.muted = options.muted;
    if (options.loop !== undefined) this.videoElement.loop = options.loop;
    
    // Gestione del punto di inizio
    if (options.startTime !== undefined && options.startTime > 0) {
      this.pendingSeek = options.startTime;
      this.videoElement.addEventListener('loadedmetadata', () => {
        if (this.pendingSeek !== null && this.videoElement) {
          this.videoElement.currentTime = this.pendingSeek;
          this.pendingSeek = null;
        }
      }, { once: true });
    }
    
    // Autoplay se richiesto
    if (options.autoplay) {
      const playPromise = this.videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => this.isPlaying = true)
          .catch(error => {
            console.warn('Autoplay impedito:', error);
            this.isPlaying = false;
            this.emit('error', { 
              type: 'autoplay', 
              message: 'Autoplay impedito dalle policy del browser' 
            });
          });
      }
    }
  }
  
  /**
   * Aggiorna i livelli di qualità disponibili
   */
  private updateQualityLevels(hlsLevels: any[]): void {
    this.qualityLevels = ['auto'];
    hlsLevels.forEach(level => {
      const height = level.height;
      let quality: VideoQuality = 'auto';
      
      if (height <= 240) quality = '240p';
      else if (height <= 360) quality = '360p';
      else if (height <= 480) quality = '480p';
      else if (height <= 720) quality = '720p';
      else if (height <= 1080) quality = '1080p';
      
      if (!this.qualityLevels.includes(quality)) {
        this.qualityLevels.push(quality);
      }
    });
    
    this.emit('qualityLevelsUpdated', this.qualityLevels);
  }
  
  /**
   * Imposta la qualità del video
   */
  public setQuality(quality: VideoQuality): void {
    if (!this.qualityLevels.includes(quality)) {
      console.warn(`Qualità non disponibile: ${quality}`);
      return;
    }
    
    this.currentQuality = quality;
    
    if (this.hls) {
      if (quality === 'auto') {
        this.hls.currentLevel = -1; // Auto
      } else {
        // Trova il livello corrispondente alla qualità richiesta
        const levels = this.hls.levels;
        if (!levels) return;
        
        const targetHeight = this.qualityToHeight(quality);
        let closestLevel = 0;
        let minDiff = Infinity;
        
        for (let i = 0; i < levels.length; i++) {
          const diff = Math.abs(levels[i].height - targetHeight);
          if (diff < minDiff) {
            minDiff = diff;
            closestLevel = i;
          }
        }
        
        this.hls.currentLevel = closestLevel;
      }
    }
    
    this.emit('qualityChanged', quality);
  }
  
  /**
   * Converte una qualità in altezza in pixel
   */
  private qualityToHeight(quality: VideoQuality): number {
    switch (quality) {
      case '240p': return 240;
      case '360p': return 360;
      case '480p': return 480;
      case '720p': return 720;
      case '1080p': return 1080;
      case 'auto':
      default: return 0;
    }
  }
  
  /**
   * Aggiunge una nuova sorgente video alla libreria
   */
  public addSource(source: VideoSource): void {
    this.sources.set(source.id, source);
  }
  
  /**
   * Rimuove una sorgente video dalla libreria
   */
  public removeSource(sourceId: string): void {
    this.sources.delete(sourceId);
  }
  
  /**
   * Ottiene tutte le sorgenti disponibili
   */
  public getAllSources(): VideoSource[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * Ottiene una sorgente video specifica
   */
  public getSource(sourceId: string): VideoSource | undefined {
    return this.sources.get(sourceId);
  }
  
  /**
   * Avvia la riproduzione del video
   */
  public play(): Promise<void> | void {
    if (!this.videoElement) return;
    
    const playPromise = this.videoElement.play();
    if (playPromise !== undefined) {
      return playPromise
        .then(() => {
          this.isPlaying = true;
          this.emit('play');
        })
        .catch(error => {
          console.error('Errore nella riproduzione:', error);
          this.isPlaying = false;
          this.emit('error', { 
            type: 'playback', 
            message: 'Impossibile avviare la riproduzione' 
          });
        });
    }
    
    this.isPlaying = true;
    this.emit('play');
  }
  
  /**
   * Mette in pausa la riproduzione del video
   */
  public pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.isPlaying = false;
      this.emit('pause');
    }
  }
  
  /**
   * Passa a un punto specifico del video
   */
  public seek(time: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = time;
      this.emit('seek', time);
    }
  }
  
  /**
   * Imposta il volume del video (0-1)
   */
  public setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
      this.emit('volumeChange', volume);
    }
  }
  
  /**
   * Attiva/disattiva l'audio
   */
  public setMuted(muted: boolean): void {
    if (this.videoElement) {
      this.videoElement.muted = muted;
      this.emit('mutedChange', muted);
    }
  }
  
  /**
   * Gestori eventi per l'elemento video
   */
  private handlePlay = (): void => {
    this.isPlaying = true;
    this.emit('play');
  };
  
  private handlePause = (): void => {
    this.isPlaying = false;
    this.emit('pause');
  };
  
  private handleEnded = (): void => {
    this.isPlaying = false;
    this.emit('ended');
  };
  
  private handleTimeUpdate = (): void => {
    if (this.videoElement) {
      this.emit('timeUpdate', {
        currentTime: this.videoElement.currentTime,
        duration: this.videoElement.duration || 0
      });
    }
  };
  
  private handleBuffering = (): void => {
    this.emit('buffering');
  };
  
  private handleCanPlay = (): void => {
    this.emit('canPlay');
    
    if (this.pendingSeek !== null && this.videoElement) {
      this.videoElement.currentTime = this.pendingSeek;
      this.pendingSeek = null;
    }
  };
  
  private handleError = (error: any): void => {
    console.error('Errore elemento video:', error);
    this.emit('error', { 
      type: 'media', 
      message: 'Errore nella riproduzione del media',
      details: error
    });
  };
  
  /**
   * Ottiene la posizione attuale di riproduzione
   */
  public getCurrentTime(): number {
    return this.videoElement ? this.videoElement.currentTime : 0;
  }
  
  /**
   * Ottiene la durata totale del video
   */
  public getDuration(): number {
    return this.videoElement ? (this.videoElement.duration || 0) : 0;
  }
  
  /**
   * Verifica se il video è in riproduzione
   */
  public isVideoPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Ottiene la sorgente corrente
   */
  public getCurrentSource(): VideoSource | null {
    return this.currentSource;
  }
  
  /**
   * Ottiene i livelli di qualità disponibili
   */
  public getQualityLevels(): VideoQuality[] {
    return this.qualityLevels;
  }
  
  /**
   * Ottiene il livello di qualità attuale
   */
  public getCurrentQuality(): VideoQuality {
    return this.currentQuality;
  }
  
  /**
   * Ottiene lo stato di buffering attuale
   */
  public getBufferInfo(): { start: number; end: number; }[] {
    if (!this.videoElement) return [];
    
    const ranges = [];
    for (let i = 0; i < this.videoElement.buffered.length; i++) {
      ranges.push({
        start: this.videoElement.buffered.start(i),
        end: this.videoElement.buffered.end(i)
      });
    }
    
    return ranges;
  }
  
  /**
   * Verifica se il video è bufferizzato in un punto specifico
   */
  public isBuffered(time: number): boolean {
    const bufferInfo = this.getBufferInfo();
    return bufferInfo.some(range => time >= range.start && time <= range.end);
  }
  
  /**
   * Distrugge il servizio HLS liberando tutte le risorse
   */
  public destroy(): void {
    this.detachMedia();
    this.removeAllListeners();
    this.sources.clear();
    this.currentSource = null;
    this.qualityLevels = ['auto'];
    this.currentQuality = 'auto';
    this.isPlaying = false;
    this.pendingSeek = null;
  }
}

export const hlsService = new HlsService();
