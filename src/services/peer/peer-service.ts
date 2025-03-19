import Peer from 'peerjs';
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
import { signalingService } from '../signaling-service';
import { apiErrorService } from '../api-error-service';
import { PeerOptions, RoomParticipant } from './types';
import { DEFAULT_PEER_OPTIONS, RECONNECT_SETTINGS } from './video-config';
import { NetworkManager } from './network-manager';
import { StreamManager } from './stream-manager';
import { ConnectionManager } from './connection-manager';

export class PeerService extends EventEmitter {
  private peer: Peer | null = null;
  private peerId: string | null = null;
  private roomId: string | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private networkManager: NetworkManager;
  private streamManager: StreamManager;
  private connectionManager: ConnectionManager;

  constructor() {
    super();
    this.networkManager = new NetworkManager();
    this.streamManager = new StreamManager();
    this.connectionManager = new ConnectionManager();

    this.setupEventHandlers();
    this.setupSignalingListeners();
  }

  private setupEventHandlers(): void {
    // Network Manager events
    this.networkManager.on('quality_update', (quality: string) => {
      this.streamManager.setVideoQuality(quality);
    });

    this.networkManager.on('connection_quality', (data: any) => {
      this.emit('connection_quality', data);
    });

    // Stream Manager events
    this.streamManager.on('local_stream_started', (stream: MediaStream) => {
      this.emit('local_stream', stream);
    });

    this.streamManager.on('video_quality_changed', (quality: string) => {
      this.emit('video_quality_changed', quality);
    });

    // Connection Manager events
    this.connectionManager.on('peer_connected', (peerId: string) => {
      this.emit('peer_connected', peerId);
    });

    this.connectionManager.on('peer_disconnected', (peerId: string) => {
      this.emit('peer_disconnected', peerId);
    });

    this.connectionManager.on('stream', (data: any) => {
      this.emit('stream', data);
    });

    this.connectionManager.on('stream_removed', (peerId: string) => {
      this.emit('stream_removed', peerId);
    });

    this.connectionManager.on('participant_updated', (data: any) => {
      this.emit('participant_updated', data);
    });
  }

  private setupSignalingListeners(): void {
    signalingService.on('user_joined', (userId: string) => {
      console.log(`Utente entrato: ${userId}`);
      if (this.peerId !== userId) {
        this.connectToPeer(userId);
      }
    });

    signalingService.on('user_left', (userId: string) => {
      console.log(`Utente uscito: ${userId}`);
      this.connectionManager.handlePeerDisconnection(userId);
    });

    signalingService.on('participants', (participantIds: string[]) => {
      console.log('Lista partecipanti aggiornata:', participantIds);
      
      // Connettiti a tutti i peer a cui non siamo già connessi
      participantIds.forEach(id => {
        if (id !== this.peerId && !this.connectionManager.getConnection(id)) {
          this.connectToPeer(id);
        }
      });
      
      // Verifica eventuali connessioni non più valide
      const currentConnections = this.connectionManager.getAllConnections();
      currentConnections.forEach((_, peerId) => {
        if (!participantIds.includes(peerId)) {
          this.connectionManager.handlePeerDisconnection(peerId);
        }
      });
    });
  }

  // Initialize Peer connection with retry and advanced error handling
  async initialize(userId: string, options?: PeerOptions): Promise<string> {
    return apiErrorService.executeWithRetry(async () => {
      return new Promise<string>((resolve, reject) => {
        try {
          // Combine default options with provided options
          const peerOptions = { ...DEFAULT_PEER_OPTIONS, ...options };
          
          // If we already have a peer instance, destroy it first
          if (this.peer) {
            this.destroy();
          }

          // Create new Peer instance
          this.peer = new Peer(userId, peerOptions);
          
          this.peer.on('open', (id) => {
            console.log(`Peer connesso con ID: ${id}`);
            this.peerId = id;
            
            // Inizia monitoraggio connessione
            this.networkManager.startConnectionHeartbeat(
              this.connectionManager.getAllConnections(),
              this.attemptPeerReconnection.bind(this)
            );
            this.networkManager.startNetworkMonitoring(
              this.connectionManager.getAllConnections()
            );
            
            resolve(id);
          });

          this.peer.on('error', (error) => {
            console.error('Errore Peer:', error);
            this.emit('error', error);
            
            if (error.type === 'peer-unavailable') {
              const unavailablePeerId = error.message.split(' ')[1];
              console.log(`Peer ${unavailablePeerId} non disponibile`);
            } else if (error.type === 'network' || error.type === 'disconnected') {
              this.handleNetworkError(error);
            }
            
            // Only reject if we're still initializing
            if (!this.peerId) {
              reject(error);
            }
          });

          this.peer.on('connection', (conn) => {
            this.connectionManager.handleIncomingConnection(conn);
          });

          this.peer.on('call', (call) => {
            this.connectionManager.handleIncomingCall(call, this.streamManager.getLocalStream());
          });

          this.peer.on('close', () => {
            console.log('Peer disconnesso');
            this.peerId = null;
            this.emit('disconnected');
            this.cleanup();
          });

          this.peer.on('disconnected', () => {
            console.log('Peer disconnesso, tentativo di riconnessione');
            this.emit('disconnected');
            
            // Avvia la procedura di riconnessione con backoff esponenziale
            this.reconnectWithBackoff();
          });
        } catch (error) {
          console.error('Errore nella creazione del Peer:', error);
          reject(error);
        }
      });
    }, {
      endpoint: 'initialize',
      service: 'peer'
    });
  }

  // Riconnessione con backoff esponenziale
  private reconnectWithBackoff(attempt: number = 0): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (!this.peer) return;
    
    const currentDelay = Math.min(
      RECONNECT_SETTINGS.initialDelay * Math.pow(RECONNECT_SETTINGS.factor, attempt),
      RECONNECT_SETTINGS.maxDelay
    );
    
    // Aggiungi jitter per evitare riconnessioni simultanee
    const jitter = 1 - RECONNECT_SETTINGS.jitter/2 + Math.random() * RECONNECT_SETTINGS.jitter;
    const delay = Math.round(currentDelay * jitter);
    
    console.log(`Tentativo di riconnessione in ${delay}ms (tentativo #${attempt + 1})`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.peer) {
        console.log(`Esecuzione tentativo di riconnessione #${attempt + 1}`);
        this.emit('reconnecting', { attempt: attempt + 1, delay });
        
        try {
          this.peer.reconnect();
          
          // Verifica se la riconnessione ha avuto successo dopo un breve intervallo
          setTimeout(() => {
            if (this.peer && !this.isConnected()) {
              console.log(`Riconnessione fallita, nuovo tentativo`);
              this.reconnectWithBackoff(attempt + 1);
            } else if (this.isConnected()) {
              console.log('Riconnessione avvenuta con successo');
              this.emit('reconnected');
              
              // Riconnettiti ai peer presenti nella stanza
              if (this.roomId) {
                signalingService.joinRoom(this.roomId, this.peerId || '')
                  .then(() => {
                    console.log('Riconnesso alla stanza:', this.roomId);
                    this.emit('room_rejoined', this.roomId);
                  })
                  .catch(err => {
                    console.error('Errore nella riconnessione alla stanza:', err);
                  });
              }
            }
          }, 3000);
        } catch (error) {
          console.error('Errore nel tentativo di riconnessione:', error);
          this.reconnectWithBackoff(attempt + 1);
        }
      }
    }, delay);
  }

  // Gestione errori di rete
  private handleNetworkError(error: any): void {
    console.log('Gestione errore di rete:', error.type);
    
    // Notifica l'utente del problema di connessione
    this.emit('network_error', {
      type: error.type,
      message: error.message
    });
    
    // Tenta la riconnessione se non stiamo già provando
    if (!this.reconnectTimeout && this.peerId) {
      this.reconnectWithBackoff();
    }
  }

  // Tentativo di riconnessione a uno specifico peer
  private attemptPeerReconnection(peerId: string): void {
    console.log(`Tentativo di riconnessione al peer ${peerId}`);
    this.connectionManager.handlePeerDisconnection(peerId);
    setTimeout(() => {
      this.connectToPeer(peerId);
    }, 1000);
  }

  // Connect to a peer
  private connectToPeer(peerId: string): void {
    if (!this.peer) {
      throw new Error('Peer non inizializzato');
    }

    const conn = this.peer.connect(peerId);
    this.connectionManager.handleIncomingConnection(conn);
  }

  // Join a room using the signaling service
  async joinRoom(roomId: string): Promise<void> {
    if (!this.peerId) {
      throw new Error('Peer non inizializzato. Chiamare initialize() prima di joinRoom()');
    }

    try {
      await signalingService.joinRoom(roomId, this.peerId);
      this.roomId = roomId;
      this.emit('room_joined', roomId);
      
      // Salva le informazioni utente per eventuali riconnessioni
      const userInfo = {
        id: this.peerId,
        name: localStorage.getItem('username') || 'Utente',
        isAI: false,
        role: localStorage.getItem('userRole') || 'Partecipante'
      };
      
      this.connectionManager.updateUserInfo(userInfo);
    } catch (error) {
      console.error(`Errore nell'entrare nella stanza ${roomId}:`, error);
      throw error;
    }
  }

  // Leave the current room
  async leaveRoom(): Promise<void> {
    if (this.roomId) {
      await signalingService.leaveRoom();
      this.roomId = null;
      this.emit('room_left');
      this.cleanup();
    }
  }

  // Start local media stream
  async startLocalStream(options: { audio: boolean, video: boolean }): Promise<MediaStream> {
    return this.streamManager.startLocalStream(options);
  }

  // Toggle audio
  toggleAudio(enabled: boolean): void {
    this.streamManager.toggleAudio(enabled);
  }

  // Toggle video
  toggleVideo(enabled: boolean): void {
    this.streamManager.toggleVideo(enabled);
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream> {
    return this.streamManager.startScreenShare();
  }

  // Stop screen sharing
  async stopScreenShare(): Promise<void> {
    return this.streamManager.stopScreenShare();
  }

  // Check if connected
  isConnected(): boolean {
    return !!this.peer && this.peer.disconnected === false && this.peer.destroyed === false;
  }

  // Get current peer ID
  getPeerId(): string | null {
    return this.peerId;
  }

  // Get current room ID
  getRoomId(): string | null {
    return this.roomId;
  }

  // Get participant info
  getParticipant(peerId: string): RoomParticipant | undefined {
    return this.connectionManager.getParticipant(peerId);
  }

  // Get all participants
  getAllParticipants(): Map<string, RoomParticipant> {
    return this.connectionManager.getAllParticipants();
  }

  // Cleanup resources
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.networkManager.cleanup();
    this.streamManager.cleanup();
    this.connectionManager.cleanup();
  }

  // Destroy peer instance and cleanup
  destroy(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.peerId = null;
    this.roomId = null;
    this.cleanup();
    this.emit('destroyed');
  }
}

// Export singleton instance
export const peerService = new PeerService();
