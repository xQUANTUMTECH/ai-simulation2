// Servizio di transcoding video per generazione multi-risoluzione
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configurazione delle risoluzioni video da generare
 * Per ogni risoluzione creiamo una variante del video originale
 */
const RESOLUTIONS = {
  low: {
    width: 640,
    height: 360,
    bitrate: '800k',
    audioBitrate: '96k',
    suffix: '_low'
  },
  medium: {
    width: 1280,
    height: 720,
    bitrate: '2500k',
    audioBitrate: '128k',
    suffix: '_medium'
  },
  high: {
    width: 1920,
    height: 1080,
    bitrate: '5000k',
    audioBitrate: '192k',
    suffix: '_high'
  }
};

/**
 * Directory dove salvare i file transcodificati
 * Ogni video avrà la sua subdirectory per organizzare tutte le varianti
 */
const TRANSCODED_DIR = path.join(process.cwd(), 'uploads', 'transcoded');

// Assicurati che la directory esista
if (!fs.existsSync(TRANSCODED_DIR)) {
  fs.mkdirSync(TRANSCODED_DIR, { recursive: true });
}

/**
 * Esegue un comando ffmpeg come Promise
 * @param {Array} args - Argomenti del comando ffmpeg
 * @returns {Promise} - Promise che si risolve con l'output del comando o si rifiuta con un errore
 */
const runFfmpeg = (args) => {
  return new Promise((resolve, reject) => {
    // Esegui ffmpeg con gli argomenti specificati
    const process = spawn('ffmpeg', args);
    
    let stdout = '';
    let stderr = '';
    
    // Raccoglie l'output standard
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Raccoglie l'output di errore (ffmpeg scrive il progresso su stderr)
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Gestisce il completamento del processo
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`ffmpeg process exited with code ${code}: ${stderr}`));
      }
    });
    
    // Gestisce gli errori del processo
    process.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg process: ${err.message}`));
    });
  });
};

/**
 * Ottiene informazioni sul video usando ffprobe
 * @param {string} videoPath - Percorso al file video
 * @returns {Promise<Object>} - Dettagli video: durata, bitrate, codec, risoluzione, ecc.
 */
const getVideoInfo = async (videoPath) => {
  try {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate:stream=width,height,codec_name,codec_type',
      '-of', 'json',
      videoPath
    ];
    
    const { stdout } = await new Promise((resolve, reject) => {
      const process = spawn('ffprobe', args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`ffprobe process exited with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`Failed to start ffprobe process: ${err.message}`));
      });
    });
    
    const info = JSON.parse(stdout);
    return {
      duration: parseFloat(info.format.duration),
      bitrate: parseInt(info.format.bit_rate, 10),
      width: info.streams.find(s => s.codec_type === 'video')?.width,
      height: info.streams.find(s => s.codec_type === 'video')?.height,
      videoCodec: info.streams.find(s => s.codec_type === 'video')?.codec_name,
      audioCodec: info.streams.find(s => s.codec_type === 'audio')?.codec_name
    };
  } catch (error) {
    console.error('Errore nell\'ottenere informazioni video:', error);
    throw new Error(`Impossibile ottenere informazioni video: ${error.message}`);
  }
};

/**
 * Crea un job di transcoding per un video
 * @param {Object} options - Opzioni di transcoding
 * @param {string} options.videoPath - Percorso al file video originale
 * @param {string} options.videoId - ID del video nel database
 * @param {string} options.title - Titolo del video
 * @param {string} options.baseUrl - URL base per i link ai file transcodificati
 * @param {Object} options.db - Riferimento al database per aggiornare lo stato
 * @returns {Promise<Object>} - Risultato del transcoding con URLs delle varianti
 */
export const createTranscodingJob = async (options) => {
  const { videoPath, videoId, title, baseUrl, db } = options;
  
  if (!videoPath || !videoId || !db) {
    throw new Error('Parametri mancanti per il job di transcoding');
  }
  
  // Genera ID univoco per il job
  const jobId = uuidv4();
  
  try {
    // Crea record job nel database
    const job = {
      id: jobId,
      videoId,
      status: 'queued',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
      variants: [],
      error: null
    };
    
    // Salva job nel database
    await db.collection('video_transcoding_jobs').insertOne(job);
    
    // Aggiorna lo stato del media a "processing"
    await db.collection('admin_content_uploads').updateOne(
      { id: videoId },
      {
        $set: {
          status: 'processing',
          processing_job_id: jobId,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    // Esegui transcoding in modo asincrono
    processTranscodingJob({ videoPath, videoId, jobId, title, baseUrl, db })
      .catch(error => {
        console.error(`Errore durante il transcoding del video ${videoId}:`, error);
        // Aggiorna lo stato del job in caso di errore
        db.collection('video_transcoding_jobs').updateOne(
          { id: jobId },
          {
            $set: {
              status: 'error',
              error: error.message,
              updated_at: new Date().toISOString()
            }
          }
        ).catch(dbError => {
          console.error('Errore aggiornando stato job nel DB:', dbError);
        });
        
        // Aggiorna lo stato del media
        db.collection('admin_content_uploads').updateOne(
          { id: videoId },
          {
            $set: {
              status: 'error',
              processing_error: error.message,
              updated_at: new Date().toISOString()
            }
          }
        ).catch(dbError => {
          console.error('Errore aggiornando stato media nel DB:', dbError);
        });
      });
    
    // Restituisci immediatamente l'ID del job
    return { jobId, videoId, status: 'queued' };
  } catch (error) {
    console.error('Errore nella creazione job transcoding:', error);
    throw new Error(`Errore transcoding: ${error.message}`);
  }
};

/**
 * Elabora un job di transcoding in background
 * @param {Object} options - Opzioni per il transcoding
 */
const processTranscodingJob = async (options) => {
  const { videoPath, videoId, jobId, title, baseUrl, db } = options;
  
  try {
    // Ottieni informazioni sul video sorgente
    const videoInfo = await getVideoInfo(videoPath);
    
    // Crea directory per questo video
    const videoDir = path.join(TRANSCODED_DIR, videoId);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    
    // Estrai nome file senza estensione
    const fileNameWithoutExt = path.basename(videoPath, path.extname(videoPath));
    
    // Crea un HLS playlist master
    const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
    let masterPlaylistContent = '#EXTM3U\n';
    
    // Aggiorna stato a "processing"
    await db.collection('video_transcoding_jobs').updateOne(
      { id: jobId },
      {
        $set: {
          status: 'processing',
          video_info: videoInfo,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    // Array per tenere traccia dei risultati per ogni risoluzione
    const results = [];
    const variants = [];
    
    // Processa ogni risoluzione
    for (const [quality, config] of Object.entries(RESOLUTIONS)) {
      try {
        // Calcola altezza mantenendo aspect ratio se non specificata
        let targetHeight = config.height;
        let targetWidth = config.width;
        
        if (videoInfo.width && videoInfo.height) {
          const aspectRatio = videoInfo.width / videoInfo.height;
          
          // Se il video originale è più piccolo della risoluzione target, salta questa risoluzione
          if (quality !== 'low' && (videoInfo.width < config.width || videoInfo.height < config.height)) {
            console.log(`Video originale (${videoInfo.width}x${videoInfo.height}) più piccolo della risoluzione ${quality} (${config.width}x${config.height}). Skipping.`);
            continue;
          }
          
          // Adatta dimensioni mantenendo aspect ratio
          if (aspectRatio > 16/9) {
            // Video più largo di 16:9
            targetHeight = Math.round(targetWidth / aspectRatio);
          } else {
            // Video più stretto di 16:9
            targetWidth = Math.round(targetHeight * aspectRatio);
          }
        }
        
        // Percorsi file output
        const outputMP4 = path.join(videoDir, `${fileNameWithoutExt}${config.suffix}.mp4`);
        const outputHLS = path.join(videoDir, `${quality}.m3u8`);
        
        // Crea MP4 per ogni risoluzione
        await runFfmpeg([
          '-i', videoPath,
          '-vf', `scale=${targetWidth}:${targetHeight}`,
          '-c:v', 'libx264',
          '-b:v', config.bitrate,
          '-c:a', 'aac',
          '-b:a', config.audioBitrate,
          '-movflags', '+faststart',
          '-y', // Sovrascrivi se esiste
          outputMP4
        ]);
        
        // Crea HLS playlist per ogni risoluzione
        await runFfmpeg([
          '-i', outputMP4,
          '-c:v', 'copy',
          '-c:a', 'copy',
          '-hls_time', '10', // Durata di ogni segmento
          '-hls_playlist_type', 'vod',
          '-hls_segment_filename', path.join(videoDir, `${quality}_%03d.ts`),
          '-y', // Sovrascrivi se esiste
          outputHLS
        ]);
        
        // Calcola URL relativo per HLS
        const relativeHLSPath = path.join('transcoded', videoId, `${quality}.m3u8`).replace(/\\/g, '/');
        const hlsUrl = `${baseUrl}/uploads/${relativeHLSPath}`;
        
        // URL per MP4 diretto
        const relativeMp4Path = path.join('transcoded', videoId, `${fileNameWithoutExt}${config.suffix}.mp4`).replace(/\\/g, '/');
        const mp4Url = `${baseUrl}/uploads/${relativeMp4Path}`;
        
        // Aggiungi variante alla master playlist
        masterPlaylistContent += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(config.bitrate) * 1000},RESOLUTION=${targetWidth}x${targetHeight}\n`;
        masterPlaylistContent += `${quality}.m3u8\n`;
        
        // Salva risultato
        const variant = {
          quality,
          resolution: `${targetWidth}x${targetHeight}`,
          bitrate: config.bitrate,
          mp4_url: mp4Url,
          hls_url: hlsUrl,
          size: fs.statSync(outputMP4).size
        };
        
        results.push({ quality, outputMP4, outputHLS, mp4Url, hlsUrl });
        variants.push(variant);
        
        // Aggiorna il progresso nel database
        const progress = Math.round(((Object.keys(results).length) / Object.keys(RESOLUTIONS).length) * 100);
        await db.collection('video_transcoding_jobs').updateOne(
          { id: jobId },
          {
            $set: {
              progress,
              updated_at: new Date().toISOString()
            }
          }
        );
      } catch (error) {
        console.error(`Errore nel transcoding ${quality}:`, error);
        // Continua con le altre risoluzioni anche se una fallisce
      }
    }
    
    // Scrivi la master playlist
    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
    
    // URL per master playlist
    const relativeMasterPath = path.join('transcoded', videoId, 'master.m3u8').replace(/\\/g, '/');
    const masterUrl = `${baseUrl}/uploads/${relativeMasterPath}`;
    
    // Genera file manifest.json con tutte le informazioni per lo streaming adattivo
    const manifest = {
      id: videoId,
      title: title,
      original_info: videoInfo,
      master_playlist_url: masterUrl,
      variants,
      created_at: new Date().toISOString()
    };
    
    const manifestPath = path.join(videoDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Aggiorna job a "completed"
    await db.collection('video_transcoding_jobs').updateOne(
      { id: jobId },
      {
        $set: {
          status: 'completed',
          progress: 100,
          variants,
          master_playlist_url: masterUrl,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
    );
    
    // Aggiorna media con informazioni transcoding
    await db.collection('admin_content_uploads').updateOne(
      { id: videoId },
      {
        $set: {
          status: 'ready',
          transcoding_completed: true,
          transcoding_job_id: jobId,
          master_playlist_url: masterUrl,
          variants,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    console.log(`Transcoding completato per video ${videoId}, job ${jobId}`);
    return { results, masterUrl, variants };
  } catch (error) {
    console.error(`Errore durante il transcoding ${jobId}:`, error);
    
    // Aggiorna job a "error"
    await db.collection('video_transcoding_jobs').updateOne(
      { id: jobId },
      {
        $set: {
          status: 'error',
          error: error.message,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    // Aggiorna media a "error"
    await db.collection('admin_content_uploads').updateOne(
      { id: videoId },
      {
        $set: {
          status: 'error',
          processing_error: error.message,
          updated_at: new Date().toISOString()
        }
      }
    );
    
    throw error;
  }
};

/**
 * Ottieni lo stato di un job di transcoding
 * @param {Object} options - Opzioni
 * @param {string} options.jobId - ID del job
 * @param {Object} options.db - Riferimento al database
 * @returns {Promise<Object>} - Stato corrente del job
 */
export const getTranscodingJobStatus = async (options) => {
  const { jobId, db } = options;
  
  if (!jobId || !db) {
    throw new Error('Parametri mancanti per controllare stato job');
  }
  
  try {
    const job = await db.collection('video_transcoding_jobs').findOne({ id: jobId });
    
    if (!job) {
      throw new Error(`Job ${jobId} non trovato`);
    }
    
    return {
      jobId,
      videoId: job.videoId,
      status: job.status,
      progress: job.progress,
      variants: job.variants || [],
      master_playlist_url: job.master_playlist_url,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at
    };
  } catch (error) {
    console.error('Errore nel recupero stato job:', error);
    throw new Error(`Errore recupero stato: ${error.message}`);
  }
};

/**
 * Ottieni i job di transcoding in base ai criteri specificati
 * @param {Object} options - Opzioni di query
 * @param {Object} options.db - Riferimento al database
 * @param {string} [options.videoId] - Filtra per ID video
 * @param {string} [options.status] - Filtra per stato
 * @param {number} [options.limit=20] - Numero massimo di risultati
 * @returns {Promise<Array>} - Lista di job che soddisfano i criteri
 */
export const listTranscodingJobs = async (options) => {
  const { db, videoId, status, limit = 20 } = options;
  
  if (!db) {
    throw new Error('Riferimento al database mancante');
  }
  
  try {
    const query = {};
    if (videoId) query.videoId = videoId;
    if (status) query.status = status;
    
    const jobs = await db.collection('video_transcoding_jobs')
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    
    return jobs;
  } catch (error) {
    console.error('Errore nel recupero dei job:', error);
    throw new Error(`Errore nel recupero dei job: ${error.message}`);
  }
};

/**
 * Controlla e avvia il transcoding per qualsiasi video in coda
 * @param {Object} options - Opzioni
 * @param {Object} options.db - Riferimento al database
 * @param {string} options.baseUrl - URL base per i link ai file
 * @returns {Promise<number>} - Numero di job avviati
 */
export const processQueuedVideos = async (options) => {
  const { db, baseUrl } = options;
  
  if (!db || !baseUrl) {
    throw new Error('Parametri mancanti per processamento coda');
  }
  
  try {
    // Trova video caricati ma non ancora processati
    const pendingVideos = await db.collection('admin_content_uploads')
      .find({
        file_type: 'video',
        status: 'ready',
        transcoding_completed: { $ne: true },
        processing_job_id: { $exists: false }
      })
      .toArray();
    
    console.log(`Trovati ${pendingVideos.length} video in attesa di transcoding`);
    
    let startedJobs = 0;
    
    for (const video of pendingVideos) {
      try {
        // Percorso al file originale
        const filename = video.file_url.split('/').pop();
        const videoPath = path.join(process.cwd(), 'uploads', filename);
        
        // Controlla che il file esista
        if (!fs.existsSync(videoPath)) {
          console.error(`File ${videoPath} non trovato, impossibile avviare transcoding`);
          continue;
        }
        
        // Avvia job transcoding
        await createTranscodingJob({
          videoPath,
          videoId: video.id,
          title: video.title,
          baseUrl,
          db
        });
        
        startedJobs++;
      } catch (error) {
        console.error(`Errore avviando transcoding per video ${video.id}:`, error);
      }
    }
    
    return startedJobs;
  } catch (error) {
    console.error('Errore processando coda video:', error);
    throw new Error(`Errore coda: ${error.message}`);
  }
};

/**
 * Controlla e riavvia job in errore o bloccati
 * @param {Object} options - Opzioni
 * @param {Object} options.db - Riferimento al database
 * @param {string} options.baseUrl - URL base per i link ai file
 * @param {number} [options.maxHours=24] - Max ore per considerare un job bloccato
 * @returns {Promise<number>} - Numero di job riavviati
 */
export const restartFailedJobs = async (options) => {
  const { db, baseUrl, maxHours = 24 } = options;
  
  if (!db || !baseUrl) {
    throw new Error('Parametri mancanti per riavvio job');
  }
  
  try {
    // Calcola timestamp per job bloccati
    const stuckTimeThreshold = new Date();
    stuckTimeThreshold.setHours(stuckTimeThreshold.getHours() - maxHours);
    
    // Trova job in errore o bloccati
    const failedJobs = await db.collection('video_transcoding_jobs')
      .find({
        $or: [
          { status: 'error' },
          {
            status: 'processing',
            updated_at: { $lt: stuckTimeThreshold.toISOString() }
          }
        ]
      })
      .toArray();
    
    console.log(`Trovati ${failedJobs.length} job falliti o bloccati`);
    
    let restartedJobs = 0;
    
    for (const job of failedJobs) {
      try {
        // Ottieni info video
        const video = await db.collection('admin_content_uploads').findOne({ id: job.videoId });
        
        if (!video) {
          console.error(`Video ${job.videoId} non trovato, impossibile riavviare job`);
          continue;
        }
        
        // Percorso al file originale
        const filename = video.file_url.split('/').pop();
        const videoPath = path.join(process.cwd(), 'uploads', filename);
        
        // Controlla che il file esista
        if (!fs.existsSync(videoPath)) {
          console.error(`File ${videoPath} non trovato, impossibile riavviare transcoding`);
          continue;
        }
        
        // Aggiorna stato job a "restarted"
        await db.collection('video_transcoding_jobs').updateOne(
          { id: job.id },
          {
            $set: {
              status: 'restarted',
              updated_at: new Date().toISOString()
            }
          }
        );
        
        // Avvia nuovo job
        await createTranscodingJob({
          videoPath,
          videoId: video.id,
          title: video.title,
          baseUrl,
          db
        });
        
        restartedJobs++;
      } catch (error) {
        console.error(`Errore riavviando job ${job.id}:`, error);
      }
    }
    
    return restartedJobs;
  } catch (error) {
    console.error('Errore riavviando job falliti:', error);
    throw new Error(`Errore riavvio job: ${error.message}`);
  }
};

// Esporta funzioni pubbliche del servizio
export default {
  createTranscodingJob,
  getTranscodingJobStatus,
  listTranscodingJobs,
  processQueuedVideos,
  restartFailedJobs
};
