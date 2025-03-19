/**
 * Definizione dei tipi per auth-service.js
 */

export interface User {
  _id: string;
  id?: string;
  email: string;
  username: string;
  role?: string;
  full_name?: string;
  company?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface AuthService {
  user: User | null;
  token: string | null;
  
  /**
   * Effettua il login di un utente
   * @param email - Email dell'utente o username
   * @param password - Password dell'utente
   * @returns Dati dell'utente e token
   */
  login(email: string, password: string): Promise<AuthResponse>;
  
  /**
   * Registra un nuovo utente
   * @param userData - Dati dell'utente da registrare
   * @returns Dati dell'utente registrato
   */
  register(userData: {
    email: string;
    password: string;
    username: string;
    full_name?: string;
    company?: string;
  }): Promise<AuthResponse>;
  
  /**
   * Recupera i dati dell'utente corrente
   * @returns Dati dell'utente corrente
   */
  getCurrentUser(): Promise<User | null>;
  
  /**
   * Effettua il logout dell'utente
   */
  logout(): Promise<void>;
  
  /**
   * Pulisce i dati di autenticazione locali
   */
  clearAuth(): void;
  
  /**
   * Verifica se l'utente è autenticato
   * @returns true se l'utente è autenticato, false altrimenti
   */
  isAuthenticated(): boolean;
  
  /**
   * Verifica se l'utente è un amministratore controllando il database
   * @returns Promise che restituisce true se l'utente è admin, false altrimenti
   */
  checkAdminStatus(): Promise<boolean>;
  
  /**
   * Verifica se l'utente è un amministratore basandosi sui dati locali
   * @returns true se l'utente è un amministratore, false altrimenti
   */
  isAdmin(): boolean;
  
  /**
   * Ottiene il token di autorizzazione
   * @returns Il token JWT o null se non autenticato
   */
  getToken(): string | null;
}

declare const authService: AuthService;
export default authService;
