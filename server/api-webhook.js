// API Express per gestione webhook
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';

// Configurazione router
const router = express.Router();

// Directory per cache file audio TTS
const audioDir = './uploads/tts-cache';

// Assicurati che la directory esista
(async () => {
  try {
    await fsPromises.access(audioDir);
  } catch {
    await fsPromises.mkdir(audioDir, { recursive: true });
    console.log('Creata directory per cache TTS webhook');
  }
})();

/**
 * Numero massimo di tentativi per operazioni database
 * Riutilizziamo la stessa configurazione usata in altri moduli
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Funzione di utilità per eseguire un'operazione con retry
 * Riutilizziamo la stessa logica di withRetry implementata in altri moduli
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
 * Validazione parametri webhook TTS
 * @param {Object} body - Corpo della richiesta
 * @returns {Object|null} - Errori di validazione o null se valido
 */
function validateTTSWebhookParams(body) {
  const errors = {};
  
  if (!body.text || typeof body.text !== 'string' || body.text.trim() === '') {
    errors.text = 'Testo richiesto e non può essere vuoto';
  }
  
  if (body.text && body.text.length > 5000) {
    errors.text = 'Testo troppo lungo, massimo 5000 caratteri';
  }
  
  if (!body.targetUrl || typeof body.targetUrl !== 'string') {
    errors.targetUrl = 'URL di callback richiesto e deve essere una stringa valida';
  }
  
  if (body.targetUrl && !isValidUrl(body.targetUrl)) {
    errors.targetUrl = 'URL di callback non valido';
  }
  
  // Verifica opzioni TTS se presenti
  if (body.options) {
    const validVoices = ['Microsoft Elsa', 'Microsoft David', 'Microsoft Zira', 'Microsoft Mark'];
    if (body.options.voice && !validVoices.includes(body.options.voice)) {
      errors.voice = `Voce non supportata. Usa una delle seguenti: ${validVoices.join(', ')}`;
    }
    
    if (body.options.rate && (typeof body.options.rate !== 'number' || body.options.rate < 0.5 || body.options.rate > 2.0)) {
      errors.rate = 'Rate deve essere un numero tra 0.5 e 2.0';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Controlla se una stringa è un URL valido
 * @param {string} url - URL da verificare
 * @returns {boolean} - true se è un URL valido
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @api {post} /api/webhooks/tts Crea un job TTS e notifica al callback quando completato
 */
router.post('/tts', async (req, res) => {
  try {
    // Validazione input
    const validationErrors = validateTTSWebhookParams(req.body);
    if (validationErrors) {
      return res.status(400).json({ 
        error: 'Parametri webhook TTS non validi', 
        details: validationErrors,
        timestamp: new Date().toISOString()
      });
    }
    
    const { text, targetUrl, options = {}, callbackId = uuidv4() } = req.body;
    
    console.log(`Webhook TTS ricevuto: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`Target URL: ${targetUrl}`);
    console.log(`Callback ID: ${callbackId}`);
    
    // Creazione job TTS
    const ttsJob = {
      id: callbackId,
      text,
      targetUrl,
      options: {
        voice: options.voice || 'Microsoft Elsa',
        rate: options.rate || 1.0
      },
      status: 'processing',
      createdAt: new Date(),
      userId: req.user?.id || 'anonymous',
      clientIp: req.ip || 'unknown'
    };
    
    // Salva job nel database
    await withRetry(async () => {
      const result = await req.app.locals.db.collection('tts_webhook_jobs').insertOne(ttsJob);
      
      if (!result.acknowledged) {
        throw new Error('Operazione non confermata dal database');
      }
      
      return result;
    });
    
    // Risposta immediata con ID job
    res.status(202).json({
      jobId: ttsJob.id,
      status: 'processing',
      estimatedCompletionTime: Math.ceil(text.length / 100) + ' secondi',
      timestamp: new Date().toISOString()
    });
    
    // Processa il job in background
    processTTSJob(req.app.locals.db, ttsJob).catch(error => {
      console.error(`Errore processando job TTS ${ttsJob.id}:`, error);
    });
    
  } catch (error) {
    console.error('Errore webhook TTS:', error);
    
    // Registra l'errore nel database
    try {
      await withRetry(async () => {
        const result = await req.app.locals.db.collection('webhook_errors').insertOne({
          endpoint: '/webhooks/tts',
          error: error.message,
          stack: error.stack,
          timestamp: new Date(),
          clientIp: req.ip || 'unknown',
          userId: req.user?.id || 'anonymous'
        });
        
        return result;
      });
    } catch (dbError) {
      console.error('Errore anche nel logging dell\'errore:', dbError);
    }
    
    res.status(500).json({
      error: 'Errore interno server webhook',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {get} /api/webhooks/jobs/:jobId Verifica lo stato di un job TTS
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Cerca il job nel database
    const job = await withRetry(async () => {
      return await req.app.locals.db.collection('tts_webhook_jobs').findOne({ id: jobId });
    });
    
    if (!job) {
      return res.status(404).json({
        error: 'Job non trovato',
        jobId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Restituisci lo stato del job
    res.json({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      audioUrl: job.audioUrl,
      error: job.error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Errore nel recupero stato job:`, error);
    
    res.status(500).json({
      error: 'Errore interno server',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @api {get} /api/webhooks/jobs Lista di tutti i job TTS (con paginazione)
 */
router.get('/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtro per status se specificato
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Conteggio totale
    const total = await withRetry(async () => {
      return await req.app.locals.db.collection('tts_webhook_jobs').countDocuments(filter);
    });
    
    // Recupera i job con paginazione
    const jobs = await withRetry(async () => {
      return await req.app.locals.db.collection('tts_webhook_jobs')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    });
    
    // Formatta i job per la risposta
    const formattedJobs = jobs.map(job => ({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      audioUrl: job.audioUrl,
      text: job.text.substring(0, 50) + (job.text.length > 50 ? '...' : ''),
      error: job.error
    }));
    
    // Restituisci i job con metadati paginazione
    res.json({
      jobs: formattedJobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Errore nel recupero job:`, error);
    
    res.status(500).json({
      error: 'Errore interno server',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Processa un job TTS in background
 * @param {Object} db - Database MongoDB
 * @param {Object} job - Job TTS da processare
 */
async function processTTSJob(db, job) {
  try {
    console.log(`Elaborazione job TTS ${job.id} iniziata`);
    
    // Aggiorna stato a 'processing'
    await withRetry(async () => {
      const result = await db.collection('tts_webhook_jobs').updateOne(
        { id: job.id },
        { 
          $set: { 
            status: 'processing',
            processingStartedAt: new Date()
          } 
        }
      );
      
      if (!result.acknowledged) {
        throw new Error('Aggiornamento stato non confermato dal database');
      }
      
      return result;
    });
    
    // Genera hash del testo per il caching
    const crypto = await import('crypto');
    const textHash = crypto.createHash('md5').update(
      `${job.text}::${job.options.voice}::${job.options.rate}`
    ).digest('hex');
    
    const cacheFilePath = path.join(audioDir, `${textHash}.wav`);
    let audioBuffer;
    let fromCache = false;
    
    // Verifica se il file è già in cache
    try {
      await fsPromises.access(cacheFilePath);
      console.log(`File audio già in cache per job ${job.id}`);
      
      // Leggi il file dalla cache
      audioBuffer = await fsPromises.readFile(cacheFilePath);
      fromCache = true;
    } catch (error) {
      console.log(`File audio non in cache per job ${job.id}, lo genero`);
      
      // Importa il modulo say per TTS
      const say = (await import('say')).default;
      
      // Genera file audio
      await new Promise((resolve, reject) => {
        say.export(
          job.text,
          job.options.voice,
          job.options.rate,
          cacheFilePath,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
      
      // Leggi il file generato
      audioBuffer = await fsPromises.readFile(cacheFilePath);
    }
    
    // Determina URL pubblico per il file audio
    const audioFilename = path.basename(cacheFilePath);
    const audioUrl = `/uploads/tts-cache/${audioFilename}`;
    
    console.log(`File audio generato per job ${job.id}: ${audioUrl}`);
    
    // Salva URL nel database
    await withRetry(async () => {
      const result = await db.collection('tts_webhook_jobs').updateOne(
        { id: job.id },
        { 
          $set: { 
            status: 'completed',
            completedAt: new Date(),
            audioUrl,
            fromCache,
            audioDuration: audioBuffer.length / 32000, // Stima approssimativa
            audioSize: audioBuffer.length
          } 
        }
      );
      
      if (!result.acknowledged) {
        throw new Error('Aggiornamento con URL non confermato dal database');
      }
      
      return result;
    });
    
    // Notifica callback
    console.log(`Invio callback a ${job.targetUrl} per job ${job.id}`);
    
    try {
      await axios.post(job.targetUrl, {
        jobId: job.id,
        status: 'completed',
        audioUrl: `${process.env.API_BASE_URL || 'http://localhost:3000'}${audioUrl}`,
        text: job.text,
        fromCache,
        createdAt: job.createdAt,
        completedAt: new Date(),
        audioDuration: audioBuffer.length / 32000, // Stima approssimativa
        timestamp: new Date().toISOString()
      });
      
      console.log(`Callback inviato con successo per job ${job.id}`);
      
      // Aggiorna stato callback
      await withRetry(async () => {
        const result = await db.collection('tts_webhook_jobs').updateOne(
          { id: job.id },
          { 
            $set: { 
              callbackSent: true,
              callbackSentAt: new Date()
            } 
          }
        );
        
        return result;
      });
      
    } catch (callbackError) {
      console.error(`Errore nell'invio del callback per job ${job.id}:`, callbackError);
      
      // Aggiorna stato con errore callback
      await withRetry(async () => {
        const result = await db.collection('tts_webhook_jobs').updateOne(
          { id: job.id },
          { 
            $set: { 
              callbackError: callbackError.message,
              callbackErrorAt: new Date()
            } 
          }
        );
        
        return result;
      });
      
      // Non blocca il completamento del job
    }
    
    console.log(`Elaborazione job TTS ${job.id} completata`);
    
  } catch (error) {
    console.error(`Errore nell'elaborazione job TTS ${job.id}:`, error);
    
    // Aggiorna stato con errore
    try {
      await withRetry(async () => {
        const result = await db.collection('tts_webhook_jobs').updateOne(
          { id: job.id },
          { 
            $set: { 
              status: 'error',
              error: error.message,
              errorAt: new Date(),
              errorStack: error.stack
            } 
          }
        );
        
        if (!result.acknowledged) {
          console.error(`Impossibile aggiornare stato errore nel DB per job ${job.id}`);
        }
        
        return result;
      });
      
      // Notifica callback con errore
      try {
        await axios.post(job.targetUrl, {
          jobId: job.id,
          status: 'error',
          error: error.message,
          text: job.text,
          createdAt: job.createdAt,
          errorAt: new Date(),
          timestamp: new Date().toISOString()
        });
      } catch (callbackError) {
        console.error(`Errore nell'invio del callback di errore per job ${job.id}:`, callbackError);
      }
      
    } catch (dbError) {
      console.error(`Errore critico: impossibile aggiornare lo stato di errore nel DB per job ${job.id}:`, dbError);
    }
  }
}

/**
 * @api {delete} /api/webhooks/jobs/:jobId Cancella un job TTS
 * Solo admin possono cancellare job
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    // Verifica che l'utente sia admin
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Solo gli amministratori possono cancellare job',
        timestamp: new Date().toISOString()
      });
    }
    
    const { jobId } = req.params;
    
    // Cancella il job dal database
    const result = await withRetry(async () => {
      return await req.app.locals.db.collection('tts_webhook_jobs').deleteOne({ id: jobId });
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Job non trovato',
        jobId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Risposta di successo
    res.json({
      message: 'Job cancellato con successo',
      jobId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Errore nella cancellazione job:`, error);
    
    res.status(500).json({
      error: 'Errore interno server',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Esporta il router
export { router };
