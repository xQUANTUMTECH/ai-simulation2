/**
 * Hook React per utilizzare le ottimizzazioni performance nell'avatar
 * Integra il sistema di monitoraggio performance con React
 */
import { useState, useEffect, useMemo } from 'react';
import { 
  avatarPerformanceAdapter, 
  AvatarPerformanceSettings 
} from '../utils/performance-avatar-adapter';
import { performanceMonitor } from '../utils/performance-monitor';

/**
 * Hook per ottimizzare le performance dell'avatar
 * @returns Oggetto con impostazioni di performance e stili ottimizzati
 */
export function useAvatarPerformance() {
  // Stato locale delle impostazioni di performance
  const [settings, setSettings] = useState<AvatarPerformanceSettings>(
    avatarPerformanceAdapter.getSettings()
  );
  
  // Aggiorna le impostazioni quando cambiano i parametri di performance
  useEffect(() => {
    const updateSettings = () => {
      setSettings(avatarPerformanceAdapter.getSettings());
    };
    
    // Registra callback per essere notificato di cambiamenti nelle metriche
    performanceMonitor.onPerformanceChange(() => {
      updateSettings();
    });
    
    // Cleanup quando il componente si smonta
    return () => {
      performanceMonitor.removePerformanceChangeCallback(updateSettings);
    };
  }, []);
  
  // Memorizza stili ottimizzati per evitare ricalcoli inutili
  const optimizedStyles = useMemo(() => {
    return {
      avatarContainer: {
        transform: settings.useGpuAcceleration ? 'translateZ(0)' : '',
        backfaceVisibility: settings.useGpuAcceleration ? 'hidden' as 'hidden' : undefined,
        perspective: settings.useGpuAcceleration ? '1000px' : undefined,
        willChange: settings.useGpuAcceleration ? 'transform, opacity' : undefined
      },
      avatarImage: {
        transform: settings.useGpuAcceleration ? 'translateZ(0)' : '',
        backfaceVisibility: settings.useGpuAcceleration ? 'hidden' as 'hidden' : undefined,
        filter: settings.animationQuality < 2 ? 'none' : undefined
      },
      mouthAnimation: {
        transitionDuration: `${settings.mouthAnimationUpdateRate}ms`
      },
      waveform: {
        // Stili ottimizzati per l'animazione forma d'onda
        transform: settings.useTransformForAnimations ? 'translateZ(0)' : '',
        willChange: settings.useTransformForAnimations ? 'transform, height' : undefined,
        transition: `height ${settings.mouthAnimationUpdateRate}ms ease`
      }
    };
  }, [settings]);
  
  return {
    // Impostazioni di performance
    settings,
    
    // Stili ottimizzati
    styles: optimizedStyles,
    
    // Helper functions
    shouldUseLightweightMode: settings.useLightweightMode,
    animationQuality: settings.animationQuality,
    mouthAnimationDelay: settings.mouthAnimationUpdateRate,
    
    // Utility per ottimizzare uno stile personalizzato
    optimizeStyle: (style: React.CSSProperties) => {
      return avatarPerformanceAdapter.getOptimizedAvatarStyle(style);
    },
    
    // Informazioni sul dispositivo
    deviceInfo: {
      type: performanceMonitor.getMetrics().deviceType,
      performanceLevel: performanceMonitor.getMetrics().performanceLevel,
      hasGpuAcceleration: performanceMonitor.getMetrics().hasGpuAcceleration,
      frameRate: performanceMonitor.getMetrics().frameRate
    }
  };
}

/**
 * Hook semplificato per creare una versione animazione mouth ottimizzata
 * @param isActive - Se l'animazione è attiva
 * @param amplitude - Ampiezza dell'animazione (0-100)
 * @returns Proprietà di stile ottimizzate per l'animazione
 */
export function useOptimizedMouthAnimation(isActive: boolean, amplitude: number = 50) {
  const { settings, styles } = useAvatarPerformance();
  
  // Calcola numero di punti della forma d'onda in base alle performance
  const pointCount = settings.waveformResolution;
  
  // Genera punti della forma d'onda (versione semplificata per performance basse)
  const wavePoints = useMemo(() => {
    if (!isActive) return [];
    
    // Versione semplificata per prestazioni basse
    if (settings.animationQuality === 1) {
      return [amplitude]; // Una sola barra centrale
    }
    
    // Versione media
    if (settings.animationQuality === 2) {
      // 3-5 punti con variazione semplice
      return Array.from({ length: Math.min(5, pointCount) }, (_, i) => {
        const pos = i / (Math.min(5, pointCount) - 1);
        return amplitude * (0.5 + 0.5 * Math.sin(pos * Math.PI));
      });
    }
    
    // Versione completa per prestazioni alte
    return Array.from({ length: pointCount }, (_, i) => {
      const pos = i / (pointCount - 1);
      // Formula più complessa per simulare forme d'onda naturali
      return amplitude * (0.3 + 0.7 * Math.sin(pos * Math.PI) * (0.8 + 0.2 * Math.sin(pos * 4 * Math.PI)));
    });
  }, [isActive, amplitude, pointCount, settings.animationQuality]);
  
  return {
    wavePoints,
    style: styles.waveform,
    delay: settings.mouthAnimationUpdateRate,
    simplified: settings.animationQuality < 3
  };
}
