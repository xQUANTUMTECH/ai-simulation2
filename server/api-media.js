// API Express per gestione media
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import transcodingService from './services/video-transcoding-service.js';

// Configurazione del router
const router = express.Router();

// Configurazione di multer per upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Crea la directory uploads se non esiste
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Genera un nome file unico usando UUID
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

// Filtro per tipi di file supportati
const fileFilter = (req, file, cb) => {
  // Tipi MIME supportati
  const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const supportedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  
  if (supportedVideoTypes.includes(file.mimetype) || 
      supportedDocTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato file non supportato'), false);
  }
};

// Configurazione upload con limite 500MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});

// Crea middleware per l'accesso ai file statici
const serveMediaFiles = express.static(path.join(process.cwd(), 'uploads'));

/**
 * @api {post} /api/media/upload Carica un nuovo file multimediale
 * @apiDescription Carica un video o documento con metadati
 * @apiName UploadMedia
 * @apiGroup Media
 * 
 * @apiParam {File} file File da caricare (video o documento)
 * @apiParam {String} title Titolo del contenuto
 * @apiParam {String} description Descrizione del contenuto
 * @apiParam {String} file_type Tipo di file ('video' o 'document')
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { title, description, file_type } = req.body;

    if (!title || !file_type) {
      // Rimuovi il file caricato se mancano dati richiesti
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Titolo e tipo file sono richiesti' });
    }

    // Genera URL pubblico per il file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    // Crea record nel database
    const mediaItem = {
      id: uuidv4(),
      title,
      description: description || '',
      file_url: fileUrl,
      file_type,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      status: 'ready', // 'processing', 'ready', 'error'
      metadata: {
        originalName: req.file.originalname,
        lastModified: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      transcoding_completed: false
    };

    // Salva nel database
    const result = await req.app.locals.db.collection('admin_content_uploads').insertOne(mediaItem);
    
    if (!result.acknowledged) {
      throw new Error('Errore nel salvataggio del file nel database');
    }

    // Avvia transcoding automatico per i video
    if (file_type === 'video' && req.file.mimetype.startsWith('video/')) {
      try {
        // Avvia il job di transcoding in modo asincrono
        transcodingService.createTranscodingJob({
          videoPath: req.file.path,
          videoId: mediaItem.id,
          title: mediaItem.title,
          baseUrl,
          db: req.app.locals.db
        })
        .then(job => {
          console.log(`Job di transcoding avviato: ${job.jobId} per video ${mediaItem.id}`);
        })
        .catch(error => {
          console.error(`Errore nell'avvio transcoding per ${mediaItem.id}:`, error);
        });

        // Aggiorna stato media a "processing"
        mediaItem.status = 'processing';
        mediaItem.transcoding_started = true;
        
        await req.app.locals.db.collection('admin_content_uploads').updateOne(
          { id: mediaItem.id },
          { 
            $set: { 
              status: 'processing',
              transcoding_started: true,
              updated_at: new Date().toISOString()
            } 
          }
        );
      } catch (error) {
        console.error(`Errore nell'inizializzazione transcoding:`, error);
        // Non blocchiamo l'upload se il transcoding fallisce
      }
    }

    res.status(201).json(mediaItem);
  } catch (error) {
    console.error('Errore nel caricamento del file:', error);
    
    // Rimuovi il file in caso di errore
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: `Errore nel caricamento: ${error.message}` });
  }
});

/**
 * @api {get} /api/media Lista di tutti i media
 * @apiDescription Ottieni lista di tutti i media con filtri e ordinamento
 * @apiName GetMedia
 * @apiGroup Media
 * 
 * @apiParam {String} [type] Filtra per tipo (video, document)
 * @apiParam {String} [sort] Campo di ordinamento (date, name, size)
 * @apiParam {String} [order] Direzione ordinamento (asc, desc)
 */
router.get('/', async (req, res) => {
  try {
    const { type, sort = 'date', order = 'desc' } = req.query;
    
    // Costruisci la query
    const query = {};
    if (type && type !== 'all') {
      query.file_type = type;
    }
    
    // Mappa i campi di ordinamento
    const sortField = {
      'date': 'created_at',
      'name': 'title',
      'size': 'file_size'
    }[sort] || 'created_at';
    
    // Direzione ordinamento
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // Esegui la query
    const items = await req.app.locals.db.collection('admin_content_uploads')
      .find(query)
      .sort({ [sortField]: sortOrder })
      .toArray();
    
    res.json({ data: items });
  } catch (error) {
    console.error('Errore nel recupero dei media:', error);
    res.status(500).json({ error: `Errore nel recupero dei media: ${error.message}` });
  }
});

/**
 * @api {get} /api/media/:id Ottieni dettagli di un media
 * @apiDescription Ottieni tutti i dettagli di un elemento multimediale specifico
 * @apiName GetMediaItem
 * @apiGroup Media
 * 
 * @apiParam {String} id ID dell'elemento multimediale
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await req.app.locals.db.collection('admin_content_uploads')
      .findOne({ id });
    
    if (!item) {
      return res.status(404).json({ error: 'Media non trovato' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Errore nel recupero del media:', error);
    res.status(500).json({ error: `Errore nel recupero del media: ${error.message}` });
  }
});

/**
 * @api {put} /api/media/:id Aggiorna un media
 * @apiDescription Aggiorna i metadati di un elemento multimediale
 * @apiName UpdateMedia
 * @apiGroup Media
 * 
 * @apiParam {String} id ID dell'elemento multimediale
 * @apiParam {String} [title] Nuovo titolo
 * @apiParam {String} [description] Nuova descrizione
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    const result = await req.app.locals.db.collection('admin_content_uploads')
      .updateOne(
        { id },
        { $set: updateData }
      );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Media non trovato' });
    }
    
    res.json({ success: true, message: 'Media aggiornato con successo' });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del media:', error);
    res.status(500).json({ error: `Errore nell'aggiornamento: ${error.message}` });
  }
});

/**
 * @api {delete} /api/media/:id Elimina un media
 * @apiDescription Elimina un elemento multimediale e il file associato
 * @apiName DeleteMedia
 * @apiGroup Media
 * 
 * @apiParam {String} id ID dell'elemento multimediale
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Recupera le informazioni sul file
    const item = await req.app.locals.db.collection('admin_content_uploads')
      .findOne({ id });
    
    if (!item) {
      return res.status(404).json({ error: 'Media non trovato' });
    }
    
    // Elimina il file
    const filename = item.file_url.split('/').pop();
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Elimina il record dal database
    await req.app.locals.db.collection('admin_content_uploads')
      .deleteOne({ id });
    
    res.json({ success: true, message: 'Media eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del media:', error);
    res.status(500).json({ error: `Errore nell'eliminazione: ${error.message}` });
  }
});

/**
 * @api {get} /api/media/transcoding/:jobId Stato transcoding video
 * @apiDescription Ottieni lo stato corrente di un job di transcoding
 * @apiName GetTranscodingJobStatus
 * @apiGroup Media
 * 
 * @apiParam {String} jobId ID del job di transcoding
 */
router.get('/transcoding/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const jobStatus = await transcodingService.getTranscodingJobStatus({
      jobId,
      db: req.app.locals.db
    });
    
    res.json(jobStatus);
  } catch (error) {
    console.error('Errore nel recupero stato transcoding:', error);
    res.status(500).json({ error: `Errore nel recupero stato: ${error.message}` });
  }
});

/**
 * @api {get} /api/media/transcoding Lista job transcoding
 * @apiDescription Ottieni lista di tutti i job di transcoding
 * @apiName GetTranscodingJobs
 * @apiGroup Media
 * 
 * @apiParam {String} [videoId] Filtra per ID video
 * @apiParam {String} [status] Filtra per stato (queued, processing, completed, error)
 * @apiParam {Number} [limit] Limite risultati (default: 20)
 */
router.get('/transcoding', async (req, res) => {
  try {
    const { videoId, status, limit } = req.query;
    
    const jobs = await transcodingService.listTranscodingJobs({
      db: req.app.locals.db,
      videoId,
      status,
      limit: limit ? parseInt(limit) : undefined
    });
    
    res.json({ jobs });
  } catch (error) {
    console.error('Errore nel recupero job transcoding:', error);
    res.status(500).json({ error: `Errore nel recupero job: ${error.message}` });
  }
});

/**
 * @api {post} /api/media/transcoding/:videoId/start Avvia transcoding video
 * @apiDescription Avvia manualmente il transcoding di un video
 * @apiName StartTranscoding
 * @apiGroup Media
 * 
 * @apiParam {String} videoId ID del video
 */
router.post('/transcoding/:videoId/start', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Recupera info video
    const video = await req.app.locals.db.collection('admin_content_uploads').findOne({ id: videoId });
    
    if (!video) {
      return res.status(404).json({ error: 'Video non trovato' });
    }
    
    if (video.file_type !== 'video') {
      return res.status(400).json({ error: 'Il file non è un video' });
    }
    
    // Estrai nome file dal percorso
    const filename = video.file_url.split('/').pop();
    const videoPath = path.join(process.cwd(), 'uploads', filename);
    
    // Controlla che il file esista
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'File video non trovato su disco' });
    }
    
    // Genera URL base
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Avvia transcoding
    const job = await transcodingService.createTranscodingJob({
      videoPath,
      videoId,
      title: video.title,
      baseUrl,
      db: req.app.locals.db
    });
    
    res.status(202).json({
      message: 'Transcoding avviato con successo',
      job
    });
  } catch (error) {
    console.error('Errore nell\'avvio transcoding:', error);
    res.status(500).json({ error: `Errore nell'avvio transcoding: ${error.message}` });
  }
});

/**
 * @api {post} /api/media/transcoding/process-queue Processa coda transcoding
 * @apiDescription Avvia il processamento di tutti i video in coda per transcoding
 * @apiName ProcessTranscodingQueue
 * @apiGroup Media
 */
router.post('/transcoding/process-queue', async (req, res) => {
  try {
    // Genera URL base
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Processa coda
    const startedJobs = await transcodingService.processQueuedVideos({
      db: req.app.locals.db,
      baseUrl
    });
    
    res.json({
      message: `Avviati ${startedJobs} job di transcoding dalla coda`,
      started_jobs: startedJobs
    });
  } catch (error) {
    console.error('Errore nel processamento coda transcoding:', error);
    res.status(500).json({ error: `Errore nel processamento coda: ${error.message}` });
  }
});

/**
 * @api {post} /api/media/transcoding/restart-failed Riavvia job falliti
 * @apiDescription Riavvia tutti i job in errore o bloccati
 * @apiName RestartFailedJobs
 * @apiGroup Media
 * 
 * @apiParam {Number} [maxHours=24] Ore max per considerare un job bloccato
 */
router.post('/transcoding/restart-failed', async (req, res) => {
  try {
    const { maxHours } = req.body;
    
    // Genera URL base
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Riavvia job falliti
    const restartedJobs = await transcodingService.restartFailedJobs({
      db: req.app.locals.db,
      baseUrl,
      maxHours: maxHours ? parseInt(maxHours) : undefined
    });
    
    res.json({
      message: `Riavviati ${restartedJobs} job di transcoding falliti`,
      restarted_jobs: restartedJobs
    });
  } catch (error) {
    console.error('Errore nel riavvio job falliti:', error);
    res.status(500).json({ error: `Errore nel riavvio job: ${error.message}` });
  }
});

// Esporta il router e il middleware per servire i file
export { router, serveMediaFiles };
