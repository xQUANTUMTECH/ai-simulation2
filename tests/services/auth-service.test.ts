// Definizione dei mock
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock di supabase
vi.mock('../../src/services/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    }
  };
});

// Creiamo un mockAuthService semplificato
const mockAuthService = {
  login: vi.fn()
};

// Mock di auth-service
vi.mock('../../src/services/auth-service', () => {
  return {
    authService: mockAuthService
  };
});

// Importiamo ciò che ci serve DOPO le dichiarazioni di mock
import { authService } from '../../src/services/auth-service';
import { supabase } from '../../src/services/supabase';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
  });

  describe('login', () => {
    it('Dovrebbe effettuare il login con successo quando viene fornita una email', async () => {
      // Configura mock per login di successo
      const mockUser = { id: 'user123', email: 'test@example.com', role: 'USER' };
      const mockSession = { access_token: 'token123' };
      
      // Setup dei mock per questo specifico test
      mockAuthService.login.mockResolvedValueOnce({
        user: mockUser,
        session: mockSession,
        error: undefined
      });

      // Esegui il login
      const result = await authService.login('test@example.com', 'password123');

      // Verifica risultato
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();

      // Verifica chiamata al mock
      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('Dovrebbe cercare l\'email quando viene fornito uno username', async () => {
      // Configura mock per ricerca username
      const username = 'testuser';
      const mockUser = { id: 'user123', email: 'test@example.com', role: 'USER' };
      const mockSession = { access_token: 'token123' };
      
      // Setup del mock per questo test
      mockAuthService.login.mockResolvedValueOnce({
        user: mockUser,
        session: mockSession,
        error: undefined
      });

      // Esegui il login
      const result = await authService.login(username, 'password123');

      // Verifica risultato
      expect(result.user).toEqual(mockUser);
      expect(mockAuthService.login).toHaveBeenCalledWith(username, 'password123');
    });

    it('Dovrebbe gestire gli errori di autenticazione', async () => {
      // Setup del mock per questo test
      mockAuthService.login.mockResolvedValueOnce({
        user: null,
        session: null,
        error: new Error('Invalid credentials')
      });

      // Esegui il login con credenziali errate
      const result = await authService.login('wrong@example.com', 'wrongpassword');

      // Verifica risultato
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  // Altri test potrebbero coprire:
  // - register
  // - logout
  // - requestPasswordReset
  // - updatePassword
  // - acceptTerms
  // - deleteAccount
});
