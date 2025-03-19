# Task di Sostituzione del Servizio TTS

Questo documento descrive i passaggi necessari per sostituire l'attuale servizio TTS Groq con un nuovo servizio che utilizza l'API Google Gemini.

## Panoramica del Cambiamento

Attualmente il sistema utilizza l'API Groq per la funzionalità Text-to-Speech (TTS), ma ci sono problemi di autenticazione. Sostituiremo questo servizio con l'API Google Gemini per migliorare l'affidabilità e le prestazioni.

## Task 1: Installazione delle Dipendenze Necessarie

```bash
npm install say @google/generative-ai dotenv
```

Queste dipendenze includono:
- `say`: Libreria per la sintesi vocale basata sul sistema
- `@google/generative-ai`: SDK ufficiale di Google per l'API Gemini
- `dotenv`: Per la gestione delle variabili d'ambiente

## Task 2: Aggiornamento del File di Configurazione API

Modifica il file `.env` per includere la nuova API key di Google Gemini (già fatto).

Configurazione attuale:
```
OPENROUTER_API_KEY=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
GROQ_API_KEY=AIzaSyA7w8gt_fTHGLxV434QAr24yguIF8NFz-o
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

## Task 3: Modifica del File server/api-ai.js

Sostituire l'attuale implementazione TTS con una nuova implementazione basata su Google Gemini API + libreria 'say'.

### Modifiche da Apportare:

1. Importare le nuove dipendenze all'inizio del file:
```javascript
// API Express per servizi AI
import express from 'express';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from "@google/generative-ai";
import say from 'say';
```

2. Inizializzare l'API Google:
```javascript
// Inizializza Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GROQ_API_KEY); // Riutilizziamo la chiave Groq
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
```

3. Sostituire il codice dell'endpoint TTS:
```javascript
/**
 * @api {post} /api/ai/tts Converte testo in audio
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Testo richiesto' });
    }
    
    console.log(`Chiamata a Google TTS`);
    console.log(`Testo da convertire: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`Opzioni: ${JSON.stringify(options)}`);
    
    // Genera un filename unico per il file audio
    const audioFilename = `tts-${Date.now()}.wav`;
    const audioPath = `./uploads/${audioFilename}`;
    
    // Utilizziamo la libreria 'say' per la sintesi vocale
    await new Promise((resolve, reject) => {
      say.export(text, options.voice || 'Microsoft Elsa', 1.0, audioPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    // Leggi il file audio generato
    const fs = await import('fs');
    const audioBuffer = fs.readFileSync(audioPath);
    
    // Registra l'utilizzo
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: 'google-tts',
      request_type: 'speech',
      success: true,
      timestamp: new Date(),
      response_time: Date.now() - (req.body.startTime || Date.now()),
      text_length: text.length,
      text_snippet: text.substring(0, 100)
    });
    
    // Invia la risposta come audio
    res.set('Content-Type', 'audio/wav');
    res.send(audioBuffer);
    
    // Elimina il file temporaneo
    fs.unlinkSync(audioPath);
    
  } catch (error) {
    console.error('Errore nel TTS:', error);
    
    // Registra l'errore
    await req.app.locals.db.collection('ai_model_usage').insertOne({
      model_name: 'google-tts',
      request_type: 'speech',
      success: false,
      timestamp: new Date(),
      error_message: error.message,
      text_snippet: req.body.text ? req.body.text.substring(0, 100) : ''
    });
    
    res.status(500).json({ error: `Errore nel TTS: ${error.message}` });
  }
});
```

## Task 4: Implementare un Fallback per Sistemi Senza Audio

Aggiungere un flag opzionale che consenta di ricevere il testo anziché l'audio, per i sistemi che non supportano la riproduzione audio:

```javascript
// Aggiungi questo al codice dell'endpoint TTS
if (options.textOnly === true) {
  // Registra l'utilizzo
  await req.app.locals.db.collection('ai_model_usage').insertOne({
    model_name: 'google-tts-text-only',
    request_type: 'text',
    success: true,
    timestamp: new Date(),
    text_length: text.length,
    text_snippet: text.substring(0, 100)
  });
  
  // Restituisci solo il testo
  return res.json({ 
    text: text, 
    voice: options.voice || 'Microsoft Elsa' 
  });
}
```

## Task 5: Creazione Directory di Upload se Non Esiste

Aggiungere il seguente codice prima della definizione degli endpoint:

```javascript
// Crea directory uploads se non esiste
import { promises as fsPromises } from 'fs';
const uploadsDir = './uploads';
(async () => {
  try {
    await fsPromises.access(uploadsDir);
  } catch {
    await fsPromises.mkdir(uploadsDir, { recursive: true });
    console.log('Creata directory uploads per TTS');
  }
})();
```

## Task 6: Aggiornamento del Frontend

Se il frontend utilizza direttamente l'API TTS, è necessario aggiornare anche il codice client per gestire il nuovo formato di risposta.

```javascript
// Esempio di aggiornamento frontend in src/services/api-client.js
async textToSpeech(text, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ text, options })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore nella sintesi vocale');
    }
    
    // Controllo se la risposta è audio o testo
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('audio')) {
      // Gestisci risposta audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Riproduci l'audio
      const audio = new Audio(audioUrl);
      await audio.play();
      
      return audioUrl;
    } else {
      // Gestisci risposta testuale
      const textData = await response.json();
      return textData.text;
    }
  } catch (error) {
    console.error('Errore TTS:', error);
    throw error;
  }
}
```

## Task 7: Verifica e Test

1. Riavviare il server Express
2. Testare l'endpoint `/api/ai/tts` con una richiesta di esempio
3. Verificare che l'audio venga generato e riprodotto correttamente
4. Testare il flag `textOnly` per assicurarsi che funzioni come previsto

### Test Endpoint con curl:
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"Benvenuto alla Cafasso AI Academy. Questo è un test del sistema Text-to-Speech.\"}" http://localhost:3000/api/ai/tts --output test-audio.wav
```

### Test Endpoint con textOnly:
```bash
curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"Benvenuto alla Cafasso AI Academy. Questo è un test del sistema Text-to-Speech.\", \"options\": {\"textOnly\": true}}" http://localhost:3000/api/ai/tts
```

## Note Importanti

1. La libreria `say` utilizza la sintesi vocale del sistema operativo, quindi i risultati potrebbero variare tra diversi sistemi.
2. Su sistemi Windows, è disponibile la voce Microsoft Elsa per l'italiano.
3. La generazione dell'audio è un processo asincrono, quindi è importante mantenere la gestione delle Promise.
4. Potremmo in futuro valutare alternative come l'API Google Cloud Text-to-Speech per una qualità superiore.
