/**
 * Adapter specifico per ottimizzare le prestazioni dell'avatar
 * in base alle capacità del dispositivo rilevate dal performance monitor
 */
import { performanceMonitor, DevicePerformanceLevel } from './performance-monitor';

export interface AvatarPerformanceSettings {
  // Frequenza aggiornamento animazione bocca (ms)
  mouthAnimationUpdateRate: number;
  
  // Numero di punti utilizzati nell'animazione della forma d'onda (più è alto, più è fluido ma costoso)
  waveformResolution: number;
  
  // Utilizzare CSS transform per le animazioni (più performante)
  useTransformForAnimations: boolean;
  
  // Applicare GPU acceleration alle animazioni
  useGpuAcceleration: boolean;
  
  // Qualità delle animazioni dell'avatar (1-3)
  animationQuality: 1 | 2 | 3;
  
  // Disabilitare effetti particellari e animazioni complesse
  disableFancyEffects: boolean;
  
  // Utilizzare versione semplificata dell'avatar
  useLightweightMode: boolean;
  
  // Intervallo di aggiornamento per le espressioni facciali (ms)
  facialExpressionUpdateRate: number;
}

/**
 * Classe per gestire le performance settings dell'avatar
 * Adatta automaticamente le impostazioni in base alle capacità del dispositivo
 */
class AvatarPerformanceAdapter {
  private settings: AvatarPerformanceSettings;
  private metricsChangeCallback: ((metrics: any) => void) | null = null;
  
  constructor() {
    // Impostazioni iniziali di default
    this.settings = {
      mouthAnimationUpdateRate: 50,
      waveformResolution: 5,
      useTransformForAnimations: true,
      useGpuAcceleration: true,
      animationQuality: 3,
      disableFancyEffects: false,
      useLightweightMode: false,
      facialExpressionUpdateRate: 100
    };
    
    // Adatta le impostazioni in base alle performance rilevate
    this.updateSettingsBasedOnPerformance();
    
    // Registra callback per aggiornamenti futuri
    this.metricsChangeCallback = this.handleMetricsChange.bind(this);
    performanceMonitor.onPerformanceChange(this.metricsChangeCallback);
  }
  
  /**
   * Adatta le impostazioni in base alle performance del dispositivo
   */
  private updateSettingsBasedOnPerformance(): void {
    const metrics = performanceMonitor.getMetrics();
    const throttlingOptions = performanceMonitor.getThrottlingOptions();
    
    // Adatta le impostazioni in base alle performance rilevate
    switch (metrics.performanceLevel) {
      case 'high':
        this.settings = {
          mouthAnimationUpdateRate: 16, // ~60fps
          waveformResolution: 8,
          useTransformForAnimations: true,
          useGpuAcceleration: true,
          animationQuality: 3,
          disableFancyEffects: false,
          useLightweightMode: false,
          facialExpressionUpdateRate: 50
        };
        break;
        
      case 'medium':
        this.settings = {
          mouthAnimationUpdateRate: 32, // ~30fps
          waveformResolution: 5,
          useTransformForAnimations: true,
          useGpuAcceleration: true,
          animationQuality: 2,
          disableFancyEffects: true,
          useLightweightMode: false,
          facialExpressionUpdateRate: 100
        };
        break;
        
      case 'low':
        this.settings = {
          mouthAnimationUpdateRate: 50, // ~20fps
          waveformResolution: 3,
          useTransformForAnimations: true,
          useGpuAcceleration: metrics.hasGpuAcceleration,
          animationQuality: 1,
          disableFancyEffects: true,
          useLightweightMode: true,
          facialExpressionUpdateRate: 150
        };
        break;
        
      default:
        // Default - fallback conservativo
        this.settings = {
          mouthAnimationUpdateRate: 32,
          waveformResolution: 5,
          useTransformForAnimations: true,
          useGpuAcceleration: metrics.hasGpuAcceleration,
          animationQuality: 2,
          disableFancyEffects: true,
          useLightweightMode: false,
          facialExpressionUpdateRate: 100
        };
    }
    
    // Adatta ulteriormente in base ad altre metriche
    
    // Se il dispositivo ha poca batteria o non è in carica
    if (metrics.batteryInfo && 
        metrics.batteryInfo.available && 
        !metrics.batteryInfo.charging && 
        metrics.batteryInfo.level && 
        metrics.batteryInfo.level < 0.2) {
      // Modalità risparmio batteria
      this.settings.animationQuality = 1;
      this.settings.disableFancyEffects = true;
      this.settings.waveformResolution = 3;
      this.settings.mouthAnimationUpdateRate = Math.max(this.settings.mouthAnimationUpdateRate, 50);
    }
    
    // Se il dispositivo ha memoria limitata
    if (metrics.memoryInfo && 
        metrics.memoryInfo.available && 
        metrics.memoryInfo.usedJSHeapSize && 
        metrics.memoryInfo.jsHeapSizeLimit) {
      const memoryUsage = metrics.memoryInfo.usedJSHeapSize / metrics.memoryInfo.jsHeapSizeLimit;
      if (memoryUsage > 0.7) {
        // Riduce ulteriormente complessità delle animazioni
        this.settings.useLightweightMode = true;
        this.settings.animationQuality = 1;
      }
    }
    
    // Se il framerate è basso (<30), riduci ulteriormente la qualità
    if (metrics.frameRate < 30) {
      this.settings.mouthAnimationUpdateRate = 50;
      this.settings.waveformResolution = 3;
      this.settings.animationQuality = 1;
      this.settings.disableFancyEffects = true;
    }
    
    console.log('Avatar performance settings updated:', this.settings);
  }
  
  /**
   * Gestisce cambiamenti nelle metriche di performance
   */
  private handleMetricsChange(metrics: any): void {
    // Aggiorna le impostazioni quando le metriche cambiano
    this.updateSettingsBasedOnPerformance();
  }
  
  /**
   * Ottiene le impostazioni di performance correnti
   */
  public getSettings(): AvatarPerformanceSettings {
    return { ...this.settings };
  }
  
  /**
   * Suggerisce se usare la modalità leggera dell'avatar
   */
  public shouldUseLightweightMode(): boolean {
    return this.settings.useLightweightMode;
  }
  
  /**
   * Ottiene la qualità delle animazioni consigliata
   */
  public getAnimationQuality(): 1 | 2 | 3 {
    return this.settings.animationQuality;
  }
  
  /**
   * Ottiene l'intervallo di aggiornamento per l'animazione della bocca
   */
  public getMouthAnimationUpdateRate(): number {
    return this.settings.mouthAnimationUpdateRate;
  }
  
  /**
   * Rilascia risorse quando il componente viene smontato
   */
  public cleanup(): void {
    if (this.metricsChangeCallback) {
      performanceMonitor.removePerformanceChangeCallback(this.metricsChangeCallback);
      this.metricsChangeCallback = null;
    }
  }
  
  /**
   * Applica ottimizzazioni CSS per migliorare le performance
   */
  public getCssOptimizations(): Record<string, string> {
    const cssProperties: Record<string, string> = {};
    
    if (this.settings.useGpuAcceleration) {
      // Abilita GPU acceleration
      cssProperties['transform'] = 'translateZ(0)';
      cssProperties['backface-visibility'] = 'hidden';
      cssProperties['perspective'] = '1000px';
      cssProperties['will-change'] = 'transform, opacity';
    }
    
    return cssProperties;
  }
  
  /**
   * Restituisce una versione ottimizzata dello stile CSS dell'avatar
   */
  public getOptimizedAvatarStyle(originalStyle: React.CSSProperties): React.CSSProperties {
    const optimizedStyle: React.CSSProperties = { ...originalStyle };
    
    if (this.settings.useGpuAcceleration) {
      optimizedStyle.transform = 'translateZ(0)';
      optimizedStyle.backfaceVisibility = 'hidden';
      optimizedStyle.perspective = '1000px';
      optimizedStyle.willChange = 'transform, opacity';
    }
    
    // Aggiungi altre ottimizzazioni in base alle performance
    if (this.settings.animationQuality === 1) {
      // Riduci complessità visiva
      optimizedStyle.boxShadow = 'none';
      optimizedStyle.filter = 'none'; // Disabilita filtri costosi
    }
    
    return optimizedStyle;
  }
}

// Istanza singleton dell'adattatore
export const avatarPerformanceAdapter = new AvatarPerformanceAdapter();

// Utility functions
export function getOptimizedAvatarStyle(originalStyle: React.CSSProperties): React.CSSProperties {
  return avatarPerformanceAdapter.getOptimizedAvatarStyle(originalStyle);
}

export function shouldUseSimplifiedAvatar(): boolean {
  return avatarPerformanceAdapter.shouldUseLightweightMode();
}

export function getAvatarAnimationDelay(): number {
  return avatarPerformanceAdapter.getMouthAnimationUpdateRate();
}
