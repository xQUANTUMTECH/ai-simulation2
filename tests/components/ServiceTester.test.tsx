// Dichiariamo i mock prima delle importazioni
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock di supabase - deve essere posizionato PRIMA delle variabili di mock e importazioni
vi.mock('../../src/services/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      storage: {
        listBuckets: vi.fn().mockResolvedValue({ data: [], error: null })
      }
    }
  };
});

// Ora importiamo React e altri moduli necessari
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Importiamo il componente da testare
import { ServiceTester } from '../../src/components/test/ServiceTester';
import { supabase } from '../../src/services/supabase';

// Otteniamo i mock dopo l'importazione
const mockGetSession = vi.mocked(supabase.auth.getSession);
const mockFrom = vi.mocked(supabase.from);
const mockListBuckets = vi.mocked(supabase.storage.listBuckets);

describe('ServiceTester', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Renderizza correttamente in modalità dark', () => {
    render(<ServiceTester isDarkMode={true} />);
    expect(screen.getByText('Test dei Servizi')).toBeInTheDocument();
    // I test si avviano automaticamente quindi il testo sarà "In esecuzione..." invece di "Esegui test"
    expect(screen.getByText('In esecuzione...')).toBeInTheDocument();
    expect(screen.getByText('Solo errori')).toBeInTheDocument();
  });

  it('Renderizza correttamente in modalità light', () => {
    render(<ServiceTester isDarkMode={false} />);
    expect(screen.getByText('Test dei Servizi')).toBeInTheDocument();
    // I test si avviano automaticamente quindi il testo sarà "In esecuzione..." invece di "Esegui test"
    expect(screen.getByText('In esecuzione...')).toBeInTheDocument();
  });

  it('Mostra i risultati dei test dopo l\'esecuzione', async () => {
    render(<ServiceTester isDarkMode={true} />);
    
    // Verifica che i test vengano eseguiti automaticamente all'avvio
    await waitFor(() => {
      expect(screen.getByText('Autenticazione')).toBeInTheDocument();
      expect(screen.getByText('Video Service')).toBeInTheDocument();
      expect(screen.getByText('Document Service')).toBeInTheDocument();
      expect(screen.getByText('Quiz Service')).toBeInTheDocument();
      expect(screen.getByText('AI Service')).toBeInTheDocument();
      expect(screen.getByText('Upload Service')).toBeInTheDocument();
    });
  });

  it('Chiama correttamente supabase quando esegue i test', async () => {
    render(<ServiceTester isDarkMode={true} />);
    
    // Attendi che i test vengano eseguiti
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('videos');
      expect(mockFrom).toHaveBeenCalledWith('documents');
      expect(mockFrom).toHaveBeenCalledWith('quizzes');
      expect(mockListBuckets).toHaveBeenCalled();
    });
  });
});
