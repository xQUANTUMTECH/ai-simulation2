// API Express per servizi AI
import express from 'express';
import fetch from 'node-fetch';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import say from 'say';
import { promises as fsPromises } from 'fs';

// Configurazione del router
const router = express.Router();

// Numero massimo di tentativi per operazioni database
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Funzione di utilità per eseguire un'operazione con retry
 * @param {Function} operation - Funzione da eseguire
 * @param {number} maxAttempts - Numero massimo di tentativi
 * @returns {Promise<any>} - Risultato dell'operazione
 */
async function withRetry(operation, maxAttempts = MAX_RETRY_ATTEMPTS) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Tentativo ${attempt}/${maxAttempts} fallito:`, error);
      lastError = error;
      
      if (attempt < maxAttempts) {
        // Attesa esponenziale tra i tentativi
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Tutti i tentativi falliti: ${lastError.message}`);
}

/**
 * Validazione dei prompt per le API AI
 * @param {string} prompt - Il prompt da validare
 * @param {string} model - Il modello AI richiesto
 * @returns {Object} - Errori di validazione o null se valido
 */
function validateAIRequest(prompt, model) {
  const errors = {};
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    errors.prompt = 'Prompt testuale richiesto e non può essere vuoto';
  }
  
  const validModels = ['deepseek', 'gemini', 'claude', 'gpt', 'mixtral'];
  if (model && !validModels.includes(model)) {
    errors.model = `Modello non supportato. Usa uno dei seguenti: ${validModels.join(', ')}`;
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validazione dei dati per TTS
 * @param {string} text - Testo da convertire in audio
 * @param {Object} options - Opzioni TTS
 * @returns {Object} - Errori di validazione o null se valido
 */
function validateTTSRequest(text, options) {
  const errors = {};
  
  if (!text || typeof text !== 'string' || text.trim() === '') {
    errors.text = 'Testo richiesto e non può essere vuoto';
  }
  
  if (text && text.length > 5000) {
    errors.text = 'Testo troppo lungo, massimo 5000 caratteri';
  }
  
  // Verifica opzioni valide
  if (options) {
    // Verifica voce se specificata
    const validVoices = ['Microsoft Elsa', 'Microsoft David', 'Microsoft Zira', 'Microsoft Mark'];
    if (options.voice && !validVoices.includes(options.voice)) {
      errors.voice = `Voce non supportata. Usa una delle seguenti: ${validVoices.join(', ')}`;
    }
    
    // Verifica rate se specificato
    if (options.rate && (typeof options.rate !== 'number' || options.rate < 0.5 || options.rate > 2.0)) {
      errors.rate = 'Rate deve essere un numero tra 0.5 e 2.0';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validazione dei parametri di generazione scenario
 * @param {Array} messages - Array di messaggi per la generazione dello scenario
 * @returns {Object} - Errori di validazione o null se valido
 */
function validateScenarioRequest(messages) {
  const errors = {};
  
  if (!messages || !Array.isArray(messages)) {
    errors.messages = 'È richiesto un array di messaggi';
    return errors;
  }
  
  if (messages.length === 0) {
    errors.messages = 'L\'array di messaggi non può essere vuoto';
  }
  
  // Verifica che ogni messaggio abbia role e content
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      errors[`messages[${i}]`] = 'Ogni messaggio deve essere un oggetto';
      continue;
    }
    
    if (!msg.role || typeof msg.role !== 'string') {
      errors[`messages[${i}].role`] = 'Ogni messaggio deve avere un campo role di tipo stringa';
    }
    
    if (!msg.content || typeof msg.content !== 'string') {
      errors[`messages[${i}].content`] = 'Ogni messaggio deve avere un campo content di tipo stringa';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

// Inizializza OpenAI con configurazione robusta
function createOpenAIClient(apiKey) {
  return new OpenAI({
    apiKey: apiKey || process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1',
    timeout: 60000, // 60 secondi timeout
    maxRetries: 3,  // OpenAI client ha già retry integrati
  });
}

// Configurazione OpenRouter
const openai = createOpenAIClient();

// Groq API Key usata per Google Gemini
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

// Inizializza Google Generative AI
const genAI = new GoogleGenerativeAI(GROQ_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Stampa disponibilità chiavi (debug)
console.log("OpenRouter API Key disponibile:", !!process.env.OPENROUTER_API_KEY);
console.log("Google Gemini API Key disponibile:", !!GROQ_API_KEY);

// Log più dettagliato per debug (Prime 5 caratteri per sicurezza)
if (process.env.OPENROUTER_API_KEY) console.log("OpenRouter API Key inizia con:", process.env.OPENROUTER_API_KEY.substring(0, 5));
if (GROQ_API_KEY) console.log("Google Gemini API Key inizia con:", GROQ_API_KEY.substring(0, 5));

// Crea directory uploads se non esiste
const uploadsDir = './uploads';
(async () => {
  try {
    await fsPromises.access(uploadsDir);
  } catch {
    await fsPromises.mkdir(uploadsDir, { recursive: true });
    console.log('Creata directory uploads per TTS');
  }
})();

/**
 * @api {post} /api/ai/generate Genera risposta AI
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'deepseek', maxTokens = 1000, temperature = 0.7 } = req.body;
    const startTime = Date.now();
    
    // Validazione input
    const validationErrors = validateAIRequest(prompt, model);
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Parametri richiesta non validi', 
        details: validationErrors 
      });
    }
    
    // Prendi l'API key dall'header di autorizzazione o dalle variabili d'ambiente
    let apiKey = process.env.OPENROUTER_API_KEY || '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key non disponibile',
        message: 'Configura una API key di OpenRouter nelle variabili d\'ambiente o forniscila nell\'header di autorizzazione'
      });
    }

    // Configura OpenAI con l'API key corretta e parametri robusti
    const openaiClient = createOpenAIClient(apiKey);
    
    // Mappa il modello al nome corretto di OpenRouter
    const modelMap = {
      'deepseek': 'deepseek/deepseek-r1-zero:free',
      'gemini': 'google/gemini-pro', 
      'claude': 'anthropic/claude-2',
      'gpt': 'openai/gpt-3.5-turbo-0125',
      'mixtral': 'mistralai/mixtral-8x7b-instruct'
    };
    
    const openRouterModel = modelMap[model] || modelMap.claude;
    
    console.log(`Chiamata a OpenRouter con modello: ${openRouterModel}`);
    
    // Chiama OpenRouter con retry automatico (già implementato nel client OpenAI)
    const response = await openaiClient.chat.completions.create({
      model: openRouterModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature
    });

    // Estrai il testo dalla risposta
    const generatedText = response.choices[0].message.content;
    
    // Registra l'utilizzo nel database con retry
    await withRetry(async () => {
      const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
        model_name: model,
        request_type: 'text_generation',
        success: true,
        timestamp: new Date(),
        response_time: Date.now() - startTime,
        prompt_length: prompt.length,
        prompt_snippet: prompt.substring(0, 100),
        response_snippet: generatedText.substring(0, 100),
        temperature: temperature,
        max_tokens: maxTokens
      });
      
      if (!result.acknowledged) {
        throw new Error('Registrazione utilizzo non confermata dal database');
      }
      
      return result;
    });
    
    // Aggiungi informazioni di performance/telemetria
    res.json({ 
      text: generatedText,
      model: openRouterModel,
      performance: {
        response_time_ms: Date.now() - startTime,
        model: model,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Errore nella generazione AI:', error);
    
    // Registra l'errore con retry
    try {
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: req.body.model || 'unknown',
          request_type: 'text_generation',
          success: false,
          timestamp: new Date(),
          error_message: error.message,
          prompt_snippet: req.body.prompt ? req.body.prompt.substring(0, 100) : '',
          error_type: error.name || 'UnknownError',
          stack_trace: error.stack ? error.stack.substring(0, 500) : null
        });
        
        if (!result.acknowledged) {
          throw new Error('Registrazione errore non confermata dal database');
        }
        
        return result;
      });
    } catch (loggingError) {
      console.error('Errore anche nella registrazione dell\'errore:', loggingError);
    }
    
    // Gestisci diversi tipi di errori con messaggi utente appropriati
    let statusCode = 500;
    let errorMessage = 'Errore nella generazione del testo';
    
    if (error.status === 401 || error.status === 403) {
      statusCode = 401;
      errorMessage = 'Problema di autenticazione con il servizio AI';
    } else if (error.status === 429) {
      statusCode = 429;
      errorMessage = 'Limite di richieste al servizio AI superato. Riprova più tardi';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Impossibile raggiungere il servizio AI. Controlla la connessione di rete';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Sistema di cache per i file audio TTS
 * Struttura: { chiaveCache: { buffer: Buffer, createdAt: Date, hits: number } }
 */
const ttsCache = new Map();

/**
 * Funzione per generare una chiave di cache univoca per TTS
 * @param {string} text - Testo da convertire
 * @param {Object} options - Opzioni TTS (voice, rate)
 * @returns {string} Chiave di cache
 */
function generateTTSCacheKey(text, options) {
  const normalizedText = text.trim().toLowerCase();
  const voice = options.voice || 'Microsoft Elsa';
  const rate = options.rate || 1.0;
  return `${normalizedText}::${voice}::${rate}`;
}

/**
 * Funzione per pulire periodicamente la cache TTS
 * Mantiene solo gli elementi usati di recente o con molti hit
 */
function cleanupTTSCache() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 ore
  
  let totalCacheSize = 0;
  const entries = [...ttsCache.entries()];
  
  // Calcola dimensione totale e ordina per rilevanza
  entries.forEach(([key, data]) => {
    totalCacheSize += data.buffer.length;
  });
  
  console.log(`TTS Cache: ${ttsCache.size} entries, ~${Math.round(totalCacheSize / 1024 / 1024)} MB`);
  
  // Se la cache è minore di 100MB, non pulire
  if (totalCacheSize < 100 * 1024 * 1024) return;
  
  // Ordina per data + hits (più recenti e più usati hanno priorità)
  const sortedEntries = entries.sort((a, b) => {
    const ageScoreA = (now - a[1].createdAt.getTime()) / maxAge;
    const ageScoreB = (now - b[1].createdAt.getTime()) / maxAge;
    
    const relevanceA = ageScoreA - (Math.min(a[1].hits, 100) / 100);
    const relevanceB = ageScoreB - (Math.min(b[1].hits, 100) / 100);
    
    return relevanceA - relevanceB;
  });
  
  // Rimuovi il 30% meno rilevante
  const toRemove = Math.floor(sortedEntries.length * 0.3);
  
  for (let i = 0; i < toRemove; i++) {
    ttsCache.delete(sortedEntries[i][0]);
  }
  
  console.log(`TTS Cache cleanup: rimossi ${toRemove} elementi`);
}

// Imposta pulizia cache ogni ora
setInterval(cleanupTTSCache, 60 * 60 * 1000);

/**
 * @api {post} /api/ai/tts Converte testo in audio
 */
router.post('/tts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, options = {} } = req.body;
    
    // Validazione input potenziata
    const validationErrors = validateTTSRequest(text, options);
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Parametri TTS non validi', 
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }
    
    // Sanitizzazione input
    const sanitizedOptions = {
      voice: options.voice || 'Microsoft Elsa',
      rate: typeof options.rate === 'number' && options.rate >= 0.5 && options.rate <= 2.0 
        ? options.rate 
        : 1.0,
      textOnly: !!options.textOnly,
      autoplay: options.autoplay !== false
    };
    
    console.log(`Chiamata a TTS`);
    console.log(`Testo da convertire: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`Opzioni: ${JSON.stringify(sanitizedOptions)}`);
    
    // Verifica se l'utente vuole solo il testo invece dell'audio
    if (sanitizedOptions.textOnly) {
      // Registra l'utilizzo con retry
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: 'tts-text-only',
          request_type: 'text',
          success: true,
          timestamp: new Date(),
          response_time: Date.now() - startTime,
          text_length: text.length,
          text_snippet: text.substring(0, 100),
          options: JSON.stringify(sanitizedOptions)
        });
        
        if (!result.acknowledged) {
          throw new Error('Registrazione utilizzo non confermata dal database');
        }
        
        return result;
      });
      
      // Restituisci solo il testo
      return res.json({ 
        text: text, 
        voice: sanitizedOptions.voice,
        timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime
      });
    }
    
    // Genera una chiave di cache per il testo+voce+rate
    const cacheKey = generateTTSCacheKey(text, sanitizedOptions);
    let audioBuffer;
    let fromCache = false;
    
    // Verifica se il testo è già stato convertito e presente in cache
    if (ttsCache.has(cacheKey)) {
      console.log('TTS: Cache hit');
      const cacheData = ttsCache.get(cacheKey);
      audioBuffer = cacheData.buffer;
      
      // Incrementa il contatore di utilizzo della cache
      cacheData.hits++;
      fromCache = true;
    } else {
      console.log('TTS: Cache miss, generazione file audio');
      
      // Genera un filename unico per il file audio
      const audioFilename = `tts-${Date.now()}.wav`;
      const audioPath = `./uploads/${audioFilename}`;
      
      // Utilizziamo la libreria 'say' per la sintesi vocale con retry
      await withRetry(async () => {
        return new Promise((resolve, reject) => {
          say.export(
            text, 
            sanitizedOptions.voice, 
            sanitizedOptions.rate, 
            audioPath, 
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            }
          );
        });
      });
      
      // Leggi il file audio generato
      const fs = await import('fs');
      try {
        audioBuffer = fs.readFileSync(audioPath);
        
        // Salva in cache
        ttsCache.set(cacheKey, {
          buffer: audioBuffer,
          createdAt: new Date(),
          hits: 1
        });
        
        // Elimina il file temporaneo in un blocco try/catch separato
        try {
          fs.unlinkSync(audioPath);
        } catch (unlinkError) {
          console.warn('Errore nell\'eliminazione del file temporaneo:', unlinkError);
          // Non blocchiamo l'esecuzione per questo errore
        }
      } catch (readError) {
        console.error('Errore nella lettura del file audio:', readError);
        throw new Error('Impossibile leggere il file audio generato');
      }
    }
    
    // Registra l'utilizzo nel database con retry
    await withRetry(async () => {
      const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
        model_name: 'tts',
        request_type: 'speech',
        success: true,
        timestamp: new Date(),
        response_time: Date.now() - startTime,
        text_length: text.length,
        text_snippet: text.substring(0, 100),
        audio_size_bytes: audioBuffer.length,
        voice: sanitizedOptions.voice,
        rate: sanitizedOptions.rate,
        from_cache: fromCache,
        client_ip: req.ip || 'unknown',
        user_id: req.user?.id || 'anonymous'
      });
      
      if (!result.acknowledged) {
        throw new Error('Registrazione utilizzo non confermata dal database');
      }
      
      return result;
    });
    
    // Prepara gli header per la risposta audio
    const headers = {
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'private, max-age=86400', // 24 ore di cache
      'X-Generated-At': new Date().toISOString(),
      'X-From-Cache': fromCache.toString(),
      'X-Generation-Time': (Date.now() - startTime).toString()
    };
    
    // Invia la risposta come audio
    res.set(headers);
    res.send(audioBuffer);
  } catch (error) {
    console.error('Errore nel TTS:', error);
    
    // Registra l'errore con retry
    try {
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: 'tts',
          request_type: 'speech',
          success: false,
          timestamp: new Date(),
          response_time: Date.now() - startTime,
          error_message: error.message,
          text_snippet: req.body.text ? req.body.text.substring(0, 100) : '',
          error_type: error.name || 'UnknownError',
          stack_trace: error.stack ? error.stack.substring(0, 500) : null
        });
        
        if (!result.acknowledged) {
          throw new Error('Registrazione errore non confermata dal database');
        }
        
        return result;
      });
    } catch (loggingError) {
      console.error('Errore anche nella registrazione dell\'errore:', loggingError);
    }
    
    // Gestisci l'errore
    res.status(500).json({ 
      error: 'Errore nella sintesi vocale',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {post} /api/ai/scenario Genera scenario
 */
router.post('/scenario', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { messages, options = {} } = req.body;
    
    // Validazione input
    const validationErrors = validateScenarioRequest(messages);
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Parametri scenario non validi', 
        details: validationErrors 
      });
    }
    
    console.log(`Generazione scenario da ${messages.length} messaggi`);
    
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
    
    // Chiama OpenRouter per generare lo scenario con configurazione robusta
    const completion = await withRetry(async () => {
      return await openai.chat.completions.create({
        model: options.model || 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: structuredPrompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      });
    });

    const responseText = completion.choices[0].message.content;
    
    console.log(`Risposta ricevuta, analisi JSON...`);
    
    // Analizza il JSON dalla risposta con gestione più robusta degli errori
    let scenario;
    try {
      // Approccio più robusto per estrarre il JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText.trim().replace(/```json|```/g, '').trim();
      
      // Tentativo di parsing JSON
      scenario = JSON.parse(jsonStr);
      
      // Validazione dei campi obbligatori
      const requiredFields = ['title', 'description', 'objectives', 'avatars'];
      const missingFields = requiredFields.filter(field => !scenario[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`JSON mancante dei campi richiesti: ${missingFields.join(', ')}`);
      }
    } catch (parseError) {
      console.error('Errore parsing JSON:', parseError);
      
      // Registra l'errore di parsing ma usa lo scenario di fallback
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: options.model || 'mistral-7b-instruct',
          request_type: 'scenario_generation',
          success: false,
          timestamp: new Date(),
          error_message: parseError.message,
          error_type: 'JSONParseError',
          response_snippet: responseText.substring(0, 200)
        });
        
        return result;
      });
      
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
    
    // Genera ID univoco
    const { v4: uuidv4 } = await import('uuid');
    
    // Salva lo scenario in MongoDB con transazione se possibile
    const client = req.app.locals.db.client;
    const session = client.startSession();
    
    try {
      // Inizia la transazione
      session.startTransaction();
      
      // Creazione scenario
      const scenarioWithId = {
        id: uuidv4(),
        ...scenario,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        generated_by_ai: true,
        model_used: options.model || 'mistral-7b-instruct',
        status: 'active',
        creator_id: req.user?.id, // Se disponibile dall'autenticazione
        metadata: {
          generation_time_ms: Date.now() - startTime,
          message_count: messages.length,
          options: JSON.stringify(options)
        }
      };
      
      // Inserisci lo scenario con retry
      const result = await withRetry(async () => {
        const result = await req.app.locals.db.collection('scenarios').insertOne(
          scenarioWithId, 
          { session }
        );
        
        if (!result.acknowledged) {
          throw new Error('Operazione non confermata dal database');
        }
        
        return result;
      });
      
      console.log(`Scenario salvato in MongoDB, ID: ${scenarioWithId.id}`);
      
      // Se ci sono avatar, salvali in una collezione separata
      if (scenario.avatars && Array.isArray(scenario.avatars)) {
        // Prepara operazioni bulk
        const avatarDocs = scenario.avatars.map(avatar => ({
          id: uuidv4(),
          name: avatar.name,
          role: avatar.role,
          description: avatar.description,
          scenario_id: scenarioWithId.id,
          avatar_type: 'ai',
          status: 'active',
          created_at: new Date().toISOString()
        }));
        
        // Inserisci tutti gli avatar con retry
        await withRetry(async () => {
          const result = await req.app.locals.db.collection('avatars').insertMany(
            avatarDocs, 
            { session }
          );
          
          if (!result.acknowledged) {
            throw new Error('Operazione avatar non confermata dal database');
          }
          
          return result;
        });
        
        console.log(`${scenario.avatars.length} avatar salvati in MongoDB`);
        
        // Aggiungi gli avatar all'oggetto scenario da restituire
        scenarioWithId.avatars = avatarDocs;
      }
      
      // Registra l'utilizzo dell'AI
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: options.model || 'mistral-7b-instruct',
          request_type: 'scenario_generation',
          success: true,
          timestamp: new Date(),
          response_time: Date.now() - startTime,
          scenario_id: scenarioWithId.id,
          avatar_count: scenario.avatars?.length || 0,
          message_count: messages.length
        }, { session });
        
        if (!result.acknowledged) {
          throw new Error('Registrazione utilizzo non confermata dal database');
        }
        
        return result;
      });
      
      // Commit della transazione
      await session.commitTransaction();
      
      // Aggiungi metadati di performance
      res.json({
        ...scenarioWithId,
        performance: {
          generation_time_ms: Date.now() - startTime,
          model: options.model || 'mistral-7b-instruct',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      // In caso di errore, annulla la transazione
      await session.abortTransaction();
      throw error;
    } finally {
      // Chiudi la sessione in ogni caso
      session.endSession();
    }
  } catch (error) {
    console.error('Errore nella generazione scenario:', error);
    
    // Registra l'errore
    try {
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('ai_model_usage').insertOne({
          model_name: req.body.options?.model || 'unknown',
          request_type: 'scenario_generation',
          success: false,
          timestamp: new Date(),
          error_message: error.message,
          error_type: error.name || 'UnknownError',
          stack_trace: error.stack ? error.stack.substring(0, 500) : null
        });
        
        return result;
      });
    } catch (loggingError) {
      console.error('Errore anche nella registrazione dell\'errore:', loggingError);
    }
    
    // Gestisci l'errore
    res.status(500).json({ 
      error: 'Errore nella generazione dello scenario',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export { router };
