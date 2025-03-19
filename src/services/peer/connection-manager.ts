import { DataConnection, MediaConnection } from 'peerjs';
import { PeerState, RoomParticipant } from './types';

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

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, PeerState> = new Map();
  private participants: Map<string, RoomParticipant> = new Map();
  private lastKnownUserInfo: Partial<RoomParticipant> = {};

  constructor() {
    super();
  }

  // Gestisci connessione dati in entrata
  handleIncomingConnection(conn: DataConnection): void {
    const peerId = conn.peer;
    console.log(`Connessione in entrata da: ${peerId}`);
    
    conn.on('open', () => {
      console.log(`Connessione dati aperta con ${peerId}`);
      
      // Configura l'oggetto connessione
      const peerState: PeerState = {
        id: peerId,
        connection: conn,
        audio: true,
        video: true
      };
      
      this.connections.set(peerId, peerState);
      this.emit('peer_connected', peerId);
      
      // Invia le nostre informazioni partecipante
      this.sendParticipantInfo(peerId);
    });
    
    this.setupDataConnectionHandlers(conn);
  }

  // Gestisci chiamata in entrata
  handleIncomingCall(call: MediaConnection, localStream: MediaStream | null): void {
    const peerId = call.peer;
    console.log(`Chiamata in entrata da: ${peerId}`);
    
    const peerState = this.connections.get(peerId);
    if (!peerState) {
      console.error(`Chiamata ricevuta da un peer non connesso: ${peerId}`);
      call.close();
      return;
    }
    
    // Rispondi alla chiamata con il nostro stream se disponibile
    if (localStream) {
      call.answer(localStream);
    } else {
      console.warn('Risposta alla chiamata senza stream locale');
      call.answer();
    }
    
    call.on('stream', (remoteStream: MediaStream) => {
      console.log(`Stream remoto ricevuto da ${peerId}`);
      peerState.stream = remoteStream;
      this.connections.set(peerId, peerState);
      this.emit('stream', { peerId, stream: remoteStream });
    });
    
    call.on('close', () => {
      console.log(`Chiamata chiusa con ${peerId}`);
      // Non rimuovere la connessione qui, solo lo stream
      if (peerState.stream) {
        peerState.stream = undefined;
        this.connections.set(peerId, peerState);
        this.emit('stream_removed', peerId);
      }
    });
    
    call.on('error', (error) => {
      console.error(`Errore chiamata con ${peerId}:`, error);
      this.emit('call_error', { peerId, error });
    });
    
    peerState.call = call;
    this.connections.set(peerId, peerState);
  }

  // Configura i gestori eventi per la connessione dati
  private setupDataConnectionHandlers(conn: DataConnection): void {
    conn.on('data', (data: any) => {
      this.handleDataMessage(conn.peer, data);
    });

    conn.on('close', () => {
      this.handlePeerDisconnection(conn.peer);
    });

    conn.on('error', (error) => {
      console.error(`Errore connessione dati con ${conn.peer}:`, error);
      this.emit('connection_error', { peerId: conn.peer, error });
    });
  }

  // Gestisci messaggi dati in arrivo
  private handleDataMessage(peerId: string, data: any): void {
    switch (data.type) {
      case 'participant_info':
        this.handleParticipantInfo(peerId, data);
        break;
      default:
        console.log(`Messaggio dati ricevuto da ${peerId}:`, data);
        this.emit('data', { peerId, data });
    }
  }

  // Gestisci informazioni partecipante
  private handleParticipantInfo(peerId: string, data: any): void {
    this.participants.set(peerId, data.data);
    this.emit('participant_updated', { peerId, participant: data.data });
  }

  // Gestisci disconnessione peer
  handlePeerDisconnection(peerId: string): void {
    const peerState = this.connections.get(peerId);
    if (peerState) {
      if (peerState.call) {
        peerState.call.close();
      }
      if (peerState.connection && peerState.connection.open) {
        peerState.connection.close();
      }
      this.connections.delete(peerId);
      this.participants.delete(peerId);
      this.emit('peer_disconnected', peerId);
    }
  }

  // Invia informazioni partecipante a un peer specifico
  sendParticipantInfo(peerId: string): void {
    const peerState = this.connections.get(peerId);
    if (peerState && peerState.connection && peerState.connection.open) {
      peerState.connection.send({
        type: 'participant_info',
        data: this.lastKnownUserInfo
      });
    }
  }

  // Aggiorna le informazioni utente locali
  updateUserInfo(info: Partial<RoomParticipant>): void {
    this.lastKnownUserInfo = { ...this.lastKnownUserInfo, ...info };
    
    // Invia aggiornamento a tutti i peer connessi
    this.connections.forEach((state, peerId) => {
      this.sendParticipantInfo(peerId);
    });
  }

  // Ottieni una connessione peer specifica
  getConnection(peerId: string): PeerState | undefined {
    return this.connections.get(peerId);
  }

  // Ottieni tutte le connessioni
  getAllConnections(): Map<string, PeerState> {
    return this.connections;
  }

  // Ottieni informazioni di un partecipante
  getParticipant(peerId: string): RoomParticipant | undefined {
    return this.participants.get(peerId);
  }

  // Ottieni tutti i partecipanti
  getAllParticipants(): Map<string, RoomParticipant> {
    return this.participants;
  }

  // Pulisci tutte le connessioni
  cleanup(): void {
    this.connections.forEach((state, peerId) => {
      this.handlePeerDisconnection(peerId);
    });
    this.connections.clear();
    this.participants.clear();
  }
}
