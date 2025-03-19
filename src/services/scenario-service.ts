import { supabase } from './supabase';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  avatars: number;
  status: string;
  type?: string;
  difficulty?: 'Facile' | 'Medio' | 'Avanzato';
  duration?: string;
  objectives?: string[];
  created_by: string;
  created_at: string;
}

class ScenarioService {
  // Array locale in memoria per gestire gli scenari in caso di problemi con il database
  private localScenarios: Scenario[] = [];
  
  constructor() {
    // Inizializza con alcuni scenari di esempio
    this.localScenarios = [
      {
        id: '1',
        title: 'Addestramento Chirurgico',
        description: 'Scenario di simulazione per procedure chirurgiche avanzate con focus su tecniche mini-invasive.',
        avatars: 4,
        status: 'Disponibile',
        difficulty: 'Avanzato',
        created_by: 'system',
        created_at: new Date().toISOString()
      }
    ];
  }
  
  // Recupera tutti gli scenari per un utente
  async getScenarios(userId: string): Promise<Scenario[]> {
    try {
      // Prima tenta di recuperare dal database
      if (supabase) {
        const { data, error } = await supabase
          .from('scenarios')
          .select('*')
          .or(`created_by.eq.${userId},public.eq.true`);
        
        if (error) {
          console.warn('Errore nel recupero scenari da Supabase:', error);
          // Fallback agli scenari locali
          return this.localScenarios;
        }
        
        if (data && data.length > 0) {
          console.log(`Recuperati ${data.length} scenari dal database`);
          return data;
        }
      }
      
      // Se il database non restituisce dati, usa gli scenari locali
      console.log('Utilizzo scenari locali', this.localScenarios);
      return this.localScenarios;
    } catch (err) {
      console.error('Errore non gestito nel recupero scenari:', err);
      return this.localScenarios;
    }
  }
  
  // Crea un nuovo scenario
  async createScenario(scenario: Omit<Scenario, 'id' | 'created_at'> & { id?: string }): Promise<Scenario> {
    try {
      const newScenario: Scenario = {
        id: scenario.id || crypto.randomUUID(),
        title: scenario.title,
        description: scenario.description,
        avatars: scenario.avatars,
        status: scenario.status || 'Disponibile',
        type: scenario.type,
        difficulty: scenario.difficulty,
        duration: scenario.duration,
        objectives: scenario.objectives,
        created_by: scenario.created_by,
        created_at: new Date().toISOString()
      };
      
      // Prova a salvare nel database
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('scenarios')
            .insert(newScenario)
            .select()
            .single();
            
          if (error) {
            console.warn('Errore nel salvataggio scenario su Supabase:', error);
          } else if (data) {
            console.log('Scenario salvato con successo su Supabase:', data);
            // Aggiorna lo scenario locale con l'ID dal database
            Object.assign(newScenario, data);
          }
        } catch (dbError) {
          console.error('Errore imprevisto nel salvataggio su database:', dbError);
        }
      }
      
      // Aggiungi lo scenario all'array locale (anche come backup)
      this.localScenarios.push(newScenario);
      console.log('Scenario aggiunto localmente:', newScenario);
      
      return newScenario;
    } catch (err) {
      console.error('Errore nella creazione dello scenario:', err);
      throw err;
    }
  }
  
  // Elimina uno scenario
  async deleteScenario(id: string): Promise<void> {
    try {
      // Elimina dal database
      if (supabase) {
        const { error } = await supabase
          .from('scenarios')
          .delete()
          .eq('id', id);
          
        if (error) {
          console.warn('Errore nell\'eliminazione scenario da Supabase:', error);
        }
      }
      
      // Elimina dall'array locale
      this.localScenarios = this.localScenarios.filter(s => s.id !== id);
      console.log('Scenario eliminato localmente');
    } catch (err) {
      console.error('Errore nell\'eliminazione dello scenario:', err);
      throw err;
    }
  }
}

export const scenarioService = new ScenarioService();
