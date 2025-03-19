import { supabase } from './supabase';

/**
 * Interfaccia per la configurazione delle API key
 */
interface ApiKeyConfig {
  name: string;           // Nome identificativo della chiave
  key: string;            // Valore della chiave API
  service: string;        // Servizio associato (es. 'groq', 'openrouter')
  isActive: boolean;      // Indica se la chiave è attualmente attiva
  expiresAt?: Date;       // Data di scadenza opzionale
  usageLimit?: number;    // Limite di utilizzo opzionale
  currentUsage?: number;  // Utilizzo corrente
  lastRotated?: Date;     // Ultima data di rotazione
  fallbackKeyId?: string; // ID della chiave di fallback
}

/**
 * Interfaccia per il log di utilizzo delle API key
 */
interface ApiKeyUsageLog {
  keyId: string;          // ID della chiave utilizzata
  service: string;        // Servizio utilizzato
  endpoint: string;       // Endpoint specifico chiamato
  timestamp: Date;        // Timestamp della chiamata
  responseTime: number;   // Tempo di risposta in ms
  success: boolean;       // Se la chiamata ha avuto successo
  errorMessage?: string;  // Messaggio di errore (se presente)
  statusCode?: number;    // Codice di stato HTTP
  useragent?: string;     // User agent del client
  ip?: string;            // IP del client
}

/**
 * Servizio centralizzato per la gestione delle chiavi API
 */
class ApiKeyService {
  private keyCache: Map<string, ApiKeyConfig> = new Map();
  private lastRefresh: Date = new Date(0);
  private refreshInterval: number = 5 * 60 * 1000; // 5 minuti in ms
  
  /**
   * Ottiene una chiave API dal sistema
   * @param service Nome del servizio per cui si richiede la chiave
   * @returns La chiave API o null se non trovata
   */
  async getApiKey(service: string): Promise<string | null> {
    await this.refreshKeysIfNeeded();
    
    // Trova tutte le chiavi attive per il servizio richiesto
    const activeKeys = Array.from(this.keyCache.values())
      .filter(config => config.service === service && config.isActive);
    
    if (activeKeys.length === 0) {
      console.warn(`Nessuna chiave API attiva trovata per il servizio ${service}`);
      return null;
    }
    
    // Implementazione semplice: scegli la prima chiave disponibile
    // In una versione più avanzata, si potrebbe implementare un algoritmo di selezione
    // basato su utilizzo, round robin, ecc.
    const selectedKey = activeKeys[0];
    
    // Registra l'utilizzo della chiave
    this.logKeyUsage(selectedKey.name, service).catch(err => {
      console.error('Errore nel logging dell\'utilizzo della chiave:', err);
    });
    
    return selectedKey.key;
  }
  
  /**
   * Ottiene tutte le configurazioni delle chiavi API
   * @returns Lista di configurazioni delle chiavi API
   */
  async getAllApiKeys(): Promise<ApiKeyConfig[]> {
    await this.refreshKeysIfNeeded();
    return Array.from(this.keyCache.values());
  }
  
  /**
   * Aggiunge o aggiorna una chiave API nel sistema
   * @param config Configurazione della chiave API
   */
  async setApiKey(config: ApiKeyConfig): Promise<void> {
    try {
      if (!supabase) {
        console.warn('Supabase non è configurato, utilizzo solo cache locale per le chiavi API');
        this.keyCache.set(config.name, config);
        return;
      }
      
      // Salva nel database
      const { data, error } = await supabase
        .from('api_keys')
        .upsert({
          name: config.name,
          key: this.encryptKey(config.key), // Encrypta prima di salvare
          service: config.service,
          is_active: config.isActive,
          expires_at: config.expiresAt,
          usage_limit: config.usageLimit,
          current_usage: config.currentUsage || 0,
          last_rotated: config.lastRotated || new Date(),
          fallback_key_id: config.fallbackKeyId
        }, { onConflict: 'name' });
        
      if (error) throw error;
      
      // Aggiorna la cache
      this.keyCache.set(config.name, config);
      
      console.log(`Chiave API ${config.name} per ${config.service} aggiornata con successo`);
    } catch (error) {
      console.error('Errore nel salvare la chiave API:', error);
      throw error;
    }
  }
  
  /**
   * Disattiva una chiave API
   * @param name Nome della chiave API da disattivare
   */
  async deactivateKey(name: string): Promise<void> {
    try {
      if (!supabase) {
        console.warn('Supabase non è configurato, utilizzo solo cache locale per le chiavi API');
        const keyConfig = this.keyCache.get(name);
        if (keyConfig) {
          keyConfig.isActive = false;
          this.keyCache.set(name, keyConfig);
        }
        return;
      }
      
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('name', name);
        
      if (error) throw error;
      
      // Aggiorna la cache se la chiave esiste
      const keyConfig = this.keyCache.get(name);
      if (keyConfig) {
        keyConfig.isActive = false;
        this.keyCache.set(name, keyConfig);
      }
      
      console.log(`Chiave API ${name} disattivata con successo`);
    } catch (error) {
      console.error('Errore nella disattivazione della chiave API:', error);
      throw error;
    }
  }
  
  /**
   * Effettua la rotazione di una chiave API
   * @param name Nome della chiave API
   * @param newKey Nuova chiave API
   */
  async rotateKey(name: string, newKey: string): Promise<void> {
    try {
      const keyConfig = this.keyCache.get(name);
      if (!keyConfig) {
        throw new Error(`Chiave API ${name} non trovata`);
      }
      
      if (!supabase) {
        console.warn('Supabase non è configurato, utilizzo solo cache locale per le chiavi API');
        keyConfig.key = newKey;
        keyConfig.lastRotated = new Date();
        this.keyCache.set(name, keyConfig);
        return;
      }
      
      // Aggiorna la chiave
      const { error } = await supabase
        .from('api_keys')
        .update({
          key: this.encryptKey(newKey),
          last_rotated: new Date()
        })
        .eq('name', name);
        
      if (error) throw error;
      
      // Aggiorna la cache
      keyConfig.key = newKey;
      keyConfig.lastRotated = new Date();
      this.keyCache.set(name, keyConfig);
      
      console.log(`Chiave API ${name} per ${keyConfig.service} ruotata con successo`);
    } catch (error) {
      console.error('Errore nella rotazione della chiave API:', error);
      throw error;
    }
  }
  
  /**
   * Registra l'utilizzo di una chiave API
   * @param keyName Nome della chiave API utilizzata
   * @param service Servizio per cui è stata utilizzata
   * @param endpoint Endpoint specifico chiamato (opzionale)
   */
  async logKeyUsage(
    keyName: string, 
    service: string, 
    endpoint: string = 'default',
    responseTime: number = 0,
    success: boolean = true,
    errorMessage?: string,
    statusCode?: number
  ): Promise<void> {
    try {
      // Aggiorna la cache se la chiave esiste
      const keyConfig = this.keyCache.get(keyName);
      if (keyConfig && keyConfig.currentUsage !== undefined) {
        keyConfig.currentUsage += 1;
        this.keyCache.set(keyName, keyConfig);
      }
      
      if (!supabase) {
        console.warn('Supabase non è configurato, il log dell\'utilizzo delle chiavi API verrà eseguito solo in cache');
        return;
      }
      
      // Incrementa il contatore di utilizzo
      const { error: updateError } = await supabase.rpc('increment_api_key_usage', {
        key_name: keyName
      });
      
      if (updateError) throw updateError;
      
      // Registra il log
      const { error: logError } = await supabase
        .from('api_key_usage_logs')
        .insert({
          key_name: keyName,
          service,
          endpoint,
          timestamp: new Date(),
          response_time: responseTime,
          success,
          error_message: errorMessage,
          status_code: statusCode
        });
        
      if (logError) throw logError;
    } catch (error) {
      console.error('Errore nel logging dell\'utilizzo della chiave API:', error);
      // Non lanciamo l'errore per evitare di interrompere il flusso di chiamata all'API
    }
  }
  
  /**
   * Ottiene statistiche di utilizzo per una chiave API
   * @param keyName Nome della chiave API
   * @param period Periodo di tempo (in giorni)
   */
  async getKeyUsageStats(keyName: string, period: number = 30): Promise<any> {
    try {
      if (!supabase) {
        console.warn('Supabase non è configurato, le statistiche di utilizzo non sono disponibili');
        return {
          totalCalls: 0,
          successCalls: 0,
          failureCalls: 0,
          successRate: 0,
          avgResponseTime: 0,
          usageByDay: {},
          usageByEndpoint: {}
        };
      }
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      
      const { data, error } = await supabase
        .from('api_key_usage_logs')
        .select('*')
        .eq('key_name', keyName)
        .gte('timestamp', startDate.toISOString());
        
      if (error) throw error;
      
      return this.calculateUsageStats(data || []);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche di utilizzo:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se una chiave API ha superato il limite di utilizzo
   * @param keyName Nome della chiave API
   */
  async hasExceededLimit(keyName: string): Promise<boolean> {
    await this.refreshKeysIfNeeded();
    
    const keyConfig = this.keyCache.get(keyName);
    if (!keyConfig) {
      throw new Error(`Chiave API ${keyName} non trovata`);
    }
    
    if (keyConfig.usageLimit === undefined || keyConfig.currentUsage === undefined) {
      return false; // Nessun limite impostato
    }
    
    return keyConfig.currentUsage >= keyConfig.usageLimit;
  }
  
  /**
   * Verifica se una chiave API è scaduta
   * @param keyName Nome della chiave API
   */
  async isExpired(keyName: string): Promise<boolean> {
    await this.refreshKeysIfNeeded();
    
    const keyConfig = this.keyCache.get(keyName);
    if (!keyConfig) {
      throw new Error(`Chiave API ${keyName} non trovata`);
    }
    
    if (!keyConfig.expiresAt) {
      return false; // Nessuna data di scadenza impostata
    }
    
    return new Date() > keyConfig.expiresAt;
  }
  
  /**
   * Ottiene la chiave di fallback per una chiave primaria
   * @param primaryKeyName Nome della chiave primaria
   */
  async getFallbackKey(primaryKeyName: string): Promise<string | null> {
    await this.refreshKeysIfNeeded();
    
    const keyConfig = this.keyCache.get(primaryKeyName);
    if (!keyConfig || !keyConfig.fallbackKeyId) {
      return null; // Nessuna chiave di fallback configurata
    }
    
    const fallbackConfig = this.keyCache.get(keyConfig.fallbackKeyId);
    if (!fallbackConfig || !fallbackConfig.isActive) {
      return null; // Chiave di fallback non trovata o non attiva
    }
    
    return fallbackConfig.key;
  }
  
  // Metodi privati
  
  /**
   * Aggiorna la cache delle chiavi se necessario
   */
  private async refreshKeysIfNeeded(): Promise<void> {
    const now = new Date();
    if (now.getTime() - this.lastRefresh.getTime() < this.refreshInterval) {
      return; // Nessun aggiornamento necessario
    }
    
    try {
      if (!supabase) {
        console.warn('Supabase non è configurato, impossibile aggiornare la cache delle chiavi API dal database');
        this.lastRefresh = now; // Aggiorniamo comunque il timestamp per evitare tentativi continui
        return;
      }
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*');
        
      if (error) throw error;
      
      // Reset della cache
      this.keyCache.clear();
      
      // Popola la cache con i dati dal database
      (data || []).forEach(item => {
        this.keyCache.set(item.name, {
          name: item.name,
          key: this.decryptKey(item.key),
          service: item.service,
          isActive: item.is_active,
          expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
          usageLimit: item.usage_limit,
          currentUsage: item.current_usage,
          lastRotated: item.last_rotated ? new Date(item.last_rotated) : undefined,
          fallbackKeyId: item.fallback_key_id
        });
      });
      
      this.lastRefresh = now;
    } catch (error) {
      console.error('Errore nell\'aggiornamento della cache delle chiavi API:', error);
      throw error;
    }
  }
  
  /**
   * Calcola statistiche di utilizzo a partire dai log
   * @param logs Array di log di utilizzo
   */
  private calculateUsageStats(logs: ApiKeyUsageLog[]): any {
    // Implementazione semplice: conta successi e fallimenti
    const totalCalls = logs.length;
    const successCalls = logs.filter(log => log.success).length;
    const failureCalls = totalCalls - successCalls;
    
    const avgResponseTime = logs.reduce((sum, log) => sum + log.responseTime, 0) / totalCalls;
    
    // Calcolo utilizzo per giorno
    const usageByDay: Record<string, number> = {};
    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];
      usageByDay[day] = (usageByDay[day] || 0) + 1;
    });
    
    // Calcolo utilizzo per endpoint
    const usageByEndpoint: Record<string, number> = {};
    logs.forEach(log => {
      usageByEndpoint[log.endpoint] = (usageByEndpoint[log.endpoint] || 0) + 1;
    });
    
    return {
      totalCalls,
      successCalls,
      failureCalls,
      successRate: (successCalls / totalCalls) * 100,
      avgResponseTime,
      usageByDay,
      usageByEndpoint
    };
  }
  
  /**
   * Cripta una chiave API
   * @param key Chiave API da criptare
   * @returns Chiave API criptata
   */
  private encryptKey(key: string): string {
    // Implementazione di base: in produzione, utilizzare un algoritmo di crittografia appropriato
    // Ad esempio, potresti utilizzare AES-256 con una chiave di crittografia gestita in sicurezza
    // Per ora, facciamo un semplice encoding per simulare la crittografia
    return Buffer.from(key).toString('base64');
  }
  
  /**
   * Decripta una chiave API
   * @param encryptedKey Chiave API criptata
   * @returns Chiave API decriptata
   */
  private decryptKey(encryptedKey: string): string {
    // Implementazione di base corrispondente alla funzione di crittografia
    return Buffer.from(encryptedKey, 'base64').toString('utf-8');
  }
}

// Esporta un'istanza singleton del servizio
export const apiKeyService = new ApiKeyService();
