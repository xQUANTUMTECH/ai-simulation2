/**
 * Implementazione browser-friendly di EventEmitter
 * Sostituisce il modulo Node.js 'events' che causa problemi di compatibilità nel browser
 */
export class EventEmitter {
  private events: Record<string, Function[]> = {};

  /**
   * Aggiunge un listener per l'evento specificato
   */
  on(event: string, listener: Function): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  /**
   * Aggiunge un listener per l'evento specificato che viene eseguito solo una volta
   */
  once(event: string, listener: Function): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Rimuove un listener per l'evento specificato
   */
  off(event: string, listener: Function): this {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    return this;
  }

  /**
   * Rimuove tutti i listener per l'evento specificato o per tutti gli eventi
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
    return this;
  }

  /**
   * Emette un evento con i dati specificati
   */
  emit(event: string, ...args: any[]): boolean {
    if (!this.events[event]) {
      return false;
    }
    
    this.events[event].forEach(listener => {
      listener(...args);
    });
    
    return true;
  }

  /**
   * Restituisce un array di listener per l'evento specificato
   */
  listeners(event: string): Function[] {
    return this.events[event] || [];
  }
}
