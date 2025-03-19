import { VideoQualityPreset } from './types';

export const VIDEO_QUALITY_PRESETS: Record<string, VideoQualityPreset> = {
  high: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000 // 2.5 Mbps
  },
  medium: {
    width: 640,
    height: 480,
    frameRate: 25,
    bitrate: 1000000 // 1 Mbps
  },
  low: {
    width: 320,
    height: 240,
    frameRate: 15,
    bitrate: 500000 // 500 Kbps
  },
  mobile: {
    width: 480,
    height: 360,
    frameRate: 20,
    bitrate: 800000 // 800 Kbps
  }
};

export const DEFAULT_ICE_SERVERS = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Cloudflare STUN servers
  { urls: 'stun:stun.cloudflare.com:3478' },
  
  // OpenRelay STUN/TURN servers
  { 
    urls: [
      'stun:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export const DEFAULT_PEER_OPTIONS = {
  debug: 1, // 0 = errors only, 1 = warnings, 2 = all logs
  config: {
    iceServers: DEFAULT_ICE_SERVERS
  }
};

export const RECONNECT_SETTINGS = {
  initialDelay: 500,      // 500ms per una riconnessione più rapida
  maxDelay: 15000,        // 15 secondi max per evitare attese troppo lunghe
  factor: 1.3,            // Fattore di incremento più graduale
  jitter: 0.1,            // 10% di jitter per evitare riconnessioni simultanee
  maxAttempts: 10,        // Numero massimo di tentativi
  resetAfter: 60000       // Reset contatore tentativi dopo 1 minuto di connessione stabile
};

export const NETWORK_MONITORING = {
  pingInterval: 5000,     // 5 secondi tra i ping per rilevare problemi più velocemente
  pingTimeout: 10000,     // 10 secondi prima di considerare un peer disconnesso
  statsInterval: 2000,    // 2 secondi tra le raccolte di statistiche
  maxStats: 30,          // 30 statistiche per un'analisi più accurata
  minSamplesForQuality: 5, // Minimo campioni per valutare la qualità
  bandwidthProbing: {
    enabled: true,
    interval: 30000,      // Prova bandwidth ogni 30 secondi
    duration: 2000,       // Test dura 2 secondi
    maxBandwidth: 5000000 // 5 Mbps max per il test
  }
};

export const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: { rtt: 100, packetLoss: 0.5, jitter: 10, bandwidth: 2000000 },  // 2 Mbps
  good: { rtt: 200, packetLoss: 2, jitter: 30, bandwidth: 1000000 },        // 1 Mbps
  medium: { rtt: 300, packetLoss: 5, jitter: 50, bandwidth: 500000 },       // 500 Kbps
  poor: { rtt: 500, packetLoss: 10, jitter: 100, bandwidth: 250000 },       // 250 Kbps
  critical: { rtt: 1000, packetLoss: 20, jitter: 200, bandwidth: 100000 }   // 100 Kbps
};

// Configurazioni specifiche per dispositivi mobili
export const MOBILE_OPTIMIZATIONS = {
  // Preset per connessioni 4G
  '4g': {
    maxBitrate: 1500000,  // 1.5 Mbps
    maxResolution: { width: 640, height: 480 },
    maxFrameRate: 25,
    audioQuality: { sampleRate: 32000, channelCount: 1 }
  },
  // Preset per connessioni 3G
  '3g': {
    maxBitrate: 500000,   // 500 Kbps
    maxResolution: { width: 480, height: 360 },
    maxFrameRate: 20,
    audioQuality: { sampleRate: 16000, channelCount: 1 }
  },
  // Preset per connessioni lente
  'slow': {
    maxBitrate: 250000,   // 250 Kbps
    maxResolution: { width: 320, height: 240 },
    maxFrameRate: 15,
    audioQuality: { sampleRate: 8000, channelCount: 1 }
  }
};

// Configurazioni per l'ottimizzazione della bandwidth
export const BANDWIDTH_OPTIMIZATION = {
  // Soglie per il downgrade automatico della qualità
  downgradeTriggers: {
    packetLossThreshold: 5,    // 5% packet loss
    rttThreshold: 500,         // 500ms RTT
    bandwidthThreshold: 0.8    // 80% della bandwidth disponibile
  },
  // Intervalli per il tentativo di upgrade della qualità
  upgradeIntervals: {
    initial: 30000,            // 30 secondi dopo un downgrade
    subsequent: 60000,         // 1 minuto tra tentativi successivi
    maxAttempts: 3             // Massimo 3 tentativi prima di stabilizzare
  },
  // Strategie di adattamento
  adaptiveStrategies: {
    prioritizeFramerate: true,  // Priorità al framerate rispetto alla risoluzione
    dynamicBitrate: true,      // Adattamento dinamico del bitrate
    gracefulDegradation: true  // Degradazione graduale della qualità
  }
};
