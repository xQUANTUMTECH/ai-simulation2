# MANUALE COMPLETO CAFASSO AI ACADEMY

## Indice
1. [Introduzione](#introduzione)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Funzionalità Principali](#funzionalità-principali)
4. [Percorso Utente](#percorso-utente)
5. [Componenti di Simulazione](#componenti-di-simulazione)
6. [Tecnologie di Intelligenza Artificiale](#tecnologie-di-intelligenza-artificiale)
7. [Integrazione con Supabase](#integrazione-con-supabase)
8. [Funzionalità di Academy](#funzionalità-di-academy)
9. [Amministrazione](#amministrazione)
10. [Troubleshooting](#troubleshooting)

## Introduzione

Cafasso AI Academy è una piattaforma avanzata di formazione specializzata per consulenti del lavoro, che combina:
- E-learning tradizionale (corsi, video, certificazioni)
- Simulazioni interattive con avatar AI
- Training basato su scenari realistici

La piattaforma è progettata per fornire un'esperienza formativa immersiva e pratica, permettendo agli utenti di:
- Apprendere concetti teorici attraverso corsi strutturati
- Applicare le conoscenze in scenari simulati
- Interagire con avatar AI per esercitare competenze comunicative e professionali
- Ricevere feedback dettagliati sulle performance
- Ottenere certificazioni per le competenze acquisite

## Architettura del Sistema

L'architettura di Cafasso AI Academy è basata su:

### Frontend
- **Framework**: React con TypeScript
- **Styling**: TailwindCSS per UI responsive
- **Stato**: Gestione locale con React Hooks e Context API
- **Routing**: Gestito internamente con componenti condizionali

### Backend
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Supabase Auth
- **Storage**: Supabase Storage per file, video e documenti
- **API**: RESTful API per comunicazione client-server
- **Funzioni Edge**: Per elaborazione serverless

### Servizi di AI
- **NLP**: Elaborazione del linguaggio naturale per chat
- **TTS**: Sintesi vocale per avatar AI
- **STT**: Riconoscimento vocale per input utente
- **Generazione scenari**: Creazione dinamica di scenari formativi

## Funzionalità Principali

### Autenticazione e Sicurezza
- Sistema di registrazione e login
- Autenticazione via email/password o SSO
- Ruoli utente differenziati (studente, admin)
- Protezione RLS a livello database
- Token di sicurezza per accesso API

### Dashboard Personale
- Riepilogo progressi
- Corsi recenti e consigliati
- Notifiche personalizzate
- Statistiche di apprendimento
- Accesso rapido alle simulazioni

### Sistema di Corsi
- Catalogo corsi categorizzato
- Contenuti multimediali (video, documenti, quiz)
- Tracciamento progressi
- Sistema di valutazione e feedback
- Certificazioni al completamento

### Simulazioni Interattive
- **Single Mode**: Interazione 1-a-1 con avatar AI
- **Group Mode**: Simulazioni con gruppi di avatar
- **ERP Training**: Formazione sui sistemi gestionali
- **Web Simulation**: Ambiente 2D con audio spaziale
- **VR Mode**: Esperienza immersiva con Unreal Engine

## Percorso Utente

### Onboarding
1. Registrazione utente con dati personali e professionali
2. Verifica email e completamento profilo
3. Tour guidato della piattaforma
4. Valutazione iniziale delle competenze
5. Suggerimento percorsi formativi personalizzati

### Percorso Formativo
1. Completamento moduli didattici teorici
2. Quiz di valutazione intermedi
3. Accesso alle simulazioni pratiche
4. Feedback dettagliato sulle performance
5. Rilascio certificazioni al completamento

### Ciclo di Apprendimento Continuo
1. Identificazione aree di miglioramento tramite analytics
2. Suggerimento contenuti personalizzati
3. Simulazioni con difficoltà crescente
4. Valutazione periodica dei progressi
5. Aggiornamento continuo delle competenze

## Componenti di Simulazione

### WebFlow
Il sistema WebFlow gestisce il flusso delle simulazioni web con i seguenti componenti:

#### SimulationTypeSelector
- Selezione tipologia di simulazione
- Interfaccia utente per configurare parametri
- Avvio sessione di simulazione

#### WebRoom
- Ambiente 2D interattivo
- Visualizzazione avatar e utenti
- Chat testuale e vocale
- Strumenti di collaborazione
- Audio spaziale per realismo

#### Tools nella WebView
1. **Partecipanti**: Gestione e visualizzazione partecipanti
2. **Documenti**: Condivisione e annotazione documenti
3. **Analisi**: Metriche e feedback in tempo reale
4. **Upload**: Caricamento materiali nella sessione
5. **Appunti**: Note personali durante simulazione
6. **Impostazioni**: Configurazione ambiente simulazione

### Interazione con Avatar
- Comunicazione vocale bidirezionale
- Riconoscimento emozioni
- Risposte contestuali basate su scenario
- Adattamento dinamico al comportamento utente
- Feedback in tempo reale sulle interazioni

### Generazione Scenari
Il processo di generazione scenari avviene in queste fasi:
1. Input utente via chat o selezione template
2. Elaborazione da AI Service con parametri contestuali
3. Generazione struttura scenario (obiettivi, ruoli, fasi)
4. Creazione avatar associati allo scenario
5. Salvataggio nel database per utilizzo o modifiche
6. Tracciamento esecuzione per analytics

## Tecnologie di Intelligenza Artificiale

### AI Service
Il cuore del sistema AI di Cafasso Academy gestisce:
- Generazione di risposte contestuali
- Sintesi vocale per avatar
- Creazione dinamica di scenari
- Analisi semantica delle interazioni

#### Implementazione Tecnica AI Service
```typescript
// Estratto da ai-service.ts
class AIService implements TTSService {
  // Metodo per generazione risposte
  async generateResponse(prompt: string, model = 'mistral'): Promise<string> {
    // API key management con servizio dedicato
    const apiKey = await apiKeyService.getApiKey('openrouter');
    
    // Sistema di retry automatico con gestione errori
    return await apiErrorService.executeWithRetry(
      async () => {
        const openRouterResponse = await this.queryOpenRouter(prompt, model, apiKey);
        return this.processResponse({
          text: openRouterResponse,
          confidence: 1,
          metadata: { 
            tokens_used: 0,
            response_time: Date.now() - startTime,
            model_used: `openrouter/${model}`
          }
        });
      }
    );
  }
  
  // Metodo per generazione scenari
  async generateScenarioFromChat(messages: Array<{ role: string; content: string }>): Promise<{
    title: string;
    description: string;
    objectives: string[];
    roles: Array<{ title: string; description: string; avatar_url?: string }>;
    phases: Array<{ name: string; description: string; duration: string }>;
    metrics: Array<{ name: string; target: number }>;
    avatars: Array<{ name: string; role: string; description: string; avatar_url?: string }>;
  }> {
    // Sistema di logging avanzato
    await this.saveScenarioDebugInfo(messages, structuredPrompt, response);
    
    // Parsing JSON con recupero errori
    try {
      // Approccio avanzato per parsing
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato risposta non valido');
      }
      
      // Validazione struttura completa
      // Sistema di normalizzazione per garantire integrità dati
      // Salvataggio su database in transazione
    } catch (error) {
      // Sistema fallback con scenario predefinito
      return defaultScenario;
    }
  }
}
```

### Text-to-Speech (TTS)
- **Provider**: Groq API
- **Funzionalità**: Conversione testo in voce naturale
- **Lingue supportate**: Italiano principalmente, con supporto multilingua
- **Emozioni**: Supporto per variazioni tonali basate su emozioni
- **Ottimizzazione**: Sistema di coda per gestire richieste multiple

#### Architettura TTS Queue Service
```typescript
// Estratto da tts-queue-service.ts
export class TTSQueueService {
  private queue: Array<TTSRequest> = [];
  private processingInProgress: boolean = false;
  
  // Sistema di prioritizzazione comunicazioni avatar
  public enqueue(text: string, options: TTSOptions, priority: number = 5): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        text,
        options,
        priority,
        resolve,
        reject,
        addedAt: Date.now()
      });
      
      // Ordinamento basato su priorità e timestamp
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.addedAt - b.addedAt;
      });
      
      if (!this.processingInProgress) {
        this.processQueue();
      }
    });
  }
  
  // Sistema di anti-collisione audio
  private async processQueue(): Promise<void> {
    this.processingInProgress = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      try {
        // Integrazione con servizi AI
        const audioData = await aiService.textToSpeech(request.text, request.options);
        request.resolve(audioData);
      } catch (error) {
        request.reject(error);
        // Logging errori verso Supabase
        await this.logTTSError(error, request);
      }
      
      // Delay per evitare sovraccarico API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    this.processingInProgress = false;
  }
}
```

### Modelli AI Utilizzati
- **Mistral**: Contesto ampio (8192 token), specializzato in consulenza del lavoro
- **LLama2**: Ottimizzato per analisi documenti e normativa del lavoro
- **CodeLLama**: Utilizzato per aspetti tecnici e amministrativi

#### Mappatura Modelli a OpenRouter
```typescript
// Logica di mapping modelli a provider esterni
private mapModelToOpenRouter(model: string): string {
  const modelMap: Record<string, string> = {
    'mistral': 'mistralai/mistral-7b-instruct',
    'llama2': 'meta-llama/llama-2-70b-chat',
    'codellama': 'codellama/codellama-34b-instruct'
  };
  return modelMap[model] || modelMap.mistral;
}
```

### AI Agent Service
Coordina il comportamento degli avatar AI:
- Gestione personalità e conoscenze
- Coordinamento risposte multiple
- Mantenimento contesto conversazionale
- Integrazione con sistema TTS
- Gestione emozioni e reazioni

#### Implementazione Sistema Personalità Avatar
```typescript
// Estratto da ai-agent-service.ts
export class AIAgentService {
  // Protocollo di comunicazione con avatar
  async generateAgentResponse(
    agentId: string, 
    message: string, 
    context: AgentContext
  ): Promise<AgentResponse> {
    // Recupero profilo agente dal database
    const agentProfile = await this.getAgentProfile(agentId);
    
    // Costruzione prompt con embeddings
    const fullPrompt = this.buildPersonalityPrompt(agentProfile, message, context);
    
    // Generazione risposta con controllo emozioni
    const response = await aiService.generateResponse(fullPrompt, 'mistral');
    
    // Parsing risposta strutturata
    const { text, emotion, actions } = this.parseAgentResponse(response);
    
    // Coordinamento con TTS Queue
    if (text) {
      const audioBuffer = await ttsQueueService.enqueue(
        text,
        { 
          voice: agentProfile.voice,
          emotion: emotion || 'neutral'
        },
        agentProfile.priority || 5
      );
      
      return {
        agentId,
        text,
        emotion,
        actions,
        audioBuffer
      };
    }
  }
  
  // Generazione risposte multi-agente coordinate
  async orchestrateMultiAgentResponse(
    scenario: ScenarioContext,
    message: string,
    activeAgents: string[]
  ): Promise<AgentResponse[]> {
    // Algoritmo turni di risposta
    // Sistema anti-interruzione
    // Gestione conversazione di gruppo
  }
}
```

### Quiz AI Service
Sistema intelligente per:
- Generazione dinamica di domande
- Adattamento difficoltà
- Analisi risposte
- Feedback personalizzato
- Suggerimenti di miglioramento

#### Algoritmo di Analisi delle Risposte
```typescript
// Estratto da quiz-ai-service.ts
export class QuizAIService {
  // Generazione feedback personalizzato
  async generateFeedback(
    quizId: string,
    userAnswers: UserAnswer[],
    userProfile: UserProfile
  ): Promise<QuizFeedback> {
    // Recupero domande e risposte corrette
    const questions = await this.getQuizQuestions(quizId);
    
    // Analisi delle risposte con scoring
    const scoreDetails = this.calculateDetailedScore(questions, userAnswers);
    
    // Classificazione errori per categoria
    const errorPatterns = this.identifyErrorPatterns(scoreDetails);
    
    // Prompt specifico per feedback
    const feedbackPrompt = this.buildFeedbackPrompt(scoreDetails, errorPatterns, userProfile);
    
    // Generazione feedback intelligente
    const aiResponse = await aiService.generateResponse(feedbackPrompt, 'llama2');
    
    // Strutturazione feedback
    return this.structureFeedback(aiResponse, scoreDetails);
  }
  
  // Sistema raccomandazione risorse personalizzate
  private async generateRecommendations(
    errorPatterns: ErrorPattern[],
    userHistory: UserLearningHistory
  ): Promise<string[]> {
    // Algoritmo di matching pattern-risorsa
    // Raccomandazione mirata basata su storico apprendimento
    // Personalizzazione per livello utente
  }
}
```

### API Key Management Service
Sistema centralizzato per gestione sicura delle API key:
```typescript
// Estratto da api-key-service.ts
export class ApiKeyService {
  private cachedKeys: Record<string, string> = {};
  private lastFetchTime: Record<string, number> = {};
  private CACHE_TTL = 1000 * 60 * 60; // 1 ora
  
  // Sistema rotazione API key
  async getApiKey(service: string): Promise<string> {
    // Verifica cache con TTL
    if (this.cachedKeys[service] && 
        Date.now() - (this.lastFetchTime[service] || 0) < this.CACHE_TTL) {
      return this.cachedKeys[service];
    }
    
    // Recupero sicuro da database
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('key')
        .eq('service', service)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      // Aggiornamento cache
      this.cachedKeys[service] = data.key;
      this.lastFetchTime[service] = Date.now();
      
      return data.key;
    } catch (err) {
      // Fallback a key ambiente se presente
      const envKey = process.env[`${service.toUpperCase()}_API_KEY`];
      if (envKey) return envKey;
      
      throw new Error(`API key per ${service} non disponibile`);
    }
  }
}
```

## Integrazione con Supabase

### Database Schema
- **auth**: Gestione utenti e permessi
- **public**: Dati principali dell'applicazione
- **storage**: File, video e documenti

#### Schema ERD Principale
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │     courses     │       │  course_contents │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ email           │       │ title           │       │ course_id       │◄─┐
│ full_name       │       │ description     │       │ title           │  │
│ avatar_url      │       │ image_url       │       │ type            │  │
│ company         │       │ level           │       │ order           │  │
│ role            │       │ author_id       │◄──────┤ url             │  │
│ created_at      │       │ published       │       │ description     │  │
└─────────────────┘       │ category        │       └─────────────────┘  │
        ▲                 │ duration_minutes│                            │
        │                 └─────────────────┘                            │
        │                         ▲                                      │
        │                         │                                      │
┌─────────────────┐       ┌─────────────────┐                           │
│  user_profiles  │       │course_enrollments│                           │
├─────────────────┤       ├─────────────────┤                           │
│ user_id         │◄──────┤ user_id         │                           │
│ bio             │       │ course_id       │◄──────────────────────────┘
│ preferences     │       │ progress        │
│ settings        │       │ completed       │
└─────────────────┘       │ last_accessed   │
                          └─────────────────┘
                                  
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    scenarios    │       │     avatars     │       │  quiz_results   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ title           │       │ name            │       │ user_id         │
│ description     │       │ role            │       │ quiz_id         │
│ objectives      │◄──────┤ scenario_id     │       │ score           │
│ phases          │       │ description     │       │ time_spent      │
│ metrics         │       │ avatar_type     │       │ completion_date │
│ generated_by_ai │       │ status          │       │ answers         │
│ status          │       │ personality     │       │ feedback        │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Tabelle Principali
- **users**: Profili utente estesi
  ```sql
  CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    role TEXT DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE
  );
  ```

- **courses**: Corsi disponibili
  ```sql
  CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    author_id UUID REFERENCES public.users(id),
    published BOOLEAN DEFAULT false,
    category TEXT,
    duration_minutes INTEGER DEFAULT 0
  );
  ```

- **course_contents**: Contenuti multimediali dei corsi
  ```sql
  CREATE TABLE public.course_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('video', 'document', 'quiz')),
    order INTEGER,
    url TEXT,
    description TEXT,
    duration_minutes INTEGER
  );
  ```

- **quiz_results**: Risultati e analisi quiz
- **scenarios**: Scenari di simulazione
- **avatars**: Definizioni avatar per simulazioni
- **certificates**: Certificazioni ottenute
- **ai_model_usage**: Tracking utilizzo modelli AI

### Politiche di Sicurezza
- RLS (Row Level Security) per ogni tabella

```sql
-- Esempio di policy RLS per la tabella courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Policy per amministratori (accesso completo)
CREATE POLICY "Administrators have full access to courses" 
ON public.courses 
FOR ALL 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Policy per utenti (solo lettura di corsi pubblicati)
CREATE POLICY "Users can view published courses" 
ON public.courses 
FOR SELECT 
TO authenticated 
USING (published = true);

-- Policy per autori (accesso completo ai propri corsi)
CREATE POLICY "Course authors can manage their own courses" 
ON public.courses 
FOR ALL 
TO authenticated 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
```

- Permessi differenziati per ruoli
- Isolamento dati tra organizzazioni
- Audit log per operazioni critiche

### Migration System
- Versioning database con timestamp
```bash
# Comando per creare una nuova migrazione
supabase migration new nome_migrazione

# Struttura directory migrazioni
supabase/
  ├── migrations/
  │   ├── 20250306142559_teal_butterfly.sql
  │   ├── 20250306143134_damp_island.sql
  │   ├── 20250306143902_rustic_temple.sql
  │   └── ...
  └── config.toml
```

- Rollback sicuro
```sql
-- Esempio di migrazione con rollback
-- Migrazione forward
CREATE TABLE public.new_feature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rollback code (commented out for forward migration)
/*
DROP TABLE IF EXISTS public.new_feature;
*/
```

- Seed data per funzionalità core
```sql
-- Esempio di seed data
INSERT INTO public.courses (id, title, description, level, category, published, duration_minutes) 
VALUES 
  ('8f7b5a1e-9d4c-4dd9-b8a3-65c071b5d862', 'Introduzione alla Consulenza del Lavoro', 'Corso base per consulenti', 'beginner', 'Formazione Base', true, 120),
  ('912ec803-b52f-4cae-a2e5-5b953fce1eb6', 'Contratti di Lavoro 2024', 'Aggiornamento normativo', 'intermediate', 'Normativa', true, 180);
```

- Gestione ambiente dev/prod tramite variabili in config.toml
```toml
# config.toml
[db]
port = 5432

[api]
port = 54321
extra_search_path = "extensions"
max_rows = 1000

[studio]
port = 3000

[analytics]
enabled = false
```

## Funzionalità di Academy

### Sistema Corsi
- Catalogazione gerarchica
- Tracciamento completamento
- Prerequisiti e dipendenze
- Materiale scaricabile
- Supporto per diverse modalità di apprendimento

### Gestione Video
- Player personalizzato
- Trascrizioni automatiche
- Bookmarking temporale
- Quiz integrati
- Analytics di visualizzazione

### Sistema Documentale
- Repository documentale
- Categorizzazione automatica
- Ricerca full-text
- Annotazioni personali
- Condivisione controllata

### Sistema Certificazioni
- Rilascio automatico al completamento
- Verifica autenticità
- PDF firmati digitalmente
- Badge digitali
- Condivisibilità su piattaforme esterne

### Sistema Quiz
- Domande a difficoltà progressiva
- Timer personalizzabile
- Feedback immediato
- Analisi dettagliata risultati
- Raccomandazioni personalizzate

## Amministrazione

### Dashboard Admin
- Panoramica sistema
- Metriche di utilizzo
- Alert e notifiche
- Gestione contenuti
- Monitoraggio performance

### Gestione Utenti
- Creazione e modifica account
- Assegnazione ruoli e permessi
- Gestione gruppi e team
- Tracking attività
- Supporto e assistenza

### Gestione Contenuti
- Editor WYSIWYG
- Caricamento batch
- Versionamento contenuti
- Programmazione pubblicazione
- Revisione collaborativa

### Analytics
- Dashboard interattive
- Metriche di engagement
- Analisi performance studenti
- Efficacia contenuti formativi
- Report personalizzabili

### Configurazione Sistema
- Parametri globali
- Integrazioni esterne
- Personalizzazione branding
- Sicurezza e compliance
- Backup e disaster recovery

## Troubleshooting

### Problemi Comuni e Soluzioni
- **Autenticazione**: Verifica token e permessi
- **Performance**: Ottimizzazione query database
- **Media Playback**: Configurazione corretta bucket storage
- **Simulazioni**: Connessione ai servizi AI
- **TTS/STT**: API key e servizi esterni

### Logging System
- Log strutturati per componente
- Livelli di gravità
- Context tracing
- Rotazione automatica
- Alert per errori critici

### Supporto e Diagnostica
- Strumenti di self-service
- Documentazione inline
- Canali di supporto
- Accesso remoto per diagnostica
- Procedure di escalation

### Miglioramento Continuo
- Feedback loop con utenti
- Analisi pattern di errore
- Release pianificate
- Testing A/B
- Aggiornamenti progressivi
