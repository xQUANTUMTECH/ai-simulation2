import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hlsService } from '../../src/services/hls-service';

// Importazione per il tipaggio
import Hls from 'hls.js';

// Mock di Hls.js
vi.mock('hls.js', () => {
  return {
    default: class MockHls {
      static isSupported() { return true; }
      
      static Events = {
        MEDIA_ATTACHED: 'hlsMediaAttached',
        MANIFEST_PARSED: 'hlsManifestParsed',
        ERROR: 'hlsError'
      };
      
      static ErrorTypes = {
        NETWORK_ERROR: 'networkError',
        MEDIA_ERROR: 'mediaError'
      };
      
      attachMedia = vi.fn().mockImplementation(() => {
        // Simuliamo l'evento di media attached
        setTimeout(() => this.trigger(MockHls.Events.MEDIA_ATTACHED), 0);
        return this;
      });
      
      loadSource = vi.fn().mockImplementation(() => {
        // Simuliamo l'evento di manifest parsed
        setTimeout(() => {
          this.trigger(MockHls.Events.MANIFEST_PARSED, null, {
            levels: [
              { height: 240, width: 320, bitrate: 400000 },
              { height: 480, width: 640, bitrate: 1000000 },
              { height: 720, width: 1280, bitrate: 2500000 }
            ]
          });
        }, 0);
        return this;
      });
      
      on = vi.fn().mockImplementation((event, callback) => {
        this.listeners = this.listeners || {};
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(callback);
        return this;
      });
      
      trigger(event: string, data1?: any, data2?: any) {
        if (this.listeners && this.listeners[event]) {
          this.listeners[event].forEach((callback: Function) => {
            callback(data1, data2);
          });
        }
      }
      
      startLoad = vi.fn();
      recoverMediaError = vi.fn();
      destroy = vi.fn();
      
      levels = [
        { height: 240, width: 320, bitrate: 400000 },
        { height: 480, width: 640, bitrate: 1000000 },
        { height: 720, width: 1280, bitrate: 2500000 }
      ];
      
      currentLevel = -1;
      listeners: Record<string, Function[]> = {};
    }
  };
});

// Mock di HTMLVideoElement
class MockVideoElement {
  src: string = '';
  currentTime: number = 0;
  private _duration: number = 0;
  get duration() { return this._duration; }
  set duration(value: number) { this._duration = value; }
  
  muted: boolean = false;
  volume: number = 1;
  loop: boolean = false;
  paused: boolean = true;
  buffered = {
    length: 1,
    start: vi.fn().mockReturnValue(0),
    end: vi.fn().mockReturnValue(0)
  };
  
  canPlayType = vi.fn().mockReturnValue('probably');
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  play = vi.fn().mockImplementation(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn().mockImplementation(() => {
    this.paused = true;
  });
}

// Mock di document.createElement
const originalCreateElement = document.createElement;
global.document.createElement = vi.fn().mockImplementation((tag: string) => {
  if (tag === 'video') {
    return new MockVideoElement() as unknown as HTMLVideoElement;
  }
  return originalCreateElement.call(document, tag);
});

describe('HlsService', () => {
  let videoElement: HTMLVideoElement;
  
  beforeEach(() => {
    // Ricrea un elemento video mock per ogni test
    videoElement = document.createElement('video') as HTMLVideoElement;
    
    // Reset dello stato dell'HLS service
    hlsService.destroy();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Inizializzazione', () => {
    it('Dovrebbe verificare correttamente il supporto HLS', () => {
      // Il mock di Hls.isSupported restituisce true
      expect((Hls as any).isSupported()).toBe(true);
    });
    
    it('Dovrebbe collegare correttamente un elemento video', () => {
      hlsService.attachMedia(videoElement);
      expect(videoElement.addEventListener).toHaveBeenCalled();
    });
  });
  
  describe('Gestione delle sorgenti', () => {
    it('Dovrebbe aggiungere, recuperare e rimuovere sorgenti correttamente', () => {
      const source = {
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.m3u8',
        type: 'hls' as const,
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        duration: 120
      };
      
      hlsService.addSource(source);
      
      expect(hlsService.getAllSources()).toHaveLength(1);
      expect(hlsService.getSource('test-video')).toEqual(source);
      
      hlsService.removeSource('test-video');
      expect(hlsService.getAllSources()).toHaveLength(0);
    });
    
    it('Dovrebbe caricare correttamente una sorgente HLS', () => {
      hlsService.attachMedia(videoElement);
      
      const source = {
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.m3u8',
        type: 'hls' as const
      };
      
      const mockHlsInstance = (hlsService as any).hls;
      
      hlsService.loadSource(source, { autoplay: true });
      
      // Verifica che un'istanza HLS sia stata creata e collegata
      expect(mockHlsInstance).not.toBeNull();
    });
    
    it('Dovrebbe caricare correttamente una sorgente non-HLS', () => {
      hlsService.attachMedia(videoElement);
      
      const source = {
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.mp4',
        type: 'mp4' as const
      };
      
      hlsService.loadSource(source, { autoplay: true });
      
      // Per sorgenti non-HLS, utilizziamo direttamente l'elemento video
      expect(videoElement.src).toBe(source.url);
    });
  });
  
  describe('Controlli di riproduzione', () => {
    beforeEach(() => {
      hlsService.attachMedia(videoElement);
      
      // Carica una sorgente di test
      hlsService.loadSource({
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.mp4',
        type: 'mp4' as const
      });
    });
    
    it('Dovrebbe avviare la riproduzione', async () => {
      await hlsService.play();
      expect(videoElement.play).toHaveBeenCalled();
      expect(hlsService.isVideoPlaying()).toBe(true);
    });
    
    it('Dovrebbe mettere in pausa la riproduzione', () => {
      hlsService.pause();
      expect(videoElement.pause).toHaveBeenCalled();
      expect(hlsService.isVideoPlaying()).toBe(false);
    });
    
    it('Dovrebbe cambiare la posizione di riproduzione', () => {
      hlsService.seek(30);
      expect(videoElement.currentTime).toBe(30);
    });
    
    it('Dovrebbe regolare il volume', () => {
      hlsService.setVolume(0.5);
      expect(videoElement.volume).toBe(0.5);
    });
    
    it('Dovrebbe attivare/disattivare l\'audio', () => {
      hlsService.setMuted(true);
      expect(videoElement.muted).toBe(true);
      
      hlsService.setMuted(false);
      expect(videoElement.muted).toBe(false);
    });
  });
  
  describe('Gestione qualità', () => {
    beforeEach(() => {
      hlsService.attachMedia(videoElement);
      
      // Carica una sorgente HLS di test
      hlsService.loadSource({
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.m3u8',
        type: 'hls' as const
      });
      
      // Trigger dell'evento di manifest parsed con livelli di qualità
      const mockHls = (hlsService as any).hls;
      const MockHls = (Hls as any);
      mockHls.trigger(MockHls.Events.MANIFEST_PARSED, null, {
        levels: [
          { height: 240, width: 320, bitrate: 400000 },
          { height: 480, width: 640, bitrate: 1000000 },
          { height: 720, width: 1280, bitrate: 2500000 }
        ]
      });
    });
    
    it('Dovrebbe ricevere livelli di qualità dal manifest', () => {
      const levels = hlsService.getQualityLevels();
      expect(levels).toContain('auto');
      expect(levels).toContain('240p');
      expect(levels).toContain('480p');
      expect(levels).toContain('720p');
    });
    
    it('Dovrebbe cambiare il livello di qualità', () => {
      hlsService.setQuality('480p');
      expect(hlsService.getCurrentQuality()).toBe('480p');
      
      hlsService.setQuality('auto');
      expect(hlsService.getCurrentQuality()).toBe('auto');
    });
  });
  
  describe('Gestione eventi', () => {
    beforeEach(() => {
      hlsService.attachMedia(videoElement);
    });
    
    it('Dovrebbe emettere eventi di riproduzione', () => {
      const playHandler = vi.fn();
      const pauseHandler = vi.fn();
      
      hlsService.on('play', playHandler);
      hlsService.on('pause', pauseHandler);
      
      // Simuliamo gli eventi del video
      // Estraiamo i listener registrati
      const calls = (videoElement.addEventListener as any).mock.calls;
      if (calls) {
        calls.forEach(([event, handler]: [string, Function]) => {
          if (event === 'play') handler();
          if (event === 'pause') handler();
        });
      }
      
      expect(playHandler).toHaveBeenCalled();
      expect(pauseHandler).toHaveBeenCalled();
    });
    
    it('Dovrebbe emettere eventi di aggiornamento tempo', () => {
      const timeUpdateHandler = vi.fn();
      hlsService.on('timeUpdate', timeUpdateHandler);
      
      // Impostiamo i valori di test
      videoElement.currentTime = 30;
      (videoElement as any).duration = 120;
      
      // Simuliamo l'evento timeupdate
      const calls = (videoElement.addEventListener as any).mock.calls;
      if (calls) {
        calls.forEach(([event, handler]: [string, Function]) => {
          if (event === 'timeupdate') handler();
        });
      }
      
      expect(timeUpdateHandler).toHaveBeenCalledWith({
        currentTime: 30,
        duration: 120
      });
    });
  });
  
  describe('Gestione errori', () => {
    it('Dovrebbe gestire gli errori HLS', () => {
      hlsService.attachMedia(videoElement);
      
      const errorHandler = vi.fn();
      hlsService.on('error', errorHandler);
      
      // Simuliamo un errore HLS
      const mockHls = (hlsService as any).hls;
      const MockHls = (Hls as any);
      mockHls.trigger(MockHls.Events.ERROR, null, {
        type: MockHls.ErrorTypes.NETWORK_ERROR,
        details: 'manifestLoadError',
        fatal: true,
        reason: 'Errore durante il caricamento del manifest'
      });
      
      expect(errorHandler).toHaveBeenCalledWith({
        type: 'networkError',
        details: 'manifestLoadError',
        fatal: true,
        message: 'Errore durante il caricamento del manifest'
      });
    });
  });
  
  describe('Pulizia risorse', () => {
    it('Dovrebbe liberare tutte le risorse con destroy', () => {
      hlsService.attachMedia(videoElement);
      
      // Impostiamo alcune opzioni
      hlsService.setQuality('720p');
      
      // Distruggiamo il servizio
      hlsService.destroy();
      
      // Verifichiamo il reset
      expect(hlsService.getCurrentSource()).toBeNull();
      expect(hlsService.isVideoPlaying()).toBe(false);
    });
  });
});
