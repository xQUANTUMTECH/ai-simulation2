import { ConnectionStatus, NetworkStats, BandwidthProbeResult } from './types';
import { 
  CONNECTION_QUALITY_THRESHOLDS, 
  NETWORK_MONITORING, 
  BANDWIDTH_OPTIMIZATION,
  MOBILE_OPTIMIZATIONS 
} from './video-config';

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

export class NetworkManager extends EventEmitter {
  private connectionStatuses: Map<string, ConnectionStatus> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private networkMonitorInterval: NodeJS.Timeout | null = null;
  private bandwidthProbeInterval: NodeJS.Timeout | null = null;
  private lastQualityDowngrade: number = 0;
  private upgradeAttempts: number = 0;
  private isMobileDevice: boolean = false;
  private currentNetworkType: '4g' | '3g' | 'slow' | null = null;

  constructor() {
    super();
    this.detectDeviceAndNetwork();
  }

  private detectDeviceAndNetwork(): void {
    // Rileva se è un dispositivo mobile
    this.isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);

    // Rileva tipo di connessione se disponibile
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.updateNetworkType(connection);
      });
      
      this.updateNetworkType(connection);
    }
  }

  private updateNetworkType(connection: any): void {
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink; // Mbps

    if (effectiveType === '4g' || downlink >= 1.5) {
      this.currentNetworkType = '4g';
    } else if (effectiveType === '3g' || downlink >= 0.5) {
      this.currentNetworkType = '3g';
    } else {
      this.currentNetworkType = 'slow';
    }

    // Emetti evento per aggiornare la qualità in base al tipo di rete
    this.emit('network_type_changed', {
      type: this.currentNetworkType,
      optimization: MOBILE_OPTIMIZATIONS[this.currentNetworkType]
    });
  }

  // Avvia monitoraggio connessione con ping/pong
  startConnectionHeartbeat(connections: Map<string, any>, attemptReconnection: (peerId: string) => void): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      connections.forEach((state, peerId) => {
        const now = Date.now();
        
        // Ottieni o crea lo stato della connessione
        let connStatus = this.connectionStatuses.get(peerId);
        if (!connStatus) {
          connStatus = {
            isConnected: true,
            lastPingTime: now,
            lastPongTime: now,
            reconnectAttempts: 0,
            iceCandidates: [],
            connectionQuality: 'good',
            networkStats: []
          };
        }
        
        // Verifica timeout se non riceviamo pong da troppo tempo
        if (now - connStatus.lastPongTime > NETWORK_MONITORING.pingTimeout) {
          console.warn(`Timeout ping per peer ${peerId}, verifico connessione`);
          if (connStatus.isConnected) {
            connStatus.isConnected = false;
            connStatus.connectionQuality = 'disconnected';
            this.connectionStatuses.set(peerId, connStatus);
            
            // Prova a riconnettere il singolo peer
            attemptReconnection(peerId);
          }
        }
        
        // Invia messaggio ping se la connessione è aperta
        if (state.connection && state.connection.open) {
          try {
            state.connection.send({
              type: 'ping',
              timestamp: now
            });
            
            connStatus.lastPingTime = now;
            this.connectionStatuses.set(peerId, connStatus);
          } catch (error) {
            console.error(`Errore invio ping a ${peerId}:`, error);
            // Marca come disconnesso e tenta riconnessione
            connStatus.isConnected = false;
            connStatus.connectionQuality = 'disconnected';
            this.connectionStatuses.set(peerId, connStatus);
            
            attemptReconnection(peerId);
          }
        }
      });
    }, NETWORK_MONITORING.pingInterval);
  }

  // Ferma il monitoraggio della connessione
  stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Avvia monitoraggio statistiche di rete
  startNetworkMonitoring(connections: Map<string, any>): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
    }
    
    this.networkMonitorInterval = setInterval(() => {
      connections.forEach((state, peerId) => {
        if (state.call && state.call.peerConnection) {
          this.collectNetworkStats(peerId, state.call.peerConnection);
        }
      });
      
      // Emetti evento per adattare la qualità video
      this.emit('quality_update', this.getWorstConnectionQuality());
    }, NETWORK_MONITORING.statsInterval);

    // Avvia il monitoraggio della bandwidth se abilitato
    if (NETWORK_MONITORING.bandwidthProbing.enabled) {
      this.startBandwidthProbing(connections);
    }
  }

  // Ferma il monitoraggio delle statistiche di rete
  stopNetworkMonitoring(): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
      this.networkMonitorInterval = null;
    }
    if (this.bandwidthProbeInterval) {
      clearInterval(this.bandwidthProbeInterval);
      this.bandwidthProbeInterval = null;
    }
  }

  // Avvia il monitoraggio della bandwidth
  private startBandwidthProbing(connections: Map<string, any>): void {
    if (this.bandwidthProbeInterval) {
      clearInterval(this.bandwidthProbeInterval);
    }

    this.bandwidthProbeInterval = setInterval(() => {
      connections.forEach((state, peerId) => {
        if (state.call?.peerConnection) {
          this.probeBandwidth(peerId, state.call.peerConnection);
        }
      });
    }, NETWORK_MONITORING.bandwidthProbing.interval);
  }

  // Esegue un test della bandwidth
  private async probeBandwidth(peerId: string, peerConnection: RTCPeerConnection): Promise<void> {
    try {
      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) return;

      const parameters = sender.getParameters();
      if (!parameters.encodings) {
        parameters.encodings = [{}];
      }

      // Aumenta temporaneamente il bitrate per testare la bandwidth
      const originalBitrate = parameters.encodings[0].maxBitrate;
      parameters.encodings[0].maxBitrate = NETWORK_MONITORING.bandwidthProbing.maxBandwidth;

      await sender.setParameters(parameters);

      // Raccogli statistiche durante il test
      const startTime = Date.now();
      const initialStats = await this.collectDetailedStats(peerConnection);
      
      await new Promise(resolve => setTimeout(resolve, NETWORK_MONITORING.bandwidthProbing.duration));
      
      const finalStats = await this.collectDetailedStats(peerConnection);

      // Ripristina il bitrate originale
      parameters.encodings[0].maxBitrate = originalBitrate;
      await sender.setParameters(parameters);

      // Calcola la bandwidth disponibile
      const bytesSent = finalStats.bytesSent - initialStats.bytesSent;
      const duration = (Date.now() - startTime) / 1000;
      const bandwidthBps = (bytesSent * 8) / duration;

      // Aggiorna lo stato della connessione con la bandwidth misurata
      this.updateConnectionQuality(peerId, { bandwidth: bandwidthBps });

      // Emetti risultato del probe
      const probeResult: BandwidthProbeResult = {
        availableBandwidth: bandwidthBps,
        duration: duration * 1000,
        bytesSent,
        bytesReceived: finalStats.bytesReceived - initialStats.bytesReceived,
        timestamp: Date.now()
      };
      this.emit('bandwidth_probe_result', { peerId, result: probeResult });

    } catch (error) {
      console.error('Errore durante il probe della bandwidth:', error);
    }
  }

  // Raccoglie statistiche dettagliate di rete
  private async collectDetailedStats(peerConnection: RTCPeerConnection): Promise<{
    bytesSent: number;
    bytesReceived: number;
    packetsLost: number;
    roundTripTime: number;
    jitter: number;
  }> {
    const stats = await peerConnection.getStats();
    let result = {
      bytesSent: 0,
      bytesReceived: 0,
      packetsLost: 0,
      roundTripTime: 0,
      jitter: 0
    };

    stats.forEach(stat => {
      if (stat.type === 'outbound-rtp') {
        result.bytesSent += stat.bytesSent || 0;
      } else if (stat.type === 'inbound-rtp') {
        result.bytesReceived += stat.bytesReceived || 0;
        result.packetsLost += stat.packetsLost || 0;
        result.jitter += stat.jitter || 0;
      } else if (stat.type === 'remote-candidate') {
        result.roundTripTime += stat.roundTripTime || 0;
      }
    });

    return result;
  }

  // Raccoglie statistiche di rete da una connessione WebRTC
  private async collectNetworkStats(peerId: string, peerConnection: RTCPeerConnection): Promise<void> {
    try {
      const detailedStats = await this.collectDetailedStats(peerConnection);
      
      // Ottieni o crea lo stato della connessione
      let connStatus = this.connectionStatuses.get(peerId);
      if (!connStatus) {
        connStatus = {
          isConnected: true,
          lastPingTime: Date.now(),
          lastPongTime: Date.now(),
          reconnectAttempts: 0,
          iceCandidates: [],
          connectionQuality: 'good',
          networkStats: []
        };
      }
      
      // Aggiungi statistiche
      const newStats: NetworkStats = {
        packetsLost: detailedStats.packetsLost,
        roundTripTime: detailedStats.roundTripTime,
        jitter: detailedStats.jitter,
        bytesSent: detailedStats.bytesSent,
        bytesReceived: detailedStats.bytesReceived,
        timestamp: Date.now()
      };
      
      connStatus.networkStats.push(newStats);
      
      // Mantieni solo le ultime N statistiche
      if (connStatus.networkStats.length > NETWORK_MONITORING.maxStats) {
        connStatus.networkStats.shift();
      }
      
      // Aggiorna qualità connessione
      connStatus.connectionQuality = this.evaluateConnectionQuality(connStatus.networkStats);
      
      this.connectionStatuses.set(peerId, connStatus);
      
      // Emetti evento con stato aggiornato
      this.emit('connection_quality', {
        peerId,
        quality: connStatus.connectionQuality,
        stats: newStats
      });

      // Verifica se è necessario adattare la qualità
      this.checkQualityAdaptation(peerId, connStatus);
      
    } catch (error) {
      console.error(`Errore raccolta statistiche per ${peerId}:`, error);
    }
  }

  // Verifica se è necessario adattare la qualità
  private checkQualityAdaptation(peerId: string, status: ConnectionStatus): void {
    const recentStats = status.networkStats.slice(-NETWORK_MONITORING.minSamplesForQuality);
    if (recentStats.length < NETWORK_MONITORING.minSamplesForQuality) return;

    const avgPacketLoss = recentStats.reduce((sum, stat) => sum + stat.packetsLost, 0) / recentStats.length;
    const avgRTT = recentStats.reduce((sum, stat) => sum + stat.roundTripTime, 0) / recentStats.length;
    const avgBandwidth = recentStats.reduce((sum, stat) => sum + (stat.bandwidth || 0), 0) / recentStats.length;

    const needsDowngrade = 
      avgPacketLoss > BANDWIDTH_OPTIMIZATION.downgradeTriggers.packetLossThreshold ||
      avgRTT > BANDWIDTH_OPTIMIZATION.downgradeTriggers.rttThreshold ||
      (avgBandwidth > 0 && avgBandwidth < this.getCurrentBandwidthThreshold());

    if (needsDowngrade && Date.now() - this.lastQualityDowngrade > BANDWIDTH_OPTIMIZATION.upgradeIntervals.initial) {
      this.lastQualityDowngrade = Date.now();
      this.upgradeAttempts = 0;
      
      this.emit('quality_downgrade', {
        peerId,
        reason: {
          packetLoss: avgPacketLoss > BANDWIDTH_OPTIMIZATION.downgradeTriggers.packetLossThreshold,
          rtt: avgRTT > BANDWIDTH_OPTIMIZATION.downgradeTriggers.rttThreshold,
          bandwidth: avgBandwidth < this.getCurrentBandwidthThreshold()
        }
      });
    }

    // Verifica se è possibile un upgrade
    const canUpgrade = 
      this.upgradeAttempts < BANDWIDTH_OPTIMIZATION.upgradeIntervals.maxAttempts &&
      Date.now() - this.lastQualityDowngrade > this.getNextUpgradeInterval();

    if (canUpgrade && this.isNetworkStable(recentStats)) {
      this.upgradeAttempts++;
      this.emit('quality_upgrade', { peerId });
    }
  }

  // Valuta la qualità della connessione dalle statistiche
  private evaluateConnectionQuality(stats: NetworkStats[]): ConnectionStatus['connectionQuality'] {
    if (stats.length < NETWORK_MONITORING.minSamplesForQuality) {
      return 'good';
    }

    const recentStats = stats.slice(-NETWORK_MONITORING.minSamplesForQuality);
    const avgPacketLoss = recentStats.reduce((sum, stat) => sum + stat.packetsLost, 0) / recentStats.length;
    const avgRTT = recentStats.reduce((sum, stat) => sum + stat.roundTripTime, 0) / recentStats.length;
    const avgJitter = recentStats.reduce((sum, stat) => sum + (stat.jitter || 0), 0) / recentStats.length;
    const avgBandwidth = recentStats.reduce((sum, stat) => sum + (stat.bandwidth || 0), 0) / recentStats.length;

    const { excellent, good, medium, poor, critical } = CONNECTION_QUALITY_THRESHOLDS;

    if (avgRTT <= excellent.rtt && avgPacketLoss <= excellent.packetLoss && 
        avgJitter <= excellent.jitter && avgBandwidth >= excellent.bandwidth) {
      return 'excellent';
    } else if (avgRTT <= good.rtt && avgPacketLoss <= good.packetLoss && 
               avgJitter <= good.jitter && avgBandwidth >= good.bandwidth) {
      return 'good';
    } else if (avgRTT <= medium.rtt && avgPacketLoss <= medium.packetLoss && 
               avgJitter <= medium.jitter && avgBandwidth >= medium.bandwidth) {
      return 'medium';
    } else if (avgRTT <= poor.rtt && avgPacketLoss <= poor.packetLoss && 
               avgJitter <= poor.jitter && avgBandwidth >= poor.bandwidth) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  // Verifica se la rete è stabile per un potenziale upgrade
  private isNetworkStable(recentStats: NetworkStats[]): boolean {
    const variations = recentStats.slice(1).map((stat, i) => ({
      rttChange: Math.abs(stat.roundTripTime - recentStats[i].roundTripTime),
      packetLossChange: Math.abs(stat.packetsLost - recentStats[i].packetsLost),
      jitterChange: Math.abs((stat.jitter || 0) - (recentStats[i].jitter || 0))
    }));

    const avgRttVariation = variations.reduce((sum, v) => sum + v.rttChange, 0) / variations.length;
    const avgPacketLossVariation = variations.reduce((sum, v) => sum + v.packetLossChange, 0) / variations.length;
    const avgJitterVariation = variations.reduce((sum, v) => sum + v.jitterChange, 0) / variations.length;

    return avgRttVariation < 50 && avgPacketLossVariation < 1 && avgJitterVariation < 5;
  }

  // Ottieni la peggiore qualità di connessione tra tutti i peer
  private getWorstConnectionQuality(): ConnectionStatus['connectionQuality'] {
    let worstQuality: ConnectionStatus['connectionQuality'] = 'excellent';
    
    this.connectionStatuses.forEach((status) => {
      const currentRank = this.getQualityRank(status.connectionQuality);
      const worstRank = this.getQualityRank(worstQuality);
      
      if (currentRank > worstRank) {
        worstQuality = status.connectionQuality;
      }
    });
    
    return worstQuality;
  }

  // Helper per confrontare la qualità della connessione
  private getQualityRank(quality: ConnectionStatus['connectionQuality']): number {
    const ranks = {
      'excellent': 0,
      'good': 1,
      'medium': 2,
      'poor': 3,
      'critical': 4,
      'disconnected': 5
    };
    return ranks[quality];
  }

  // Calcola l'intervallo per il prossimo tentativo di upgrade
  private getNextUpgradeInterval(): number {
    return BANDWIDTH_OPTIMIZATION.upgradeIntervals.initial + 
           (this.upgradeAttempts * BANDWIDTH_OPTIMIZATION.upgradeIntervals.subsequent);
  }

  // Ottiene la soglia di bandwidth corrente basata sul tipo di rete
  private getCurrentBandwidthThreshold(): number {
    if (this.isMobileDevice && this.currentNetworkType) {
      return MOBILE_OPTIMIZATIONS[this.currentNetworkType].maxBitrate;
    }
    return NETWORK_MONITORING.bandwidthProbing.maxBandwidth;
  }

  // Aggiorna le statistiche di rete e la qualità della connessione
  private updateConnectionQuality(peerId: string, metrics: Partial<NetworkStats>): void {
    const connStatus = this.connectionStatuses.get(peerId);
    if (!connStatus) return;

    const lastStat = connStatus.networkStats[connStatus.networkStats.length - 1] || {
      packetsLost: 0,
      roundTripTime: 0,
      timestamp: Date.now()
    };

    const newStat: NetworkStats = {
      ...lastStat,
      ...metrics,
      timestamp: Date.now()
    };
    
    connStatus.networkStats.push(newStat);
    if (connStatus.networkStats.length > NETWORK_MONITORING.maxStats) {
      connStatus.networkStats.shift();
    }

    connStatus.connectionQuality = this.evaluateConnectionQuality(connStatus.networkStats);
    this.connectionStatuses.set(peerId, connStatus);

    this.emit('connection_quality', {
      peerId,
      quality: connStatus.connectionQuality,
      stats: newStat
    });
  }

  // Gestisci ricezione di un pong
  handlePong(peerId: string): void {
    const connStatus = this.connectionStatuses.get(peerId);
    if (connStatus) {
      connStatus.lastPongTime = Date.now();
      this.connectionStatuses.set(peerId, connStatus);
    }
  }

  // Resetta lo stato per un peer
  resetPeerStatus(peerId: string): void {
    this.connectionStatuses.delete(peerId);
  }

  // Pulisci tutte le risorse
  cleanup(): void {
    this.stopHeartbeat();
    this.stopNetworkMonitoring();
    this.connectionStatuses.clear();
  }
}
