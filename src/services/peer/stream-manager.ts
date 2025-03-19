
import { VideoQualityPreset } from './types';
import { VIDEO_QUALITY_PRESETS } from './video-config';

// Implementazione browser-friendly di EventEmitter
class EventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: string, listener: Function): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) {
      return false;
    }
    this.events[event].forEach(listener => listener(...args));
    return true;
  }

  removeListener(event: string, listener: Function): this {
    if (!this.events[event]) {
      return this;
    }
    this.events[event] = this.events[event].filter(l => l !== listener);
    return this;
  }
}

export class StreamManager extends EventEmitter {
  private localStream: MediaStream | null = null;
  private isAudioEnabled = true;
  private isVideoEnabled = true;
  private videoQuality: string = 'medium';

  constructor() {
    super();
  }

  // Avvia lo stream locale con ottimizzazione della qualità
  async startLocalStream(options: { audio: boolean, video: boolean }): Promise<MediaStream> {
    try {
      // Se abbiamo già uno stream, fermiamo prima tutti i track
      this.stopLocalStream();
      
      // Ottieni preset qualità appropriato
      const qualityPreset = VIDEO_QUALITY_PRESETS[this.videoQuality];
      
      // Ottieni media con le opzioni e qualità fornite
      const constraints: MediaStreamConstraints = {
        audio: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: options.video ? {
          width: { ideal: qualityPreset.width },
          height: { ideal: qualityPreset.height },
          frameRate: { ideal: qualityPreset.frameRate }
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isAudioEnabled = options.audio;
      this.isVideoEnabled = options.video;
      
      this.emit('local_stream_started', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('Errore nell\'acquisizione dello stream locale:', error);
      
      // In caso di errore, prova con una qualità inferiore
      if (options.video && this.videoQuality !== 'low') {
        console.log('Tentativo con qualità inferiore dopo errore');
        this.setVideoQuality('low');
        return this.startLocalStream(options);
      }
      
      throw error;
    }
  }

  // Ferma lo stream locale
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      this.emit('local_stream_stopped');
    }
  }

  // Imposta la qualità video e aggiorna i track se necessario
  setVideoQuality(quality: string): void {
    if (this.videoQuality === quality) return;
    
    this.videoQuality = quality;
    console.log(`Adattamento qualità video a: ${quality}`);
    
    // Se abbiamo uno stream attivo con video, aggiorniamo i parametri
    if (this.localStream && this.isVideoEnabled) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.applyVideoConstraints(videoTrack, VIDEO_QUALITY_PRESETS[quality]);
      }
    }
    
    this.emit('video_quality_changed', quality);
  }

  // Applica vincoli di qualità a un video track
  private applyVideoConstraints(videoTrack: MediaStreamTrack, preset: VideoQualityPreset): void {
    try {
      const constraints = {
        width: { ideal: preset.width },
        height: { ideal: preset.height },
        frameRate: { ideal: preset.frameRate }
      };
      
      // Applica i vincoli se supportati
      if ((videoTrack as any).applyConstraints) {
        (videoTrack as any).applyConstraints(constraints);
      }
      
      this.emit('video_constraints_applied', constraints);
    } catch (error) {
      console.error('Errore nell\'applicazione dei vincoli video:', error);
    }
  }

  // Aggiorna i parametri di encoding per un sender video
  updateVideoEncoding(sender: RTCRtpSender): void {
    if (!sender || !sender.track || sender.track.kind !== 'video') return;

    const preset = VIDEO_QUALITY_PRESETS[this.videoQuality];
    if (!preset.bitrate) return;

    try {
      if (sender.getParameters && sender.setParameters) {
        const parameters = sender.getParameters();
        if (parameters.encodings && parameters.encodings.length > 0) {
          parameters.encodings[0].maxBitrate = preset.bitrate;
          sender.setParameters(parameters);
        }
      }
    } catch (e) {
      console.warn('Impossibile impostare parametri di encoding:', e);
    }
  }

  // Toggle audio
  toggleAudio(enabled: boolean): void {
    this.isAudioEnabled = enabled;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('audio_state_changed', enabled);
    }
  }

  // Toggle video
  toggleVideo(enabled: boolean): void {
    this.isVideoEnabled = enabled;
    
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('video_state_changed', enabled);
    }
  }

  // Avvia condivisione schermo
  async startScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      // Salva il track video corrente per ripristinarlo dopo
      const previousVideoTrack = this.localStream?.getVideoTracks()[0];
      
      // Sostituisci il track video nello stream locale
      if (this.localStream) {
        const screenTrack = stream.getVideoTracks()[0];
        const videoTracks = this.localStream.getVideoTracks();
        
        // Ferma e rimuovi i track video esistenti
        videoTracks.forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
        
        // Aggiungi il nuovo track
        this.localStream.addTrack(screenTrack);
        
        // Gestisci la fine della condivisione schermo
        screenTrack.onended = () => {
          this.stopScreenShare(previousVideoTrack);
        };
      }
      
      this.emit('screen_share_started', stream);
      return stream;
    } catch (error) {
      console.error('Errore nell\'avvio della condivisione schermo:', error);
      throw error;
    }
  }

  // Ferma condivisione schermo
  async stopScreenShare(previousVideoTrack?: MediaStreamTrack): Promise<void> {
    try {
      if (this.localStream) {
        let newVideoTrack: MediaStreamTrack | null = null;
        
        if (previousVideoTrack && previousVideoTrack.readyState !== 'ended') {
          newVideoTrack = previousVideoTrack;
        } else if (this.isVideoEnabled) {
          // Ottieni un nuovo track video
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          newVideoTrack = newStream.getVideoTracks()[0];
        }
        
        // Rimuovi i track video correnti
        const currentVideoTracks = this.localStream.getVideoTracks();
        currentVideoTracks.forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
        
        // Aggiungi il nuovo track se disponibile
        if (newVideoTrack) {
          this.localStream.addTrack(newVideoTrack);
        }
      }
      
      this.emit('screen_share_stopped');
    } catch (error) {
      console.error('Errore nella conclusione della condivisione schermo:', error);
      throw error;
    }
  }

  // Ottieni lo stream locale
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Ottieni lo stato audio
  isAudioActive(): boolean {
    return this.isAudioEnabled;
  }

  // Ottieni lo stato video
  isVideoActive(): boolean {
    return this.isVideoEnabled;
  }

  // Ottieni la qualità video corrente
  getCurrentVideoQuality(): string {
    return this.videoQuality;
  }

  // Pulisci le risorse
  cleanup(): void {
    this.stopLocalStream();
  }
}
