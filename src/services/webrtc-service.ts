import { EventEmitter } from '../utils/event-emitter';

interface RTCPeerConfig {
  iceServers: Array<{
    urls: string[];
    username?: string;
    credential?: string;
  }>;
  iceTransportPolicy?: 'all' | 'relay';
  bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat';
}

interface MediaConstraints {
  audio: boolean;
  video: boolean | {
    width?: { min?: number; ideal?: number; max?: number };
    height?: { min?: number; ideal?: number; max?: number };
    frameRate?: { min?: number; ideal?: number; max?: number };
  };
}

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  stream?: MediaStream;
  isInitiator: boolean;
  isConnected: boolean;
  lastActivity: Date;
}

export interface WebRTCMessage {
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  sender: string;
  receiver?: string;
  payload: any;
}

class WebRTCService extends EventEmitter {
  private peerConnections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private roomId: string | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_INTERVAL = 2000; // 2 seconds

  private readonly configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    super();
    this.handleSignalingMessage = this.handleSignalingMessage.bind(this);
    this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);
    this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(this);
    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
  }

  async joinRoom(roomId: string, options: { audio: boolean; video: boolean }) {
    try {
      this.roomId = roomId;
      
      // Stop any existing streams
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Get media stream with specified constraints
      const constraints: MediaConstraints = {
        audio: options.audio,
        video: options.video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(options);
      this.emit('localStream', this.localStream);

      // Connect to signaling server and announce presence
      this.emit('joined', { roomId, userId: this.getUserId() });
      
      // Set up heartbeat to monitor connections
      this.startHeartbeat();
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async leaveRoom() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(peer => {
      peer.connection.close();
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
    });

    this.peerConnections.clear();
    this.roomId = null;
    this.reconnectAttempts.clear();

    this.emit('left');
  }

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(this.configuration);

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Create data channel
    const dataChannel = peerConnection.createDataChannel('data');
    this.setupDataChannel(dataChannel);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('message', {
          type: 'candidate',
          sender: this.getUserId(),
          receiver: peerId,
          payload: event.candidate
        });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      this.emit('remoteStream', { peerId, stream: event.streams[0] });
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      this.emit('connectionStateChange', {
        peerId,
        state: peerConnection.connectionState
      });
    };

    // Store peer connection
    this.peerConnections.set(peerId, {
      id: peerId,
      connection: peerConnection,
      dataChannel,
      isInitiator: true,
      isConnected: false,
      lastActivity: new Date()
    });

    return peerConnection;
  }
  private handleConnectionStateChange(peerId: string, connection: RTCPeerConnection) {
    const state = connection.connectionState;
    const peer = this.peerConnections.get(peerId);
    
    if (!peer) return;
    
    switch (state) {
      case 'connected':
        peer.isConnected = true;
        peer.lastActivity = new Date();
        this.reconnectAttempts.delete(peerId);
        this.emit('peerConnected', peerId);
        break;
        
      case 'disconnected':
      case 'failed':
        peer.isConnected = false;
        this.attemptReconnection(peerId);
        break;
        
      case 'closed':
        this.peerConnections.delete(peerId);
        this.emit('peerDisconnected', peerId);
        break;
    }
    
    this.emit('connectionStateChange', { peerId, state });
  }

  private handleIceConnectionStateChange(peerId: string, connection: RTCPeerConnection) {
    const state = connection.iceConnectionState;
    
    if (state === 'failed') {
      // Try ICE restart
      connection.restartIce();
    }
    
    this.emit('iceConnectionStateChange', { peerId, state });
  }

  private async handleNegotiationNeeded(peerId: string, connection: RTCPeerConnection) {
    try {
      const peer = this.peerConnections.get(peerId);
      if (!peer?.isInitiator) return;
      
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      
      this.emit('message', {
        type: 'offer',
        sender: this.getUserId(),
        receiver: peerId,
        payload: offer
      });
    } catch (error) {
      console.error('Error during negotiation:', error);
    }
  }

  private async attemptReconnection(peerId: string) {
    const attempts = this.reconnectAttempts.get(peerId) || 0;
    
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.handlePeerLeave(peerId);
      return;
    }
    
    this.reconnectAttempts.set(peerId, attempts + 1);
    
    setTimeout(async () => {
      try {
        const connection = await this.createPeerConnection(peerId);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        
        this.emit('message', {
          type: 'offer',
          sender: this.getUserId(),
          receiver: peerId,
          payload: offer
        });
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
      }
    }, this.RECONNECT_INTERVAL * (attempts + 1));
  }

  private startHeartbeat() {
    setInterval(() => {
      this.peerConnections.forEach((peer, peerId) => {
        if (peer.isConnected) {
          try {
            peer.dataChannel?.send(JSON.stringify({ type: 'heartbeat' }));
            peer.lastActivity = new Date();
          } catch (error) {
            // Connection might be dead
            if (Date.now() - peer.lastActivity.getTime() > 10000) { // 10 seconds
              this.attemptReconnection(peerId);
            }
          }
        }
      });
    }, 5000); // Every 5 seconds
  }

  private setupDataChannel(dataChannel: RTCDataChannel) {
    dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'heartbeat') return;
        this.emit('data', message);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  async handleSignalingMessage(message: WebRTCMessage) {
    const { type, sender, payload } = message;

    switch (type) {
      case 'offer':
        const peerConnection = await this.createPeerConnection(sender);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        this.emit('message', {
          type: 'answer',
          sender: this.getUserId(),
          receiver: sender,
          payload: answer
        });
        break;

      case 'answer':
        const peer = this.peerConnections.get(sender);
        if (peer) {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(payload));
        }
        break;

      case 'candidate':
        const peerWithCandidate = this.peerConnections.get(sender);
        if (peerWithCandidate) {
          await peerWithCandidate.connection.addIceCandidate(new RTCIceCandidate(payload));
        }
        break;

      case 'leave':
        this.handlePeerLeave(sender);
        break;
    }
  }

  private handlePeerLeave(peerId: string) {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.connection.close();
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
      this.peerConnections.delete(peerId);
      this.emit('peerLeft', peerId);
    }
  }

  sendData(data: any) {
    const message = JSON.stringify(data);
    this.peerConnections.forEach(peer => {
      if (peer.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(message);
      }
    });
  }

  private getUserId(): string {
    // In a real application, this would come from your authentication system
    return crypto.randomUUID();
  }

  // Media control methods
  async toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('audioToggled', enabled);
    }
  }

  async toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('videoToggled', enabled);
    }
  }

  // Screen sharing
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      this.peerConnections.forEach(peer => {
        const sender = peer.connection
          .getSenders()
          .find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      this.emit('screenShareStarted', screenStream);

      // Handle screen share stop
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      this.peerConnections.forEach(peer => {
        const sender = peer.connection
          .getSenders()
          .find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });

      this.emit('screenShareStopped');
    }
  }
}

export const webRTCService = new WebRTCService();
