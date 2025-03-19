# Task di Implementazione OpenRouter per AI

Questo documento descrive i passaggi necessari per implementare correttamente OpenRouter come servizio AI principale per la generazione di testo e scenari.

## Panoramica del Cambiamento

Attualmente il sistema ha problemi di autenticazione con l'API OpenRouter. Vogliamo implementare correttamente le funzionalità utilizzando l'API OpenRouter con le credenziali aggiornate.

## Task 1: Verifica delle Credenziali

Assicurarsi che il file `.env` contenga le credenziali corrette:

```
OPENROUTER_API_KEY=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
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

## Task 2: Installazione delle Dipendenze Necessarie

```bash
npm install openai ws mic pdf-parse dotenv
```

Le dipendenze includono:
- `openai`: Client SDK compatibile con OpenRouter
- `ws`: Per gestire WebSocket
- `mic`: Per catturare l'input audio (opzionale)
- `pdf-parse`: Per estrarre testo dai PDF (opzionale)
- `dotenv`: Per la gestione delle variabili d'ambiente

## Task 3: Modifica del File server/api-ai.js

### 3.1 Aggiornare le Importazioni

```javascript
// API Express per servizi AI
import express from 'express';
import fetch from 'node-fetch';
import { OpenAI } from 'openai';
```

### 3.2 Configurare il Client OpenRouter

```javascript
// Configurazione OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_API_URL
});

// Stampa disponibilità chiavi (debug)
console.log("OpenRouter API Key disponibile:", !!process.env.OPENROUTER_API_KEY);
if (process.env.OPENROUTER_API_KEY) console.log("OpenRouter API Key inizia con:", process.env.OPENROUTER_API_KEY.substring(0, 5));
```

### 3.3 Aggiornare l'Endpoint di Generazione Testo

```javascript
/**
 * @api {post} /api/ai/generate Genera risposta AI
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'claude' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt richiesto' });
    }

    // Mappa il modello al nome corretto di OpenRouter
    const modelMap = {
      'claude': 'anthropic/claude-2',
      'gemini': 'google/gemini-pro',
      'gpt': 'openai/gpt-3.5-turbo-0125',
      'mixtral': 'mistralai/mixtral-8x7b-instruct'
    };
    
    const openRouterModel = modelMap[model] || modelMap.claude;
    
    console.log(`Chiamata a OpenRouter con modello: ${openRouterModel}`);
    
    // Chiama OpenRouter
    const response = await openai.chat.completions.create({
      model: openRouterModel,
      messages: [{ role: 'user', content: prompt }]
    });

    // Registra l'utilizzo nel database
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: model,
      request_type: 'text_generation',
      success: true,
      timestamp: new Date(),
      response_time: Date.now() - (req.body.startTime || Date.now()),
      prompt_length: prompt.length,
      prompt_snippet: prompt.substring(0, 100),
      response_snippet: response.choices[0].message.content.substring(0, 100)
    });
    
    res.json({ text: response.choices[0].message.content });
  } catch (error) {
    console.error('Errore nella generazione AI:', error);
    
    // Registra l'errore
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: req.body.model || 'unknown',
      request_type: 'text_generation',
      success: false,
      timestamp: new Date(),
      error_message: error.message,
      prompt_snippet: req.body.prompt ? req.body.prompt.substring(0, 100) : ''
    });
    
    res.status(500).json({ error: `Errore nella generazione: ${error.message}` });
  }
});
```

### 3.4 Aggiornare l'Endpoint di Generazione Scenario

```javascript
/**
 * @api {post} /api/ai/scenario Genera scenario
 */
router.post('/scenario', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messaggi richiesti come array' });
    }
    
    console.log(`Generating scenario from ${messages.length} messages`);
    
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
    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: structuredPrompt }]
    });

    const responseText = completion.choices[0].message.content;
    
    console.log(`Response received from OpenRouter, parsing JSON...`);
    
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
    
    // Genera ID univoco
    const { v4: uuidv4 } = await import('uuid');
    
    // Salva lo scenario in MongoDB
    const scenarioWithId = {
      id: uuidv4(),
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
    
    console.log(`Scenario saved in MongoDB, ID: ${scenarioWithId.id}`);
    
    // Se ci sono avatar, salvali in una collezione separata
    if (scenario.avatars && Array.isArray(scenario.avatars)) {
      const avatarOps = scenario.avatars.map(avatar => ({
        insertOne: {
          document: {
            id: uuidv4(),
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
      console.log(`${scenario.avatars.length} avatars saved in MongoDB`);
    }
    
    res.json(scenarioWithId);
  } catch (error) {
    console.error('Errore nella generazione scenario:', error);
    res.status(500).json({ error: `Errore nella generazione: ${error.message}` });
  }
});
```

## Task 4: Verifica con Esempio Semplice

Per verificare che l'autenticazione funzioni correttamente, creare un piccolo script di test:

```javascript
// test-openrouter.js
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_API_URL
});

async function testOpenRouter() {
  try {
    console.log('Testing OpenRouter connection...');
    console.log('API Key:', process.env.OPENROUTER_API_KEY ? 'Available' : 'Missing');
    console.log('API URL:', process.env.OPENROUTER_API_URL);
    
    const response = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct',
      messages: [{ role: 'user', content: 'Hello, how are you?' }]
    });
    
    console.log('Response received:');
    console.log(response.choices[0].message.content);
    console.log('Test successful!');
  } catch (error) {
    console.error('Error testing OpenRouter:', error);
  }
}

testOpenRouter();
```

Esegui con:
```bash
node test-openrouter.js
```

## Task 5: Riavvio del Server e Verifica delle API

1. Riavviare il server Express
2. Verificare la connessione a OpenRouter usando l'endpoint di generazione:
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"prompt\":\"Qual è il ruolo di un consulente del lavoro?\"}" http://localhost:3000/api/ai/generate
```
3. Testare la generazione di scenari:
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Crea uno scenario formativo su licenziamento per giusta causa.\"}]}" http://localhost:3000/api/ai/scenario
```

## Note sull'Implementazione
- La libreria OpenAI è compatibile con OpenRouter e offre un'API più moderna rispetto all'approccio basato su fetch.
- L'utilizzo di response streaming è possibile aggiungendo `stream: true` alle opzioni e gestendo gli eventi di streaming.
- Verificare sempre che le variabili d'ambiente siano caricate prima di utilizzare le API.
