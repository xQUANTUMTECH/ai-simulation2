# Analisi e Risoluzione dei Problemi di Persistenza Dati e Servizi AI

## Problemi Identificati

1. **Mancata persistenza dei dati**: 
   - Gli scenari creati scompaiono dopo il refresh della pagina
   - Non c'è persistenza dei dati nelle sessioni

2. **Servizi AI non funzionanti**:
   - Non risponde nelle chat 
   - Il sistema TTS (text-to-speech) non funziona
   - Non è collegato correttamente al frontend

## Analisi delle Cause

### 1. Problema di Connessione tra MongoDB e Supabase

Il sistema utilizza una **architettura ibrida** che causa confusione:
- MongoDB per l'archiviazione principale dei dati (database, file, ecc.)
- Supabase per la gestione delle chiavi API e alcune funzionalità specifiche

Il problema principale è che il sistema attualmente tenta di salvare gli scenari in **Supabase** (come indicato nel file `src/services/ai-service.ts`) mentre il frontend si aspetta di recuperarli da **MongoDB** tramite l'API Express (come configurato in `src/services/api-client.js`).

```javascript
// In ai-service.ts - Salva su Supabase
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
    
    // ...ma il frontend cerca di recuperarli tramite API da MongoDB
  }
}
```

### 2. Problema di Configurazione delle Chiavi API

Le chiavi API per OpenRouter e Groq sono presenti nell'`.env` ma il sistema cerca di recuperarle da Supabase invece di usarle direttamente:

```javascript
// In api-key-service.ts
async getApiKey(service: string): Promise<string | null> {
  await this.refreshKeysIfNeeded();
  
  // Trova tutte le chiavi attive per il servizio richiesto
  const activeKeys = Array.from(this.keyCache.values())
    .filter(config => config.service === service && config.isActive);
  
  if (activeKeys.length === 0) {
    console.warn(`Nessuna chiave API attiva trovata per il servizio ${service}`);
    return null;
  }
  // ...
}
```

Queste chiavi dovrebbero essere accessibili direttamente dall'`.env` file o tramite il server Express.

## Soluzioni Proposte

### 1. Correzione della Persistenza Dati

#### A. Modifica del servizio AI per salvare gli scenari in MongoDB

Modificare `src/services/ai-service.ts` per salvare gli scenari tramite l'API Express invece che direttamente in Supabase:

```typescript
private async saveGeneratedScenario(scenario: any) {
  try {
    // Inviare la richiesta all'API Express che salverà in MongoDB
    const response = await fetch('http://localhost:3000/api/scenarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(scenario)
    });
    
    if (!response.ok) {
      throw new Error('Errore nel salvataggio dello scenario');
    }
    
    console.log('Scenario salvato con successo nel database MongoDB');
  } catch (err) {
    console.error('Errore nel salvare lo scenario nel database:', err);
  }
}
```

#### B. Implementazione di un endpoint API per gli scenari

Creare un nuovo file `server/api-scenarios.js` per gestire gli scenari in MongoDB:

```javascript
// API Express per gestione scenari
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Configurazione del router
const router = express.Router();

/**
 * @api {post} /api/scenarios Crea un nuovo scenario
 */
router.post('/', async (req, res) => {
  try {
    const scenario = {
      id: uuidv4(),
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Salva in MongoDB
    const result = await req.app.locals.db.collection('scenarios').insertOne(scenario);
    
    if (!result.acknowledged) {
      throw new Error('Errore nel salvataggio dello scenario');
    }

    res.status(201).json(scenario);
  } catch (error) {
    console.error('Errore nella creazione dello scenario:', error);
    res.status(500).json({ error: `Errore nella creazione: ${error.message}` });
  }
});

/**
 * @api {get} /api/scenarios Lista di tutti gli scenari
 */
router.get('/', async (req, res) => {
  try {
    const scenarios = await req.app.locals.db.collection('scenarios')
      .find()
      .sort({ created_at: -1 })
      .toArray();
    
    res.json({ data: scenarios });
  } catch (error) {
    console.error('Errore nel recupero degli scenari:', error);
    res.status(500).json({ error: `Errore nel recupero: ${error.message}` });
  }
});

// Aggiungi altri endpoint necessari (GET singolo, PUT, DELETE)

export { router };
```

#### C. Registrazione del router in server-express.mjs

```javascript
// Nel file server-express.mjs
import { router as scenariosRouter } from './api-scenarios.js';

// ... altro codice ...

// Registrazione dei router
app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);
app.use('/api/scenarios', scenariosRouter); // Aggiungi questa linea

// ... altro codice ...
```

### 2. Correzione dei Servizi AI

#### A. Bypass del servizio chiavi API per utilizzare direttamente le variabili d'ambiente

Modificare `src/services/ai-service.ts` per utilizzare direttamente le variabili d'ambiente:

```typescript
async generateResponse(prompt: string, model = 'mistral'): Promise<string> {
  const startTime = Date.now();
  const requestType = 'text_generation';

  try {
    // Usa direttamente la chiave API dall'ambiente invece che da apiKeyService
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key non disponibile');
    }

    // Resto del codice...
  }
}

async textToSpeech(text: string, options: {
  model?: string;
  voice?: string;
  language?: string;
  emotion?: string;
} = {}): Promise<ArrayBuffer> {
  const startTime = Date.now();
  
  try {
    // Utilizza direttamente la chiave API dall'ambiente
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('API key Groq non disponibile');
    }
    
    // Resto del codice...
  }
}
```

#### B. Creazione di un endpoint API per i servizi AI

Creare un nuovo file `server/api-ai.js`:

```javascript
// API Express per servizi AI
import express from 'express';
import fetch from 'node-fetch';

// Configurazione del router
const router = express.Router();

// Ottieni le chiavi API dall'ambiente
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;

/**
 * @api {post} /api/ai/generate Genera risposta AI
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'mistral' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt richiesto' });
    }

    // Mappa il modello al nome corretto di OpenRouter
    const modelMap = {
      'mistral': 'mistralai/mistral-7b-instruct',
      'llama2': 'meta-llama/llama-2-70b-chat',
      'codellama': 'codellama/codellama-34b-instruct'
    };
    
    const openRouterModel = modelMap[model] || modelMap.mistral;
    
    // Chiama OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore OpenRouter: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Registra l'utilizzo nel database
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: model,
      request_type: 'text_generation',
      success: true,
      timestamp: new Date(),
      response_time: Date.now() - req.body.startTime || 0,
      prompt_length: prompt.length
    });
    
    res.json({ text: data.choices[0].message.content });
  } catch (error) {
    console.error('Errore nella generazione AI:', error);
    
    // Registra l'errore
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: req.body.model || 'unknown',
      request_type: 'text_generation',
      success: false,
      timestamp: new Date(),
      error_message: error.message
    });
    
    res.status(500).json({ error: `Errore nella generazione: ${error.message}` });
  }
});

/**
 * @api {post} /api/ai/tts Converte testo in audio
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Testo richiesto' });
    }
    
    // Chiama Groq per TTS
    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
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
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Registra l'utilizzo
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: 'groq-tts',
      request_type: 'speech',
      success: true,
      timestamp: new Date(),
      response_time: Date.now() - req.body.startTime || 0,
      text_length: text.length
    });
    
    // Invia la risposta come audio
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Errore nel TTS:', error);
    
    // Registra l'errore
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: 'groq-tts',
      request_type: 'speech',
      success: false,
      timestamp: new Date(),
      error_message: error.message
    });
    
    res.status(500).json({ error: `Errore nel TTS: ${error.message}` });
  }
});

/**
 * @api {post} /api/ai/scenario Genera scenario
 */
router.post('/scenario', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messaggi richiesti come array' });
    }
    
    // Costruisci il prompt strutturato
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
    
    // Chiama OpenRouter per generare lo scenario
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: structuredPrompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore OpenRouter: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    
    // Analizza il JSON dalla risposta
    let scenario;
    try {
      // Approccio più robusto per estrarre il JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText.trim().replace(/```json|```/g, '').trim();
      scenario = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Errore parsing JSON:', parseError);
      
      // Scenario di fallback
      scenario = {
        title: "Consulenza sul Contratto di Lavoro",
        description: "Scenario di simulazione per la consulenza su un contratto di lavoro a tempo determinato",
        objectives: ["Analizzare le esigenze del cliente", "Fornire informazioni accurate"],
        roles: [
          { title: "Consulente del Lavoro", description: "Esperto che fornisce la consulenza professionale" },
          { title: "Cliente Lavoratore", description: "Persona che deve firmare un contratto e cerca consulenza" }
        ],
        phases: [
          { name: "Analisi", description: "Esame del contratto proposto", duration: "15m" },
          { name: "Consulenza", description: "Spiegazione degli aspetti normativi", duration: "20m" }
        ],
        metrics: [
          { name: "Chiarezza Informazioni", target: 95 },
          { name: "Completezza Analisi", target: 90 }
        ],
        avatars: [
          { name: "Paolo Bianchi", role: "Consulente del Lavoro", description: "Professionista esperto" },
          { name: "Marco Verdi", role: "Cliente", description: "Lavoratore che ha ricevuto una proposta" }
        ]
      };
    }
    
    // Salva lo scenario in MongoDB
    const scenarioWithId = {
      id: require('crypto').randomUUID(),
      ...scenario,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      generated_by_ai: true,
      status: 'active'
    };
    
    const result = await req.app.locals.db.collection('scenarios').insertOne(scenarioWithId);
    
    if (!result.acknowledged) {
      throw new Error('Errore nel salvataggio dello scenario in MongoDB');
    }
    
    // Se ci sono avatar, salvali in una collezione separata
    if (scenario.avatars && Array.isArray(scenario.avatars)) {
      const avatarOps = scenario.avatars.map(avatar => ({
        insertOne: {
          document: {
            id: require('crypto').randomUUID(),
            name: avatar.name,
            role: avatar.role,
            description: avatar.description,
            scenario_id: scenarioWithId.id,
            avatar_type: 'ai',
            status: 'active',
            created_at: new Date().toISOString()
          }
        }
      }));
      
      await req.app.locals.db.collection('avatars').bulkWrite(avatarOps);
    }
    
    res.json(scenarioWithId);
  } catch (error) {
    console.error('Errore nella generazione scenario:', error);
    res.status(500).json({ error: `Errore nella generazione: ${error.message}` });
  }
});

export { router };
```

#### C. Registrazione del router in server-express.mjs

```javascript
// Nel file server-express.mjs
import { router as aiRouter } from './api-ai.js';

// ... altro codice ...

// Registrazione dei router
app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/ai', aiRouter); // Aggiungi questa linea

// ... altro codice ...
```

#### D. Aggiornamento del client API

Modificare `src/services/api-client.js` per includere i servizi AI:

```javascript
/**
 * Funzioni per i servizi AI
 */
export const AIApi = {
  /**
   * Genera una risposta testuale
   * @param {string} prompt - Prompt da inviare
   * @param {string} model - Modello da utilizzare
   * @returns {Promise<Object>} Risposta generata
   */
  generateResponse: (prompt, model = 'mistral') => fetchApi('/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, model, startTime: Date.now() }),
  }),
  
  /**
   * Converte testo in audio
   * @param {string} text - Testo da convertire
   * @param {Object} options - Opzioni TTS
   * @returns {Promise<ArrayBuffer>} Audio generato
   */
  textToSpeech: async (text, options = {}) => {
    const url = `${API_BASE_URL}/ai/tts`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, options, startTime: Date.now() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS error: ${response.status}`);
      }
      
      return await response.arrayBuffer();
    } catch (error) {
      console.error('TTS request failed:', error);
      throw error;
    }
  },
  
  /**
   * Genera uno scenario basato su conversazione
   * @param {Array} messages - Messaggi della conversazione
   * @returns {Promise<Object>} Scenario generato
   */
  generateScenario: (messages) => fetchApi('/ai/scenario', {
    method: 'POST',
    body: JSON.stringify({ messages, startTime: Date.now() }),
  }),
};

// Aggiungi AIApi all'esportazione default
export default {
  UserApi,
  DocumentApi,
  AuthApi,
  AIApi, // Aggiunto
  checkApiConnection,
};
```

## Passaggi per l'Implementazione

1. Creare i nuovi file:
   - `server/api-scenarios.js`
   - `server/api-ai.js`

2. Modificare:
   - `server-express.mjs` per registrare i nuovi router
   - `src/services/api-client.js` per aggiungere i servizi AI

3. Riavviare il sistema completo usando:
   ```
   .\avvia-sistema-completo.bat
   ```

4. Verificare la persistenza e i servizi AI:
   - Creare uno scenario e verificare che persista dopo il refresh
   - Testare i servizi chat AI e TTS

## Note Aggiuntive

- Questa soluzione mantiene tutte le chiavi API in MongoDB invece di Supabase, in linea con l'architettura del sistema.
- Centralizza tutti i servizi AI attraverso il backend Express, migliorando la sicurezza (le chiavi API rimangono solo sul server).
- Garantisce la persistenza dei dati salvando direttamente in MongoDB invece che in Supabase.
- Risolve il problema di inconsistenza tra frontend e backend.
