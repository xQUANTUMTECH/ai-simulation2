import { io, Socket } from 'socket.io-client';
import { EventEmitter } from '../utils/event-emitter';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'join' | 'leave' | 'participants';
  sender: string;
  receiver?: string;
  room?: string;
  payload?: any;
}

class SignalingService extends EventEmitter {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private currentRoom: string | null = null;
  private serverUrl: string = 'http://localhost:3001'; // URL del server di segnalazione
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.handleMessage = this.handleMessage.bind(this);
  }

  // Connessione al server signaling
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        console.log('Già connesso al server di segnalazione');
        resolve();
        return;
      }

      try {
        this.socket = io(this.serverUrl, {
          reconnection: true,
          reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true
        });

        this.socket.on('connect', () => {
          console.log('Connesso al server di segnalazione');
          this.connected = true;
          this.reconnectAttempts = 0;
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnesso dal server di segnalazione');
          this.connected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.socket.on('error', (error) => {
          console.error('Errore socket:', error);
          reject(error);
        });

        this.socket.on('message', (message: SignalingMessage) => {
          this.handleMessage(message);
        });

        this.socket.on('participants', (participants: string[]) => {
          this.emit('participants', participants);
        });

      } catch (error) {
        console.error('Errore nella connessione al server di segnalazione:', error);
        reject(error);
      }
    });
  }

  // Tentativo di riconnessione
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Numero massimo di tentativi di riconnessione raggiunto');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Tentativo di riconnessione ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.connected && this.socket) {
        this.socket.connect();
      }
    }, 2000 * this.reconnectAttempts);
  }

  // Gestione dei messaggi in arrivo
  private handleMessage(message: SignalingMessage): void {
    if (!message || !message.type) {
      console.error('Messaggio ricevuto non valido:', message);
      return;
    }

    // Se il messaggio non è destinato a noi, ignoriamolo
    if (message.receiver && message.receiver !== this.userId) {
      return;
    }

    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'candidate':
        this.emit('signaling', message);
        break;
      case 'participants':
        this.emit('participants', message.payload);
        break;
      case 'join':
        this.emit('user_joined', message.sender);
        break;
      case 'leave':
        this.emit('user_left', message.sender);
        break;
      default:
        console.log('Messaggio di tipo sconosciuto:', message);
    }
  }

  // Invio di un messaggio
  sendMessage(message: SignalingMessage): void {
    if (!this.socket || !this.connected) {
      console.error('Impossibile inviare messaggi: non connesso');
      return;
    }

    this.socket.emit('message', {
      ...message,
      sender: this.userId
    });
  }

  // Ingresso in una stanza
  joinRoom(roomId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        this.connect()
          .then(() => this.joinRoomInternal(roomId, userId, resolve, reject))
          .catch(reject);
        return;
      }

      this.joinRoomInternal(roomId, userId, resolve, reject);
    });
  }

  private joinRoomInternal(
    roomId: string,
    userId: string,
    resolve: () => void,
    reject: (reason?: any) => void
  ): void {
    this.userId = userId;
    this.currentRoom = roomId;

    this.socket!.emit('join', { room: roomId, userId }, (response: { success: boolean; error?: string; participants?: string[] }) => {
      if (response.success) {
        console.log(`Entrato nella stanza ${roomId}`);
        if (response.participants) {
          this.emit('participants', response.participants);
        }
        resolve();
      } else {
        console.error(`Errore nell'entrare nella stanza: ${response.error}`);
        reject(new Error(response.error));
      }
    });
  }

  // Uscita da una stanza
  leaveRoom(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected || !this.currentRoom) {
        resolve();
        return;
      }

      this.socket.emit('leave', { room: this.currentRoom, userId: this.userId }, () => {
        console.log(`Uscito dalla stanza ${this.currentRoom}`);
        this.currentRoom = null;
        resolve();
      });
    });
  }

  // Disconnessione dal server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentRoom = null;
      this.userId = null;
    }
  }

  // Getters per informazioni correnti
  get isConnected(): boolean {
    return this.connected;
  }

  get currentUserId(): string | null {
    return this.userId;
  }

  get currentRoomId(): string | null {
    return this.currentRoom;
  }
}

export const signalingService = new SignalingService();
