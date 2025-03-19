# Implementazione delle API AI con MongoDB

Questo documento riassume l'implementazione delle API AI che utilizzano MongoDB come database per la persistenza dei dati.

## Panoramica dell'Architettura

Il sistema è stato progettato per sostituire l'utilizzo di Supabase con MongoDB per la persistenza dei dati, in particolare per gli scenari generati dall'intelligenza artificiale. L'architettura è composta da:

1. **Backend Express**: Gestisce le richieste API e comunica con MongoDB
2. **API AI**: Endpoint per generare risposte AI, convertire testo in audio e generare scenari formativi
3. **Modelli MongoDB**: Collezioni per memorizzare scenari, avatar e altre entità 
4. **API Client**: Funzioni frontend per comunicare con il backend

## File Implementati o Modificati

### 1. Server e API

- `server-express.mjs`: Aggiunto supporto per le variabili d'ambiente e registrazione dei router API
- `server/api-scenarios.js`: Nuovo API router per la gestione degli scenari
- `server/api-ai.js`: Nuovo API router per i servizi AI (generazione testo, TTS, ecc.)

### 2. Client API

- `src/services/api-client.js`: Aggiunto supporto per le nuove API di scenari e AI

### 3. Configurazione

- `.env`: Aggiunte variabili d'ambiente per supportare sia il frontend (VITE_*) che il backend

## Funzionalità Implementate

### 1. API per gli Scenari

```javascript
// GET /api/scenarios
// Recupera tutti gli scenari disponibili

// GET /api/scenarios/:id
// Recupera uno scenario specifico per ID

// POST /api/scenarios
// Crea un nuovo scenario

// PUT /api/scenarios/:id
// Aggiorna uno scenario esistente

// DELETE /api/scenarios/:id
// Elimina uno scenario e i suoi avatar associati
```

### 2. API per i Servizi AI

```javascript
// POST /api/ai/generate
// Genera una risposta testuale basata su un prompt

// POST /api/ai/tts
// Converte testo in audio (text-to-speech)

// POST /api/ai/scenario
// Genera uno scenario formativo basato su una conversazione
```

### 3. Client API

```javascript
// Esempio di utilizzo del client AI
import { AIApi } from '../services/api-client';

// Generazione di risposta
const response = await AIApi.generateResponse("Qual è il ruolo di un consulente del lavoro?");

// Sintesi vocale
const audioBuffer = await AIApi.textToSpeech("Benvenuto alla Cafasso AI Academy");

// Generazione scenario
const scenario = await AIApi.generateScenario([
  { role: 'user', content: 'Ho bisogno di uno scenario formativo sul licenziamento per giusta causa.' }
]);
```

## Struttura dei Dati

### Scenario

```javascript
{
  id: "uuid-generato",
  title: "Titolo dello scenario",
  description: "Descrizione dettagliata",
  objectives: ["Obiettivo 1", "Obiettivo 2", ...],
  roles: [
    { title: "Titolo ruolo", description: "Descrizione" },
    ...
  ],
  phases: [
    { name: "Nome fase", description: "Descrizione", duration: "10m" },
    ...
  ],
  metrics: [
    { name: "Nome metrica", target: 95 },
    ...
  ],
  avatars: [
    { name: "Nome avatar", role: "Ruolo", description: "Descrizione" },
    ...
  ],
  created_at: "ISO_DATE",
  updated_at: "ISO_DATE",
  generated_by_ai: true,
  status: "active"
}
```

### Avatar

```javascript
{
  id: "uuid-generato",
  name: "Nome Avatar",
  role: "Ruolo nell'organizzazione",
  description: "Descrizione dettagliata",
  scenario_id: "ID dello scenario associato",
  avatar_type: "ai",
  status: "active",
  created_at: "ISO_DATE"
}
```

## Problemi Noti e Risoluzioni

1. **Accesso alle Variabili d'Ambiente nel Backend**
   - Problema: Le variabili con prefisso VITE_ sono accessibili solo nel frontend
   - Soluzione: Utilizzo di `dotenv` per caricare le variabili d'ambiente nel backend

2. **Persistenza degli Scenari**
   - Problema: Gli scenari venivano salvati in Supabase ma recuperati da MongoDB
   - Soluzione: Implementazione coerente utilizzando MongoDB per entrambe le operazioni

3. **Recupero delle API Key**
   - Problema: Le chiavi API erano recuperate da Supabase invece che dalle variabili d'ambiente
   - Soluzione: Utilizzo diretto delle variabili d'ambiente con fallback

## Test e Verifica

È stato creato uno script di test per verificare il funzionamento delle API:

```javascript
// test-ai-mongodb-integration.js
// Eseguire con: node test-ai-mongodb-integration.js
```

Lo script verifica:
- La connessione al server Express
- Il recupero dell'elenco scenari
- La generazione di risposte AI
- La conversione di testo in audio
- La generazione e persistenza di scenari

## Conclusioni e Prossimi Passi

L'implementazione attuale fornisce una base solida per la persistenza degli scenari AI su MongoDB. I prossimi passi potrebbero includere:

1. Miglioramento della gestione degli errori delle API
2. Implementazione di test unitari per ogni componente
3. Ottimizzazione delle query MongoDB per scenari più complessi
4. Aggiunta di funzionalità di ricerca e filtro per gli scenari
5. Implementazione di autenticazione per tutte le API
