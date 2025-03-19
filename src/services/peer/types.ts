import { DataConnection, MediaConnection } from 'peerjs';

export interface PeerOptions {
  debug?: 0 | 1 | 2 | 3;
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
  config?: RTCConfiguration;
}

export interface PeerState {
  id: string;
  connection: DataConnection;
  call?: MediaConnection;
  stream?: MediaStream;
  audio: boolean;
  video: boolean;
}

export interface RoomParticipant {
  id: string;
  isAI: boolean;
  name: string;
  role: string;
  state?: {
    speaking: boolean;
    emotion: string;
    activity: string;
    position: { x: number; y: number; rotation: number };
  }
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastPingTime: number;
  lastPongTime: number;
  reconnectAttempts: number;
  iceCandidates: RTCIceCandidate[];
  connectionQuality: 'excellent' | 'good' | 'medium' | 'poor' | 'critical' | 'disconnected';
  networkStats: NetworkStats[];
}

export interface NetworkStats {
  packetsLost: number;
  roundTripTime: number;
  timestamp: number;
  jitter?: number;
  bandwidth?: number;
  bytesSent?: number;
  bytesReceived?: number;
}

export interface NetworkQualityMetrics {
  rtt: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
}

export interface BandwidthProbeResult {
  availableBandwidth: number;
  duration: number;
  bytesSent: number;
  bytesReceived: number;
  timestamp: number;
}

export interface MobileNetworkConfig {
  maxBitrate: number;
  maxResolution: {
    width: number;
    height: number;
  };
  maxFrameRate: number;
  audioQuality: {
    sampleRate: number;
    channelCount: number;
  };
}

export interface VideoQualityPreset {
  width: number;
  height: number;
  frameRate: number;
  bitrate?: number;
}
