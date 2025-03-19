/**
 * Utility di monitoraggio performance per ottimizzare le simulazioni interattive
 * Rileva le capacità del dispositivo e fornisce API per adattare l'esperienza utente
 * in base alle prestazioni disponibili.
 */

export type DevicePerformanceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'unknown';

interface PerformanceMetrics {
  deviceType: DeviceType;
  performanceLevel: DevicePerformanceLevel;
  hasGpuAcceleration: boolean;
  frameRate: number;
  memoryInfo: MemoryInfo | null;
  batteryInfo: BatteryInfo | null;
  cpuCores: number;
  devicePixelRatio: number;
}

interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  available?: boolean;
}

interface BatteryInfo {
  charging?: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  level?: number;
  available?: boolean;
}

interface ThrottlingOptions {
  animationComplexity: 'full' | 'reduced' | 'minimal' | 'disabled';
  renderQuality: 'high' | 'medium' | 'low';
  enableGpuAcceleration: boolean;
  updateFrequency: number; // ms
  enableFancyEffects: boolean;
  enableLazyLoading: boolean;
  memoryManagementLevel: 'aggressive' | 'balanced' | 'minimal';
}

/**
 * Classe singleton per il monitoraggio e l'ottimizzazione delle performance
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private throttlingOptions: ThrottlingOptions;
  private frameRateHistory: number[] = [];
  private lastFrameTime: number = 0;
  private frameRateMonitorActive: boolean = false;
  private framerateCheckInterval: number | null = null;
  private memoryMonitorInterval: number | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private onPerformanceChangeCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  
  private constructor() {
    // Inizializza i valori di default
    this.metrics = {
      deviceType: 'unknown',
      performanceLevel: 'unknown',
      hasGpuAcceleration: false,
      frameRate: 60,
      memoryInfo: null,
      batteryInfo: null,
      cpuCores: this.detectCpuCores(),
      devicePixelRatio: window.devicePixelRatio || 1
    };
    
    this.throttlingOptions = {
      animationComplexity: 'full',
      renderQuality: 'high',
      enableGpuAcceleration: true,
      updateFrequency: 16, // ~60fps
      enableFancyEffects: true,
      enableLazyLoading: false,
      memoryManagementLevel: 'balanced'
    };
    
    // Rileva inizialmente il tipo di dispositivo
    this.detectDeviceType();
    
    // Avvia il rilevamento delle performance
    this.detectPerformanceCapabilities();
    
    // Configura osservatore performance per metriche supportate
    this.setupPerformanceObserver();
    
    // Monitora memoria se supportato
    this.startMemoryMonitoring();
    
    // Monitora batteria se supportato
    this.detectBatteryStatus();
    
    // Setup frame rate monitoring
    this.setupFrameRateMonitoring();
  }
  
  /**
   * Ottiene l'istanza singleton del monitor
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Rileva il tipo di dispositivo in base a user agent e dimensioni schermo
   */
  private detectDeviceType(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      this.metrics.deviceType = width >= 768 ? 'tablet' : 'mobile';
    } else {
      this.metrics.deviceType = 'desktop';
    }
    
    console.log(`Device type detected: ${this.metrics.deviceType}`);
  }
  
  /**
   * Rileva il numero di core CPU disponibili
   */
  private detectCpuCores(): number {
    return navigator.hardwareConcurrency || 2;
  }
  
  /**
   * Rileva le capacità di performance del dispositivo
   */
  private async detectPerformanceCapabilities(): Promise<void> {
    // Rileva supporto GPU acceleration
    this.detectGpuAcceleration();
    
    // Esegui benchmark iniziale
    await this.runInitialBenchmark();
    
    // Determina livello performance in base ai test
    this.determinePerformanceLevel();
    
    // Configura opzioni di throttling in base al livello
    this.configureThrottling();
    
    // Notifica callback
    this.notifyPerformanceChangeCallbacks();
  }
  
  /**
   * Rileva se il dispositivo supporta GPU acceleration
   */
  private detectGpuAcceleration(): void {
    // Metodo euristico per rilevare supporto GPU
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
               canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (gl) {
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          this.metrics.hasGpuAcceleration = !/SwiftShader|llvmpipe|Software|Mesa/i.test(renderer);
        } else {
          // Fallback: presumi che WebGL = hardware acceleration
          this.metrics.hasGpuAcceleration = true;
        }
      } catch (e) {
        console.warn('Error detecting GPU acceleration:', e);
        // Fallback conservativo
        this.metrics.hasGpuAcceleration = false;
      }
    } else {
      this.metrics.hasGpuAcceleration = false;
    }
    
    console.log(`GPU Acceleration: ${this.metrics.hasGpuAcceleration ? 'Available' : 'Not available'}`);
  }
  
  /**
   * Configura un observer per monitorare le performance
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          // Processo delle metriche rilevanti
          for (const entry of entries) {
            if (entry.entryType === 'longtask') {
              // Rileva task lunghi che bloccano il thread principale
              console.warn('Long task detected', entry);
              // Potrebbe indicare un dispositivo con prestazioni limitate
              this.adjustForLongTasks();
            }
          }
        });
        
        // Osserva task lunghi
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('PerformanceObserver not fully supported', e);
      }
    }
  }
  
  /**
   * Esegue un benchmark iniziale per misurare le performance
   */
  private async runInitialBenchmark(): Promise<void> {
    // Benchmark rendering
    const renderingScore = await this.benchmarkRendering();
    
    // Benchmark calcolo
    const computeScore = await this.benchmarkCompute();
    
    console.log(`Benchmark results - Rendering: ${renderingScore}, Compute: ${computeScore}`);
  }
  
  /**
   * Benchmark per calcolare performance di rendering
   */
  private async benchmarkRendering(): Promise<number> {
    return new Promise(resolve => {
      const startTime = performance.now();
      let frames = 0;
      let handle: number;
      
      const measureFrame = (timestamp: number) => {
        frames++;
        if (performance.now() - startTime < 1000) {
          handle = requestAnimationFrame(measureFrame);
        } else {
          cancelAnimationFrame(handle);
          resolve(frames);
        }
      };
      
      handle = requestAnimationFrame(measureFrame);
    });
  }
  
  /**
   * Benchmark per calcolare performance di computazione
   */
  private async benchmarkCompute(): Promise<number> {
    const startTime = performance.now();
    let result = 0;
    
    // Operazione di calcolo intensa
    for (let i = 0; i < 1000000; i++) {
      result += Math.sin(i * 0.01) * Math.cos(i * 0.01);
    }
    
    const endTime = performance.now();
    return 1000 / (endTime - startTime);
  }
  
  /**
   * Determina il livello di performance del dispositivo
   */
  private determinePerformanceLevel(): void {
    // Combinazione di diversi fattori
    const { deviceType, hasGpuAcceleration, cpuCores, frameRate } = this.metrics;
    
    if (deviceType === 'desktop' && hasGpuAcceleration && cpuCores >= 4 && frameRate >= 50) {
      this.metrics.performanceLevel = 'high';
    } else if (deviceType === 'mobile' && (!hasGpuAcceleration || cpuCores < 2 || frameRate < 30)) {
      this.metrics.performanceLevel = 'low';
    } else {
      this.metrics.performanceLevel = 'medium';
    }
    
    console.log(`Performance level determined: ${this.metrics.performanceLevel}`);
  }
  
  /**
   * Configura le opzioni di throttling in base al livello di performance
   */
  private configureThrottling(): void {
    const { performanceLevel } = this.metrics;
    
    switch (performanceLevel) {
      case 'high':
        this.throttlingOptions = {
          animationComplexity: 'full',
          renderQuality: 'high',
          enableGpuAcceleration: true,
          updateFrequency: 16, // ~60fps
          enableFancyEffects: true,
          enableLazyLoading: false,
          memoryManagementLevel: 'minimal'
        };
        break;
        
      case 'medium':
        this.throttlingOptions = {
          animationComplexity: 'reduced',
          renderQuality: 'medium',
          enableGpuAcceleration: true,
          updateFrequency: 32, // ~30fps
          enableFancyEffects: false,
          enableLazyLoading: true,
          memoryManagementLevel: 'balanced'
        };
        break;
        
      case 'low':
        this.throttlingOptions = {
          animationComplexity: 'minimal',
          renderQuality: 'low',
          enableGpuAcceleration: true,
          updateFrequency: 50, // ~20fps
          enableFancyEffects: false,
          enableLazyLoading: true,
          memoryManagementLevel: 'aggressive'
        };
        break;
        
      default:
        // Default conservative settings
        this.throttlingOptions = {
          animationComplexity: 'reduced',
          renderQuality: 'medium',
          enableGpuAcceleration: true,
          updateFrequency: 32,
          enableFancyEffects: false,
          enableLazyLoading: true,
          memoryManagementLevel: 'balanced'
        };
    }
    
    console.log('Throttling options configured:', this.throttlingOptions);
  }
  
  /**
   * Configura monitoraggio frame rate
   */
  private setupFrameRateMonitoring(): void {
    this.frameRateMonitorActive = true;
    this.lastFrameTime = performance.now();
    
    const checkFramerate = () => {
      // Calcola FPS usando una media mobile
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      
      const fps = 1000 / delta;
      
      // Mantieni storico frame rate
      this.frameRateHistory.push(fps);
      if (this.frameRateHistory.length > 20) {
        this.frameRateHistory.shift();
      }
      
      // Calcola media FPS
      const averageFps = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
      
      // Aggiorna metrica
      this.metrics.frameRate = Math.round(averageFps);
    };
    
    // Monitora framerate
    let lastTimestamp = 0;
    const frameCallback = (timestamp: number) => {
      if (this.frameRateMonitorActive) {
        if (lastTimestamp !== timestamp) {
          checkFramerate();
        }
        lastTimestamp = timestamp;
        requestAnimationFrame(frameCallback);
      }
    };
    
    requestAnimationFrame(frameCallback);
    
    // Verifica periodica per adattare le impostazioni
    this.framerateCheckInterval = window.setInterval(() => {
      if (this.metrics.frameRate < 20 && this.throttlingOptions.animationComplexity !== 'minimal') {
        // Performance degradata, riduci complessità animazioni
        this.throttlingOptions.animationComplexity = 'minimal';
        this.throttlingOptions.updateFrequency = 50;
        this.notifyPerformanceChangeCallbacks();
      } else if (this.metrics.frameRate < 40 && this.throttlingOptions.animationComplexity === 'full') {
        // Performance mediocre, riduci complessità animazioni
        this.throttlingOptions.animationComplexity = 'reduced';
        this.throttlingOptions.updateFrequency = 32;
        this.notifyPerformanceChangeCallbacks();
      }
    }, 5000);
  }
  
  /**
   * Inizia monitoraggio memoria se supportato
   */
  private startMemoryMonitoring(): void {
    if ((performance as any).memory) {
      // Chrome-specific memory API
      this.metrics.memoryInfo = {
        available: true,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize
      };
      
      // Monitora uso memoria
      this.memoryMonitorInterval = window.setInterval(() => {
        if (this.metrics.memoryInfo) {
          this.metrics.memoryInfo.totalJSHeapSize = (performance as any).memory.totalJSHeapSize;
          this.metrics.memoryInfo.usedJSHeapSize = (performance as any).memory.usedJSHeapSize;
          
          // Verifica uso memoria
          const memoryUsage = this.metrics.memoryInfo.usedJSHeapSize! / this.metrics.memoryInfo.jsHeapSizeLimit!;
          
          if (memoryUsage > 0.8 && this.throttlingOptions.memoryManagementLevel !== 'aggressive') {
            console.warn('High memory usage detected', memoryUsage);
            this.throttlingOptions.memoryManagementLevel = 'aggressive';
            this.notifyPerformanceChangeCallbacks();
          }
        }
      }, 10000);
    } else {
      this.metrics.memoryInfo = { available: false };
    }
  }
  
  /**
   * Rileva stato batteria se supportato
   */
  private async detectBatteryStatus(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        
        this.metrics.batteryInfo = {
          available: true,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level
        };
        
        // Ascolta cambiamenti stato batteria
        battery.addEventListener('chargingchange', () => {
          if (this.metrics.batteryInfo) {
            this.metrics.batteryInfo.charging = battery.charging;
            
            // Adatta throttling in base allo stato di carica
            if (!battery.charging && battery.level < 0.2) {
              // Batteria scarica, riduci consumo
              this.throttlingOptions.animationComplexity = 'minimal';
              this.throttlingOptions.enableFancyEffects = false;
              this.notifyPerformanceChangeCallbacks();
            }
          }
        });
        
        battery.addEventListener('levelchange', () => {
          if (this.metrics.batteryInfo) {
            this.metrics.batteryInfo.level = battery.level;
            
            // Adatta throttling in base al livello batteria
            if (!battery.charging && battery.level < 0.2) {
              // Batteria scarica, riduci consumo
              this.throttlingOptions.animationComplexity = 'minimal';
              this.throttlingOptions.enableFancyEffects = false;
              this.notifyPerformanceChangeCallbacks();
            }
          }
        });
      } catch (err) {
        console.warn('Battery API not fully supported', err);
        this.metrics.batteryInfo = { available: false };
      }
    } else {
      this.metrics.batteryInfo = { available: false };
    }
  }
  
  /**
   * Adatta le impostazioni in caso di task lunghi rilevati
   */
  private adjustForLongTasks(): void {
    if (this.throttlingOptions.animationComplexity !== 'minimal') {
      this.throttlingOptions.animationComplexity = 'minimal';
      this.throttlingOptions.enableFancyEffects = false;
      this.throttlingOptions.updateFrequency = 50;
      this.notifyPerformanceChangeCallbacks();
    }
  }
  
  /**
   * Notifica i callback registrati di cambiamenti nelle performance
   */
  private notifyPerformanceChangeCallbacks(): void {
    for (const callback of this.onPerformanceChangeCallbacks) {
      callback(this.metrics);
    }
  }
  
  /**
   * Aggiungi un callback per cambiamenti nelle metriche di performance
   */
  public onPerformanceChange(callback: (metrics: PerformanceMetrics) => void): void {
    this.onPerformanceChangeCallbacks.push(callback);
  }
  
  /**
   * Rimuovi un callback per cambiamenti nelle metriche di performance
   */
  public removePerformanceChangeCallback(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.onPerformanceChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onPerformanceChangeCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Ottieni le metriche di performance attuali
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Ottieni le opzioni di throttling attuali
   */
  public getThrottlingOptions(): ThrottlingOptions {
    return { ...this.throttlingOptions };
  }
  
  /**
   * Suggerisce se usare animazioni complesse in base alle performance
   */
  public shouldUseComplexAnimations(): boolean {
    return this.throttlingOptions.animationComplexity !== 'minimal' && 
           this.throttlingOptions.animationComplexity !== 'disabled';
  }
  
  /**
   * Suggerisce delay per animazioni in base al throttling
   */
  public getAnimationDelay(): number {
    return this.throttlingOptions.updateFrequency;
  }
  
  /**
   * Suggerisce se usare efecti visivi avanzati
   */
  public shouldUseAdvancedEffects(): boolean {
    return this.throttlingOptions.enableFancyEffects;
  }
  
  /**
   * Pulisce listener e intervalli quando non più necessari
   * Da chiamare quando il componente viene smontato
   */
  public cleanup(): void {
    this.frameRateMonitorActive = false;
    
    if (this.framerateCheckInterval) {
      clearInterval(this.framerateCheckInterval);
    }
    
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.onPerformanceChangeCallbacks = [];
  }
}

// Esporta singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility helper functions
export function useComplexAnimations(): boolean {
  return performanceMonitor.shouldUseComplexAnimations();
}

export function getDevicePerformanceLevel(): DevicePerformanceLevel {
  return performanceMonitor.getMetrics().performanceLevel;
}

export function getAnimationDelay(): number {
  return performanceMonitor.getAnimationDelay();
}

export function useAdvancedEffects(): boolean {
  return performanceMonitor.shouldUseAdvancedEffects();
}
