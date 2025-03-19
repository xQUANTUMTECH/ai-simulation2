/**
 * Hook per ottimizzare le performance della chat interattiva
 * Ottimizza il rendering e la gestione della memoria in base alle capacità del dispositivo
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { performanceMonitor } from '../utils/performance-monitor';

export interface ChatPerformanceSettings {
  // Massimo numero di messaggi da mantenere nel DOM
  maxVisibleMessages: number;
  
  // Abilitare virtualizzazione per liste lunghe
  useVirtualization: boolean;
  
  // Intervallo di throttling per scroll events (ms)
  scrollThrottleMs: number;
  
  // Precaricamento delle immagini per avatar
  preloadAvatarImages: boolean;
  
  // Utilizzo di display: none vs rimozione dal DOM per messaggi non visibili
  useStyleHiding: boolean;
  
  // Utilizza GPU acceleration per animazioni
  useGpuAcceleration: boolean;
  
  // Dimensione massima della cache messaggi in memoria
  messageCacheSize: number;
  
  // Abilita debug informazioni
  enablePerformanceMetrics: boolean;
}

/**
 * Hook per ottimizzare le performance della chat
 */
export function useChatPerformance() {
  // Impostazioni di performance
  const [settings, setSettings] = useState<ChatPerformanceSettings>({
    maxVisibleMessages: 50,
    useVirtualization: false,
    scrollThrottleMs: 100,
    preloadAvatarImages: true,
    useStyleHiding: true,
    useGpuAcceleration: true,
    messageCacheSize: 200,
    enablePerformanceMetrics: false
  });
  
  // Metriche di performance
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 60,
    lastScrollTime: 0,
    scrollJank: 0 // Misura della fluidità dello scroll
  });
  
  // Dettagli dispositivo
  const deviceInfo = performanceMonitor.getMetrics();
  
  /**
   * Carica configurazioni in base alle prestazioni rilevate
   */
  useEffect(() => {
    // Ottieni metriche dal performance monitor
    const perfMetrics = performanceMonitor.getMetrics();
    const throttling = performanceMonitor.getThrottlingOptions();
    
    // Adatta settings in base alle performance del dispositivo
    const newSettings: ChatPerformanceSettings = {
      ...settings
    };
    
    // Dispositivi a basse prestazioni
    if (perfMetrics.performanceLevel === 'low') {
      newSettings.maxVisibleMessages = 25; // Riduce il numero di messaggi nel DOM
      newSettings.useVirtualization = true; // Abilita virtualizzazione per risparmiare memoria
      newSettings.scrollThrottleMs = 150; // Throttling più aggressivo per lo scroll
      newSettings.preloadAvatarImages = false; // Disabilita precaricamento avatar
      newSettings.messageCacheSize = 50; // Riduce dimensione cache
    } 
    // Dispositivi a prestazioni medie
    else if (perfMetrics.performanceLevel === 'medium') {
      newSettings.maxVisibleMessages = 35;
      newSettings.useVirtualization = perfMetrics.deviceType !== 'desktop';
      newSettings.scrollThrottleMs = 100;
      newSettings.preloadAvatarImages = true;
      newSettings.messageCacheSize = 100;
    } 
    // Dispositivi ad alte prestazioni
    else if (perfMetrics.performanceLevel === 'high') {
      newSettings.maxVisibleMessages = 50;
      newSettings.useVirtualization = false;
      newSettings.scrollThrottleMs = 50;
      newSettings.preloadAvatarImages = true;
      newSettings.messageCacheSize = 200;
    }
    
    // Impostazioni comuni basate su altre metriche
    newSettings.useGpuAcceleration = perfMetrics.hasGpuAcceleration;
    
    // Su mobile, abilita sempre virtualizzazione per risparmiare memoria
    if (perfMetrics.deviceType === 'mobile') {
      newSettings.useVirtualization = true;
      newSettings.maxVisibleMessages = Math.min(newSettings.maxVisibleMessages, 30);
    }
    
    // Se batteria bassa, ottimizza ulteriormente per risparmio energetico
    if (perfMetrics.batteryInfo && 
        perfMetrics.batteryInfo.available && 
        !perfMetrics.batteryInfo.charging && 
        perfMetrics.batteryInfo.level && 
        perfMetrics.batteryInfo.level < 0.2) {
      newSettings.maxVisibleMessages = Math.min(newSettings.maxVisibleMessages, 20);
      newSettings.preloadAvatarImages = false;
      newSettings.useVirtualization = true;
    }
    
    // Se il dispositivo ha memoria limitata, riduce ulteriormente l'uso di memoria
    if (perfMetrics.memoryInfo && 
        perfMetrics.memoryInfo.available && 
        perfMetrics.memoryInfo.usedJSHeapSize && 
        perfMetrics.memoryInfo.jsHeapSizeLimit) {
      const memoryUsage = perfMetrics.memoryInfo.usedJSHeapSize / perfMetrics.memoryInfo.jsHeapSizeLimit;
      if (memoryUsage > 0.7) {
        newSettings.maxVisibleMessages = Math.min(newSettings.maxVisibleMessages, 15);
        newSettings.messageCacheSize = Math.min(newSettings.messageCacheSize, 50);
        newSettings.useVirtualization = true;
        newSettings.useStyleHiding = false; // Rimuovi completamente dal DOM anziché nascondere
      }
    }
    
    // Abilita metriche di debug in development
    if (process.env.NODE_ENV === 'development') {
      newSettings.enablePerformanceMetrics = true;
    }
    
    // Aggiorna le impostazioni solo se cambiano
    if (JSON.stringify(newSettings) !== JSON.stringify(settings)) {
      setSettings(newSettings);
    }
    
  }, [settings]);
  
  /**
   * Sottoscrizione a cambiamenti di performance
   */
  useEffect(() => {
    const updateOnPerfChange = () => {
      // Calcola le metriche di performance in base alle capabilities del dispositivo
      const perfMetrics = performanceMonitor.getMetrics();
      
      setMetrics({
        ...metrics,
        frameRate: perfMetrics.frameRate,
        memoryUsage: 
          perfMetrics.memoryInfo && 
          perfMetrics.memoryInfo.available && 
          perfMetrics.memoryInfo.usedJSHeapSize && 
          perfMetrics.memoryInfo.jsHeapSizeLimit
            ? (perfMetrics.memoryInfo.usedJSHeapSize / perfMetrics.memoryInfo.jsHeapSizeLimit)
            : 0
      });
    };
    
    // Sottoscrivi ai cambiamenti di performance
    performanceMonitor.onPerformanceChange(updateOnPerfChange);
    
    // Cleanup
    return () => {
      performanceMonitor.removePerformanceChangeCallback(updateOnPerfChange);
    };
  }, [metrics]);
  
  /**
   * Ottimizza lo scroll per evitare jank
   */
  const optimizeScroll = useCallback((scrollAction: () => void) => {
    const now = performance.now();
    // Applica throttling allo scroll se necessario
    if (now - metrics.lastScrollTime >= settings.scrollThrottleMs) {
      setMetrics(prev => ({ ...prev, lastScrollTime: now }));
      
      // Utilizzo requestAnimationFrame per sincronizzare con il refresh del browser
      window.requestAnimationFrame(() => {
        scrollAction();
      });
    }
  }, [metrics.lastScrollTime, settings.scrollThrottleMs]);
  
  /**
   * Ottiene un filtro per limitare i messaggi visualizzati
   */
  const getVisibleMessagesFilter = useCallback((totalMessages: number) => {
    // Se non usiamo virtualizzazione o abbiamo meno messaggi del limite, mostra tutti
    if (!settings.useVirtualization || totalMessages <= settings.maxVisibleMessages) {
      return () => true;
    }
    
    // Altrimenti, mostra solo gli ultimi N messaggi
    const skipCount = Math.max(0, totalMessages - settings.maxVisibleMessages);
    return (_: any, index: number) => index >= skipCount;
  }, [settings.maxVisibleMessages, settings.useVirtualization]);
  
  /**
   * Styles per ottimizzare performance
   */
  const styles = useMemo(() => {
    return {
      container: {
        ...(settings.useGpuAcceleration ? {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as 'hidden',
          willChange: 'transform'
        } : {})
      },
      messages: {
        ...(settings.useGpuAcceleration ? {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as 'hidden'
        } : {})
      },
      scrollable: {
        overscrollBehavior: 'contain', // Previene scroll browser sottostante durante scrolling
        WebkitOverflowScrolling: 'touch' as any // Migliora scrolling iOS, uso type assertion per evitare errori TS
      }
    };
  }, [settings.useGpuAcceleration]);
  
  return {
    settings,
    metrics,
    deviceInfo,
    optimizeScroll,
    getVisibleMessagesFilter,
    styles
  };
}
