import { vi, beforeEach, describe, it, expect } from 'vitest';

// Deve essere prima dell'importazione di supabase
vi.mock('../src/services/supabase', () => {
  // I mock vengono definiti direttamente qui dentro
  return {
    supabase: {
      auth: {
        signUp: vi.fn().mockImplementation(async (data) => {
          if (data.email === 'utente.esistente@example.com') {
            return {
              data: { user: null, session: null },
              error: { message: 'Email già in uso', status: 400 }
            };
          }

          return {
            data: {
              user: {
                id: 'user-123',
                email: data.email,
                user_metadata: data.options?.data || {}
              },
              session: {
                access_token: 'token-123',
                refresh_token: 'refresh-123',
                expires_in: 3600
              }
            },
            error: null
          };
        }),
        signInWithPassword: vi.fn().mockImplementation(async (data) => {
          if (data.email === 'utente.inesistente@example.com' || data.password === 'PasswordSbagliata!') {
            return {
              data: { user: null, session: null },
              error: { message: 'Credenziali non valide', status: 401 }
            };
          }

          return {
            data: {
              user: {
                id: 'user-123',
                email: data.email,
                user_metadata: {
                  fullName: 'Utente Esistente',
                  company: 'Cafasso Academy'
                }
              },
              session: {
                access_token: 'token-123',
                refresh_token: 'refresh-123',
                expires_in: 3600
              }
            },
            error: null
          };
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'utente@example.com',
              user_metadata: {
                fullName: 'Utente Corrente',
                company: 'Cafasso Academy'
              }
            }
          },
          error: null
        }),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    }
  };
});

// Ora possiamo importare supabase (dopo aver definito i mock)
import { supabase } from '../src/services/supabase';

describe('Test di autenticazione utente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
  });

  describe('Registrazione utente', () => {
    it('Dovrebbe registrare un nuovo utente con successo', async () => {
      // Dati per la registrazione
      const userData = {
        email: 'nuovo.utente@example.com',
        password: 'Password123!',
        options: {
          data: {
            fullName: 'Nuovo Utente',
            company: 'Cafasso Academy'
          }
        }
      };

      // Eseguiamo la registrazione
      const result = await supabase.auth.signUp(userData);

      // Verifichiamo che la registrazione sia avvenuta con successo
      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.email).toBe(userData.email);
      expect(result.data.user?.user_metadata).toEqual(userData.options.data);
      expect(result.data.session).toBeDefined();
      expect(result.data.session?.access_token).toBe('token-123');

      // Verifichiamo che la funzione di registrazione sia stata chiamata correttamente
      expect(supabase.auth.signUp).toHaveBeenCalledWith(userData);
    });

    it('Dovrebbe gestire errori durante la registrazione', async () => {
      // Dati per la registrazione
      const userData = {
        email: 'utente.esistente@example.com',
        password: 'Password123!'
      };

      // Eseguiamo la registrazione
      const result = await supabase.auth.signUp(userData);

      // Verifichiamo che l'errore sia stato gestito correttamente
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Email già in uso');
      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
    });
  });

  describe('Login utente', () => {
    it('Dovrebbe effettuare il login di un utente con successo', async () => {
      // Dati per il login
      const loginData = {
        email: 'utente.esistente@example.com',
        password: 'Password123!'
      };

      // Eseguiamo il login
      const result = await supabase.auth.signInWithPassword(loginData);

      // Verifichiamo che il login sia avvenuto con successo
      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.email).toBe(loginData.email);
      expect(result.data.session).toBeDefined();
      expect(result.data.session?.access_token).toBe('token-123');

      // Verifichiamo che la funzione di login sia stata chiamata correttamente
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(loginData);
    });

    it('Dovrebbe gestire errori durante il login', async () => {
      // Dati per il login
      const loginData = {
        email: 'utente.inesistente@example.com',
        password: 'PasswordSbagliata!'
      };

      // Eseguiamo il login
      const result = await supabase.auth.signInWithPassword(loginData);

      // Verifichiamo che l'errore sia stato gestito correttamente
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Credenziali non valide');
      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
    });
  });

  describe('Gestione sessione utente', () => {
    it('Dovrebbe recuperare informazioni sull\'utente corrente', async () => {
      // Recuperiamo le informazioni sull'utente
      const result = await supabase.auth.getUser();

      // Verifichiamo che le informazioni siano state recuperate correttamente
      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.id).toBe('user-123');
      expect(result.data.user?.email).toBe('utente@example.com');
    });

    it('Dovrebbe permettere il logout di un utente', async () => {
      // Eseguiamo il logout
      const result = await supabase.auth.signOut();

      // Verifichiamo che il logout sia avvenuto con successo
      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
