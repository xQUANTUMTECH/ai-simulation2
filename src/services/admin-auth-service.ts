import { supabase } from './supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Constante di fallback per la sicurezza type
const nullSafeSupabase = supabase || 
  createClient('https://placeholder.supabase.co', 'placeholder-key');

/**
 * Servizio di autenticazione per amministratori e servizi
 * Fornisce funzionalità di autenticazione privilegiate non disponibili
 * all'utente normale attraverso authService
 */
class AdminAuthService {
  private serviceClient: SupabaseClient | null = null;
  
  /**
   * Validazione delle richieste amministrative
   * Verifica che l'utente corrente abbia i permessi di amministratore
   * 
   * @param userId ID dell'utente da validare
   * @returns true se l'utente è un amministratore valido, altrimenti false
   */
  async validateAdminRequest(userId: string): Promise<boolean> {
    try {
      if (!userId) return false;
      
      // Utilizza supabase perché la richiesta viene dalla UI
      const { data, error } = await nullSafeSupabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error || !data) return false;
      
      // Controlla se l'utente ha ruolo ADMIN
      return data.role === 'ADMIN';
    } catch (error) {
      console.error('Errore durante la validazione della richiesta admin:', error);
      return false;
    }
  }

  /**
   * Crea un client Supabase autenticato con token di servizio
   * Utile per operazioni di backend e test automatizzati
   * 
   * @param url URL dell'istanza Supabase
   * @param serviceToken Token di servizio
   * @returns Client Supabase autenticato
   */
  initServiceClient(url: string, serviceToken: string): SupabaseClient {
    if (!url || !serviceToken) {
      throw new Error('URL e token di servizio sono richiesti');
    }
    
    this.serviceClient = createClient(url, serviceToken);
    return this.serviceClient;
  }

  /**
   * Ottiene il client di servizio corrente o ne crea uno nuovo
   * 
   * @param url URL opzionale dell'istanza Supabase
   * @param serviceToken Token di servizio opzionale
   * @returns Client Supabase autenticato
   */
  getServiceClient(url?: string, serviceToken?: string): SupabaseClient {
    if (this.serviceClient) {
      return this.serviceClient;
    }
    
    if (url && serviceToken) {
      return this.initServiceClient(url, serviceToken);
    }
    
    throw new Error('Client di servizio non inizializzato. Chiamare initServiceClient prima.');
  }

  /**
   * Impersona un utente esistente senza bisogno di password
   * Solo per uso amministrativo
   * 
   * @param userId ID dell'utente da impersonare
   * @returns Sessione dell'utente impersonato
   */
  async impersonateUser(userId: string) {
    if (!this.serviceClient) {
      throw new Error('Client di servizio non inizializzato');
    }
    
    try {
      // Verifica che l'utente esista
      const { data: user, error: userError } = await this.serviceClient
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        throw new Error(`Utente non trovato: ${userError?.message || 'ID non valido'}`);
      }
      
      // Genera un token di accesso per l'utente
      // Nota: Nella versione reale dovrebbe utilizzare una funzione Edge/Cloud appropriata
      // con permessi adeguati
      const { data: adminAuthData, error: adminAuthError } = await this.serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email
      });
      
      if (adminAuthError) {
        throw adminAuthError;
      }
      
      return {
        user,
        // Utilizziamo JSON.stringify per evitare problemi di tipo
        session: adminAuthData ? JSON.stringify(adminAuthData) : null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ore
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Impersonazione utente fallita'
      };
    }
  }

  /**
   * Accedi utilizzando il token di servizio
   * 
   * @param email Email dell'utente
   * @returns Risposta di autenticazione
   */
  async authenticateWithServiceToken(email: string) {
    if (!this.serviceClient) {
      throw new Error('Client di servizio non inizializzato');
    }
    
    try {
      // Ottieni utente dal database utilizzando l'email
      const { data: user, error: userError } = await this.serviceClient
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userError || !user) {
        throw new Error(`Utente non trovato: ${userError?.message || 'Email non valida'}`);
      }
      
      // Simula una sessione autenticata per i test
      // In un'implementazione reale, questo dovrebbe utilizzare un endpoint di autenticazione appropriato
      return {
        user,
        session: {
          access_token: 'simulated-access-token-for-testing',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'simulated-refresh-token-for-testing',
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        },
        error: null
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Autenticazione con token di servizio fallita'
      };
    }
  }

  /**
   * Crea un nuovo utente amministratore
   * Solo per uso iniziale o di emergenza
   */
  async createAdminUser(email: string, password: string, fullName: string) {
    if (!this.serviceClient) {
      throw new Error('Client di servizio non inizializzato');
    }
    
    try {
      // Crea l'utente nella tabella auth
      const { data: authData, error: authError } = await this.serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Creazione utente auth fallita');
      
      // Crea il profilo utente
      const { data: profileData, error: profileError } = await this.serviceClient
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          username: email.split('@')[0],
          full_name: fullName,
          role: 'ADMIN',
          account_status: 'active',
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (profileError) throw profileError;
      
      return {
        user: profileData,
        error: null
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Creazione admin fallita'
      };
    }
  }
}

export const adminAuthService = new AdminAuthService();
