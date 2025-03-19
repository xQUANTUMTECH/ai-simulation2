import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Servizio centralizzato per la gestione della connessione a Supabase
 * Fornisce un client configurato e metodi per verificare lo stato della connessione
 */
class DatabaseConnection {
  private client: SupabaseClient | null = null;
  private connectionAttempted = false;
  private connectionError: Error | null = null;
  
  /**
   * Crea o restituisce un client Supabase esistente
   * @returns Cliente Supabase configurato
   */
  getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      this.connectionAttempted = true;
      this.connectionError = new Error('Credenziali Supabase mancanti nelle variabili di ambiente');
      throw this.connectionError;
    }
    
    try {
      this.client = createClient(supabaseUrl, supabaseKey);
      this.connectionAttempted = true;
      return this.client;
    } catch (error) {
      this.connectionAttempted = true;
      this.connectionError = error instanceof Error 
        ? error 
        : new Error('Errore durante la creazione del client Supabase');
      throw this.connectionError;
    }
  }
  
  /**
   * Verifica lo stato della connessione al database
   * @returns true se la connessione è attiva, false altrimenti
   */
  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const client = this.getClient();
      const { error } = await client.from('users').select('count').limit(1);
      
      if (error) {
        return { 
          connected: false, 
          error: `Errore nella connessione al database: ${error.message}` 
        };
      }
      
      return { connected: true };
    } catch (error) {
      return { 
        connected: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }
  
  /**
   * Inizializza un client Supabase autenticato con il token di servizio
   * Utile per operazioni amministrative
   * @param serviceRoleKey Chiave del ruolo di servizio Supabase
   */
  getServiceClient(serviceRoleKey?: string): SupabaseClient {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceKey = serviceRoleKey || import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('URL Supabase e chiave del ruolo di servizio richiesti');
    }
    
    return createClient(supabaseUrl, serviceKey);
  }
  
  /**
   * Controlla se è già stato tentato un collegamento
   */
  hasConnectionBeenAttempted(): boolean {
    return this.connectionAttempted;
  }
  
  /**
   * Restituisce l'errore di connessione se presente
   */
  getConnectionError(): Error | null {
    return this.connectionError;
  }
  
  /**
   * Reimposta lo stato della connessione
   * Utile per riattemptare una connessione dopo un errore
   */
  resetConnectionState(): void {
    this.connectionAttempted = false;
    this.connectionError = null;
    this.client = null;
  }
}

// Esporta una singola istanza per tutta l'applicazione
export const dbConnection = new DatabaseConnection();
