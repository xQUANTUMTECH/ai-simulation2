import { vi, describe, it, expect, beforeEach } from 'vitest';
import { simulationService, Simulation } from '../src/services/simulation-service';
import { ttsService } from '../src/services/tts-service';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Mock di supabase
vi.mock('../src/services/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getUser: vi.fn()
      }
    }
  };
});

// Mock di fetch per test TTS
vi.stubGlobal('fetch', vi.fn());
vi.stubGlobal('Audio', vi.fn());
vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn()
});

// Importiamo supabase dopo il mock
import { supabase } from '../src/services/supabase';

// Mock di fetch per ttsService
global.fetch = vi.fn();

// Token di servizio Supabase
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_SERVICE_TOKEN = 'sbp_0fb10cf168659672a21f1d7161074f37603473ff';

// Crea un ArrayBuffer mockato per il test del TTS
function createMockAudioBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(32);
  const view = new Int8Array(buffer);
  for (let i = 0; i < 32; i++) {
    view[i] = Math.floor(Math.random() * 256 - 128);
  }
  return buffer;
}

describe('Test Integrazione Simulazione e TTS', () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  
  // Esempio di simulazione mockato
  const mockSimulation: Omit<Simulation, 'id' | 'created_at' | 'updated_at'> = {
    title: 'Simulazione Emergenza Cardiaca',
    description: 'Simulazione di una risposta a emergenza cardiaca in ambiente ospedaliero',
    type: 'medical',
    difficulty: 'intermediate',
    status: 'draft',
    created_by: 'test-user-id'
  };
  
  // Mock dell'utente
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };
  
  // Mock dei partecipanti alla simulazione
  const mockParticipants = [
    { id: 'participant-1', name: 'Dottore', role: 'instructor' },
    { id: 'participant-2', name: 'Infermiere', role: 'participant' },
    { id: 'participant-3', name: 'Paziente', role: 'participant' }
  ];
  
  beforeEach(() => {
    // Reset dei mock
    vi.clearAllMocks();
    
    // Inizializzazione del client Supabase - usiamo solo mock
    // supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_TOKEN);
    
    // Per i test usiamo solo il mock di supabase
    supabaseAdmin = {} as ReturnType<typeof createClient>;
    
    // Mock della risposta di autenticazione
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    // Mock delle query supabase per simulazioni
    // @ts-ignore - ignoriamo problemi di tipo nei test
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'simulations') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockSimulation, id: 'sim-123', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                error: null
              })
            })
          }),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ ...mockSimulation, id: 'sim-123', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
              error: null
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        };
      }
      if (table === 'simulation_participants') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        };
      }
      if (table === 'simulation_metrics') {
        return {
          insert: vi.fn().mockResolvedValue({
            data: null,
            error: null
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      };
    });
    
    // Mock della risposta fetch per TTS
    // @ts-ignore - ignoriamo problemi di tipo nei test
    global.fetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => createMockAudioBuffer()
    });
    
    // Mock Audio API
    // @ts-ignore
    global.Audio = vi.fn().mockImplementation(() => {
      return {
        play: vi.fn().mockImplementation(() => {
          // Simula l'audio che finisce immediatamente
          setTimeout(() => {
            if (this.onended) this.onended();
          }, 10);
          return Promise.resolve();
        }),
        onended: null,
        onerror: null
      };
    });
    
    // Mock URL API
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });
  
  describe('Creazione e Gestione Simulazione', () => {
    it('dovrebbe creare una nuova simulazione', async () => {
      const simulation = await simulationService.createSimulation(mockSimulation);
      
      expect(supabase.from).toHaveBeenCalledWith('simulations');
      expect(simulation).toHaveProperty('id', 'sim-123');
      expect(simulation).toHaveProperty('title', mockSimulation.title);
      expect(simulation).toHaveProperty('status', 'draft');
    });
    
    it('dovrebbe aggiungere partecipanti alla simulazione', async () => {
      // Prima creiamo la simulazione
      const simulation = await simulationService.createSimulation(mockSimulation);
      
      // Poi aggiungiamo un partecipante
      await simulationService.joinSimulation(simulation.id, 'instructor');
      
      expect(supabase.from).toHaveBeenCalledWith('simulation_participants');
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
    
    it('dovrebbe aggiornare lo stato della simulazione', async () => {
      // Prima creiamo la simulazione
      const simulation = await simulationService.createSimulation(mockSimulation);
      
      // Poi aggiorniamo lo stato
      await simulationService.updateSimulationStatus(simulation.id, 'active');
      
      expect(supabase.from).toHaveBeenCalledWith('simulations');
    });
  });
  
  describe('Test TTS nella Simulazione', () => {
    it('dovrebbe sintetizzare il testo in audio', async () => {
      const text = 'Benvenuti alla simulazione di emergenza cardiaca';
      const audioBuffer = await ttsService.synthesize(text);
      
      expect(global.fetch).toHaveBeenCalled();
      expect(audioBuffer).toBeInstanceOf(ArrayBuffer);
    });
    
    it('dovrebbe riprodurre l\'audio sintetizzato', async () => {
      const text = 'Inizio della simulazione. Paziente con dolore al petto.';
      
      // Utilizzo di una promise per verificare che l'audio sia stato riprodotto
      const speakPromise = ttsService.speak(text);
      
      await expect(speakPromise).resolves.toBeUndefined();
      expect(global.fetch).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
    
    it('dovrebbe sintetizzare testo con diverse configurazioni vocali', async () => {
      const text = 'Questo è un test con voce diversa';
      const config = {
        voice: 'echo',
        emotion: 'happy' as const,
        pitch: 1.2,
        rate: 1.1
      };
      
      await ttsService.synthesize(text, config);
      
      expect(global.fetch).toHaveBeenCalled();
      // Verifica che la configurazione sia stata passata nel body
      const fetchCall = global.fetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody).toMatchObject({
        input: text,
        voice: 'echo',
        emotion: 'happy',
        pitch: 1.2,
        rate: 1.1
      });
    });
  });
  
  describe('Integrazione Simulazione e TTS', () => {
    it('dovrebbe simulare un flusso completo di simulazione con TTS', async () => {
      // 1. Creazione simulazione
      const simulation = await simulationService.createSimulation(mockSimulation);
      expect(simulation).toHaveProperty('id');
      
      // 2. Aggiunta partecipanti
      for (const participant of mockParticipants) {
        // Override del mock utente per ogni partecipante
        vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
          data: { user: { id: participant.id, email: `${participant.name.toLowerCase()}@example.com` } },
          error: null
        });
        
        await simulationService.joinSimulation(simulation.id, participant.role as any);
      }
      
      // 3. Aggiornamento stato simulazione
      await simulationService.updateSimulationStatus(simulation.id, 'active');
      
      // 4. Creazione e riproduzione di dialogo TTS per ogni partecipante
      const dialogLines = {
        'participant-1': 'Buongiorno, sono il Dottor Rossi. Come posso aiutarla?',
        'participant-2': 'Dottor Rossi, il paziente ha dolore al petto e difficoltà respiratorie.',
        'participant-3': 'Mi fa male il petto e non riesco a respirare bene.'
      };
      
      // Esegui TTS per ogni partecipante in sequenza
      for (const [participantId, line] of Object.entries(dialogLines)) {
        const participant = mockParticipants.find(p => p.id === participantId);
        // Configurazione voce diversa per ogni ruolo
        const voiceConfig = {
          voice: participantId === 'participant-3' ? 'echo' : 'alloy',
          // Uso type assertion per evitare errori TypeScript nei test
          emotion: (participantId === 'participant-3' ? 'sad' : 'neutral') as 'sad' | 'neutral' | 'happy' | 'angry'
        };
        
        await ttsService.speak(line, voiceConfig);
        
        // Registra una metrica per il partecipante
        if (participant && participant.role === 'participant') {
          await simulationService.recordMetric({
            simulation_id: simulation.id,
            participant_id: participantId,
            metric_type: 'communication',
            score: 85
          });
        }
      }
      
      // 5. Chiusura simulazione
      await simulationService.updateSimulationStatus(simulation.id, 'completed');
      
      // Verifica l'intero flusso
      expect(global.fetch).toHaveBeenCalledTimes(3); // Una chiamata TTS per ogni linea di dialogo
    });
  });
});
