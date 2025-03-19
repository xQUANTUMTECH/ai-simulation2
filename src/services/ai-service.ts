interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AIModelResponse {
  text: string;
  confidence: number;
  metadata: {
    tokens_used: number;
    response_time: number;
    model_used: string;
  };
}

interface OllamaResponse {
  response: string;
}

export interface AIModel {
  name: string;
  context: number;
  capabilities: string[];
  specialization: string;
  canGenerateScenarios?: boolean;
}

export const availableModels: AIModel[] = [
  {
    name: 'mistral',
    context: 8192,
    capabilities: ['Analisi normativa', 'Consulenza contrattuale', 'Simulazione cliente'],
    specialization: 'Consulenza del lavoro',
    canGenerateScenarios: true
  },
  {
    name: 'llama2',
    context: 4096,
    capabilities: ['Analisi documenti', 'Normativa del lavoro', 'Contrattualistica'],
    specialization: 'Diritto del lavoro'
  },
  {
    name: 'codellama',
    context: 16384,
    capabilities: ['Analisi tecnica', 'Documentazione', 'Procedure amministrative'],
    specialization: 'Amministrazione'
  }
];

// Importiamo il tipo TTSService invece del servizio concreto
import { TTSService } from './voice-service';
import { supabase } from './supabase';
import { apiKeyService } from './api-key-service';
import { apiErrorService } from './api-error-service';

class AIService implements TTSService {
  
  // Track model usage
  private async recordUsage(
    modelName: string,
    requestType: string,
    success: boolean,
    responseTime: number,
    tokensUsed?: number,
    error?: string,
    fallbackUsed?: boolean
  ): Promise<void> {
    try {
      await supabase?.from('ai_model_usage').insert({
        model_name: modelName,
        request_type: requestType,
        success,
        response_time: responseTime,
        tokens_used: tokensUsed,
        error_message: error,
        fallback_used: fallbackUsed
      });
    } catch (err) {
      console.error('Failed to record AI usage:', err);
    }
  }

  // Text-to-speech with Groq
  async textToSpeech(text: string, options: {
    model?: string;
    voice?: string;
    language?: string;
    emotion?: string;
  } = {}): Promise<ArrayBuffer> {
    const startTime = Date.now();
    
    try {
      // Utilizza il servizio di gestione delle API key
      const apiKey = await apiKeyService.getApiKey('groq');
      if (!apiKey) {
        throw new Error('API key Groq non disponibile');
      }
      
      // Utilizza apiErrorService per il retry automatico
      return await apiErrorService.executeWithRetry(
        async () => {
          const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: options.model || 'whisper-large-v3',
              input: text,
              voice: options.voice || 'alloy',
              language: options.language || 'it',
              emotion: options.emotion || 'neutral'
            })
          });

          if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
          }

          const audioData = await response.arrayBuffer();
          
          await this.recordUsage(
            'groq-tts',
            'speech',
            true,
            Date.now() - startTime
          );

          return audioData;
        },
        {
          endpoint: 'textToSpeech',
          service: 'groq'
        }
      );
    } catch (error) {
      await this.recordUsage(
        'groq-tts',
        'speech',
        false,
        Date.now() - startTime,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return apiErrorService.handleError(error, 'textToSpeech', 'groq');
    }
  }
  // Process response with error handling and fallback
  private async processResponse(
    response: AIModelResponse,
    modelName: string,
    requestType: string,
    startTime: number
  ): Promise<string> {
    const responseTime = Date.now() - startTime;
    
    await this.recordUsage(
      modelName,
      requestType,
      true,
      responseTime,
      response.metadata.tokens_used
    );

    return response.text;
  }

  // Handle errors with fallback
  private async handleError(
    error: any,
    modelName: string,
    requestType: string,
    startTime: number,
    fallbackModel?: string,
    prompt?: string
  ): Promise<string> {
    const responseTime = Date.now() - startTime;
    
    await this.recordUsage(
      modelName,
      requestType,
      false,
      responseTime,
      undefined,
      error.message
    );

    if (fallbackModel && prompt) {
      console.log(`Falling back to ${fallbackModel}`);
      return this.generateResponse(prompt, fallbackModel);
    }

    throw error;
  }

  async generateResponse(prompt: string, model = 'deepseek'): Promise<string> {
    const startTime = Date.now();
    const requestType = 'text_generation';

    try {
      // Ottieni la chiave API da ApiKeyService
      const apiKey = await apiKeyService.getApiKey('openrouter');
      if (!apiKey) {
        throw new Error('OpenRouter API key non disponibile');
      }

      // Usa apiErrorService per il retry automatico
      return await apiErrorService.executeWithRetry(
        async () => {
          const openRouterResponse = await this.queryOpenRouter(prompt, model, apiKey);
          return this.processResponse(
            {
              text: openRouterResponse,
              confidence: 1,
              metadata: {
                tokens_used: 0,
                response_time: Date.now() - startTime,
                model_used: `openrouter/${model}`
              }
            },
            model,
            requestType,
            startTime
          );
        },
        {
          endpoint: 'generateResponse',
          service: 'openrouter'
        }
      );
    } catch (err) {
      return this.handleError(err, model, requestType, startTime, undefined, prompt);
    }
  }

  private async queryOpenRouter(prompt: string, model: string, apiKey: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.mapModelToOpenRouter(model),
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Errore OpenRouter: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data.choices[0].message.content;
  }

  private mapModelToOpenRouter(model: string): string {
    const modelMap: Record<string, string> = {
      'deepseek': 'deepseek/deepseek-r1-zero:free',
      'gemini': 'google/gemini-1.5-flash-thinking',
      'mistral': 'mistralai/mistral-7b-instruct',
      'llama2': 'meta-llama/llama-2-70b-chat',
      'codellama': 'codellama/codellama-34b-instruct',
      'claude': 'anthropic/claude-2',
      'gpt': 'openai/gpt-3.5-turbo-0125'
    };
    return modelMap[model] || modelMap.deepseek; // Utilizziamo deepseek come modello predefinito
  }

  async generateScenarioFromChat(messages: Array<{ role: string; content: string }>): Promise<{
    title: string;
    description: string;
    objectives: string[];
    roles: Array<{ title: string; description: string; avatar_url?: string }>;
    phases: Array<{ name: string; description: string; duration: string }>;
    metrics: Array<{ name: string; target: number }>;
    avatars: Array<{ name: string; role: string; description: string; avatar_url?: string }>;
  }> {
    console.log('Generazione scenario da chat iniziata');
    
    // Costruisci un prompt strutturato che indichi chiaramente il formato di output richiesto
    const structuredPrompt = `
    Crea uno scenario di simulazione per la formazione su tematiche di consulenza del lavoro basato sulla seguente conversazione:
    ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
    
    Rispondi con uno scenario formattato ESATTAMENTE come JSON con la seguente struttura:
    {
      "title": "Titolo dello scenario",
      "description": "Descrizione dettagliata dello scenario",
      "objectives": ["Obiettivo 1", "Obiettivo 2", ...],
      "roles": [
        { "title": "Titolo ruolo", "description": "Descrizione del ruolo" },
        ...
      ],
      "phases": [
        { "name": "Nome fase", "description": "Descrizione della fase", "duration": "durata in minuti (es: 10m)" },
        ...
      ],
      "metrics": [
        { "name": "Nome metrica", "target": valore numerico obiettivo },
        ...
      ],
      "avatars": [
        { "name": "Nome avatar", "role": "Ruolo nell'organizzazione", "description": "Descrizione dettagliata" },
        ...
      ]
    }
    
    Lo scenario DEVE essere relativo alla consulenza del lavoro, diritto del lavoro o amministrazione, NON in ambito medico o altro.
    Includi almeno 2-4 avatar con nomi, ruoli e descrizioni dettagliate.
    NON includere spiegazioni o altro testo, solo il JSON formattato.
    `;
    
    try {
      console.log('Invio prompt per generazione scenario:', structuredPrompt.substring(0, 100) + '...');
      
      // Utilizza il modello più avanzato disponibile con istruzioni più chiare
      const response = await this.generateResponse(structuredPrompt, 'deepseek');
      console.log('Risposta ricevuta da AI:', response.substring(0, 100) + '...');
      
      // Salva la risposta completa per debug
      await this.saveScenarioDebugInfo(messages, structuredPrompt, response);
      
      let scenario;
      try {
        scenario = this.parseScenarioResponse(response);
      } catch (parseError) {
        console.error('Errore durante il parsing dello scenario, utilizzo fallback:', parseError);
        // In caso di errore di parsing, utilizza lo scenario di fallback
        scenario = this.getDefaultScenario();
      }
      
      // Dopo il parsing, salva lo scenario generato nel database
      try {
        await this.saveGeneratedScenario(scenario);
      } catch (dbError) {
        console.error('Errore nel salvataggio su database, continuo comunque:', dbError);
        // Continuiamo comunque anche se il salvataggio su DB fallisce
      }
      
      // Assicuriamoci di restituire sempre uno scenario valido
      return scenario;
    } catch (error) {
      console.error('Errore nella generazione dello scenario:', error);
      
      // Salva l'errore per debug
      await this.saveScenarioDebugInfo(messages, structuredPrompt, '', String(error));
      
      console.log('Restituisco scenario di fallback a causa dell\'errore');
      // Invece di lanciare un errore, restituiamo uno scenario di fallback
      return this.getDefaultScenario();
    }
  }
  
  // Scenario predefinito di fallback da utilizzare in caso di errori
  private getDefaultScenario() {
    return {
      title: "Consulenza sul Contratto di Lavoro",
      description: "Scenario di simulazione per la consulenza su un contratto di lavoro a tempo determinato",
      objectives: [
        "Analizzare le esigenze del cliente",
        "Fornire informazioni accurate sulle normative vigenti",
        "Valutare le clausole contrattuali proposte",
        "Suggerire modifiche per tutelare i diritti del lavoratore"
      ],
      roles: [
        { title: "Consulente del Lavoro", description: "Esperto che fornisce la consulenza professionale" },
        { title: "Cliente Lavoratore", description: "Persona che deve firmare un contratto e cerca consulenza" }
      ],
      phases: [
        { name: "Analisi", description: "Esame del contratto proposto e delle esigenze del cliente", duration: "15m" },
        { name: "Consulenza", description: "Spiegazione degli aspetti normativi e contrattuali", duration: "20m" },
        { name: "Negoziazione", description: "Supporto nella negoziazione delle condizioni", duration: "25m" }
      ],
      metrics: [
        { name: "Chiarezza Informazioni", target: 95 },
        { name: "Completezza Analisi", target: 90 },
        { name: "Soddisfazione Cliente", target: 85 }
      ],
      avatars: [
        { name: "Paolo Bianchi", role: "Consulente del Lavoro", description: "Professionista esperto in contrattualistica e diritto del lavoro con 10 anni di esperienza." },
        { name: "Marco Verdi", role: "Cliente", description: "Lavoratore che ha ricevuto una proposta di contratto e necessita di consulenza professionale." },
        { name: "Laura Rossi", role: "HR Manager", description: "Rappresentante dell'azienda che ha proposto il contratto al lavoratore." }
      ]
    };
  }

  // Salva informazioni di debug per la generazione dello scenario
  private async saveScenarioDebugInfo(
    messages: Array<{ role: string; content: string }>,
    prompt: string,
    response: string,
    error?: string
  ) {
    try {
      if (!supabase) return;
      
      await supabase.from('scenario_generation_logs').insert({
        input_messages: messages,
        prompt,
        raw_response: response,
        error_message: error,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Errore nel salvare i log debug:', err);
    }
  }

  // Salva lo scenario generato nel database
  private async saveGeneratedScenario(scenario: any) {
    try {
      if (!supabase) return;
      
      // 1. Salva lo scenario base
      const { data: scenarioData, error: scenarioError } = await supabase
        .from('scenarios')
        .insert({
          title: scenario.title,
          description: scenario.description,
          objectives: scenario.objectives,
          phases: scenario.phases,
          metrics: scenario.metrics,
          generated_by_ai: true,
          status: 'active'
        })
        .select()
        .single();
      
      if (scenarioError) throw scenarioError;
      
      // 2. Salva gli avatar associati allo scenario
      if (scenario.avatars && Array.isArray(scenario.avatars) && scenarioData) {
        const avatarPromises = scenario.avatars.map(async (avatar: any) => {
          return supabase
            ?.from('avatars')
            .insert({
              name: avatar.name,
              role: avatar.role,
              description: avatar.description,
              scenario_id: scenarioData.id,
              avatar_type: 'ai',
              status: 'active'
            });
        });
        
        await Promise.all(avatarPromises);
      }
      
      console.log('Scenario e avatar salvati con successo nel database');
    } catch (err) {
      console.error('Errore nel salvare lo scenario nel database:', err);
    }
  }

  private parseScenarioResponse(response: string) {
    console.log('Parsing della risposta scenario...');
    
    try {
      // Approccio più robusto per estrarre il JSON valido dalla risposta
      let jsonStr = '';
      
      // Prima prova con regex per estrarre un oggetto JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        // Se non trova match, pulisci la risposta e prova a interpretarla direttamente
        jsonStr = response.trim();
        // Rimuovi eventuali backtick o markdown
        jsonStr = jsonStr.replace(/```json|```/g, '').trim();
      }
      
      console.log('JSON da analizzare:', jsonStr.substring(0, 150) + '...');
      
      // Parse del JSON
      const scenario = JSON.parse(jsonStr);
      
      // Validazione e normalizzazione della struttura
      const validatedScenario = {
        title: scenario.title || "Scenario di formazione sulla consulenza del lavoro",
        description: scenario.description || "Simulazione pratica di consulenza del lavoro",
        objectives: Array.isArray(scenario.objectives) ? scenario.objectives : ["Comprendere le normative", "Migliorare la comunicazione col cliente"],
        roles: Array.isArray(scenario.roles) 
          ? scenario.roles.map((role: any) => ({
              title: role.title || 'Ruolo professionale',
              description: role.description || 'Descrizione non disponibile',
              avatar_url: role.avatar_url || undefined
            }))
          : [{ title: "Consulente del lavoro", description: "Esperto in normativa del lavoro" }],
        phases: Array.isArray(scenario.phases)
          ? scenario.phases.map((phase: any) => ({
              name: phase.name || 'Fase di simulazione',
              description: phase.description || 'Descrizione non disponibile',
              duration: phase.duration || '15m'
            }))
          : [{ name: "Analisi", description: "Esame del caso", duration: "15m" }],
        metrics: Array.isArray(scenario.metrics)
          ? scenario.metrics.map((metric: any) => ({
              name: metric.name || 'Metrica di valutazione',
              target: typeof metric.target === 'number' ? metric.target : 90
            }))
          : [{ name: "Completezza analisi", target: 90 }],
        avatars: Array.isArray(scenario.avatars)
          ? scenario.avatars.map((avatar: any) => ({
              name: avatar.name || 'Personaggio simulazione',
              role: avatar.role || 'Ruolo professionale',
              description: avatar.description || 'Descrizione non disponibile',
              avatar_url: avatar.avatar_url || undefined
            }))
          : [
              { name: "Mario Rossi", role: "Consulente senior", description: "Esperto con 15 anni di esperienza" },
              { name: "Luigi Bianchi", role: "Cliente", description: "Imprenditore con piccola azienda" }
            ]
      };
      
      console.log('Scenario generato con successo:', validatedScenario.title);
      console.log(`Generati ${validatedScenario.avatars.length} avatar`);
      
      return validatedScenario;
    } catch (error) {
      console.error('Errore nel parsing dello scenario JSON:', error);
      
      // In caso di errore di parsing, restituisci uno scenario fallback
      return {
        title: "Consulenza sul Contratto di Lavoro",
        description: "Scenario di simulazione per la consulenza su un contratto di lavoro a tempo determinato",
        objectives: [
          "Analizzare le esigenze del cliente",
          "Fornire informazioni accurate sulle normative vigenti",
          "Valutare le clausole contrattuali proposte",
          "Suggerire modifiche per tutelare i diritti del lavoratore"
        ],
        roles: [
          { title: "Consulente del Lavoro", description: "Esperto che fornisce la consulenza professionale" },
          { title: "Cliente Lavoratore", description: "Persona che deve firmare un contratto e cerca consulenza" }
        ],
        phases: [
          { name: "Analisi", description: "Esame del contratto proposto e delle esigenze del cliente", duration: "15m" },
          { name: "Consulenza", description: "Spiegazione degli aspetti normativi e contrattuali", duration: "20m" },
          { name: "Negoziazione", description: "Supporto nella negoziazione delle condizioni", duration: "25m" }
        ],
        metrics: [
          { name: "Chiarezza Informazioni", target: 95 },
          { name: "Completezza Analisi", target: 90 },
          { name: "Soddisfazione Cliente", target: 85 }
        ],
        avatars: [
          { name: "Paolo Bianchi", role: "Consulente del Lavoro", description: "Professionista esperto in contrattualistica e diritto del lavoro con 10 anni di esperienza." },
          { name: "Marco Verdi", role: "Cliente", description: "Lavoratore che ha ricevuto una proposta di contratto e necessita di consulenza professionale." },
          { name: "Laura Rossi", role: "HR Manager", description: "Rappresentante dell'azienda che ha proposto il contratto al lavoratore." }
        ]
      };
    }
  }
}

export const aiService = new AIService();
