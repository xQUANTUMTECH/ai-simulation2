/**
 * Service per la gestione dell'autenticazione con l'API Express e MongoDB
 */

// URL di base per le chiamate API di autenticazione
const AUTH_API_URL = 'http://localhost:3000/api/auth';

/**
 * Servizio di autenticazione semplificato che utilizza l'API Express
 */
class AuthService {
  constructor() {
    this.user = null;
    this.token = localStorage.getItem('auth_token');
    
    // Recupera user se c'è un token in localStorage
    if (this.token) {
      this.getCurrentUser().catch(err => {
        console.error('Errore nel recupero dell\'utente corrente:', err);
        this.clearAuth();
      });
    }
  }

  /**
   * Effettua il login di un utente
   * @param {string} email - Email dell'utente o username
   * @param {string} password - Password dell'utente
   * @returns {Promise<Object>} - Dati dell'utente e token
   */
  async login(email, password) {
    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore di login: ${response.status}`);
      }

      const data = await response.json();
      
      // Salva token e info utente
      localStorage.setItem('auth_token', data.token);
      this.token = data.token;
      this.user = data.user;
      
      return { user: data.user, token: data.token };
    } catch (error) {
      console.error('Errore di login:', error);
      throw error;
    }
  }
  
  /**
   * Registra un nuovo utente
   * @param {Object} userData - Dati dell'utente da registrare
   * @returns {Promise<Object>} - Dati dell'utente registrato
   */
  async register(userData) {
    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Errore di registrazione: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Errore di registrazione:', error);
      throw error;
    }
  }
  
  /**
   * Recupera i dati dell'utente corrente
   * @returns {Promise<Object>} - Dati dell'utente corrente
   */
  async getCurrentUser() {
    if (!this.token) {
      return null;
    }
    
    try {
      const response = await fetch(`${AUTH_API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Sessione scaduta o non valida');
      }

      const data = await response.json();
      this.user = data.user;
      return data.user;
    } catch (error) {
      console.error('Errore nel recupero dell\'utente:', error);
      this.clearAuth();
      throw error;
    }
  }
  
  /**
   * Effettua il logout dell'utente
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      if (this.token) {
        await fetch(`${AUTH_API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }).catch(err => console.warn('Errore nella richiesta di logout:', err));
      }
    } finally {
      this.clearAuth();
    }
  }
  
  /**
   * Pulisce i dati di autenticazione locali
   */
  clearAuth() {
    localStorage.removeItem('auth_token');
    this.token = null;
    this.user = null;
  }
  
  /**
   * Verifica se l'utente è autenticato
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.token;
  }
  
  /**
   * Verifica se l'utente è un amministratore controllando il database
   * @returns {Promise<boolean>} - Promise che restituisce true se l'utente è admin
   */
  async checkAdminStatus() {
    if (!this.token) {
      return false;
    }
    
    try {
      const response = await fetch(`${AUTH_API_URL}/check-admin`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        console.error('Errore nella verifica dello stato admin');
        return false;
      }

      const data = await response.json();
      return data.isAdmin === true;
    } catch (error) {
      console.error('Errore durante la verifica dello stato admin:', error);
      return false;
    }
  }
  
  /**
   * Verifica se l'utente è un amministratore (dato locale)
   * @returns {boolean}
   */
  isAdmin() {
    return this.user && this.user.role === 'ADMIN';
  }
  
  /**
   * Ottiene il token di autorizzazione
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }
}

// Esporta un'istanza singleton del servizio
export const authService = new AuthService();

export default authService;
