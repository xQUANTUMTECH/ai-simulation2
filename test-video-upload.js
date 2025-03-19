/**
 * Test specifico per l'upload di video usando il modulo isomorfico
 * Questo test simula sia il frontend che il backend
 */

import { FormData, File, createFileFromPath } from './src/services/isomorphic-fetch.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';

// Ottieni il dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea funzione per generare dati video fittizi (chunk di dati binari che simulano un file MP4)
function generateFakeVideoData(sizeInBytes = 1024 * 1024 * 5) { // 5MB di default
  const buffer = Buffer.alloc(sizeInBytes);
  
  // Scriviamo un header MP4 fittizio
  // In un file MP4 reale, questi sarebbero i box FTYP, MOOV, ecc.
  const header = Buffer.from([
    0x00, 0x00, 0x00, 0x18, // dimensione del box (24 bytes)
    0x66, 0x74, 0x79, 0x70, // 'ftyp' - box type
    0x69, 0x73, 0x6F, 0x6D, // 'isom' - major brand
    0x00, 0x00, 0x00, 0x01, // minor version
    0x69, 0x73, 0x6F, 0x6D, // 'isom' - compatible brand
    0x61, 0x76, 0x63, 0x31  // 'avc1' - compatible brand
  ]);
  
  // Copiamo l'header nel buffer
  header.copy(buffer, 0);
  
  // Riempiamo il resto con dati casuali
  for (let i = header.length; i < buffer.length; i += 4) {
    const randomValue = crypto.randomBytes(4);
    randomValue.copy(buffer, i, 0, Math.min(4, buffer.length - i));
  }
  
  return buffer;
}

// Simulazione del lato backend (Express/Multer)
class MockMulterBackend {
  constructor() {
    this.uploadDir = path.join(__dirname, 'temp', 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    console.log(`[BACKEND] Directory di upload impostata: ${this.uploadDir}`);
  }
  
  // Simula il middleware di multer
  async processUpload(formData) {
    console.log(`[BACKEND] Ricevuta richiesta di upload...`);
    
    // Estrai i dati dal FormData
    const file = formData.get('file');
    const metadata = {
      title: formData.get('title'),
      description: formData.get('description'),
      file_type: formData.get('file_type')
    };
    
    // Verifica che sia un file video
    if (!file || !file.type.startsWith('video/')) {
      console.error(`[BACKEND] Errore: Il file non è un video o non è presente`);
      return { 
        success: false, 
        error: 'Tipo di file non supportato. È richiesto un file video.' 
      };
    }
    
    // Genera un nome file univoco
    const ext = path.extname(file.name);
    const uniqueFilename = `video_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueFilename);
    
    // In un backend reale, multer salverebbe il file su disco
    // Qui simuliamo questo processo
    try {
      // Debug per capire cosa stiamo ricevendo
      console.log(`[BACKEND] Tipo di file ricevuto: ${typeof file}`);
      console.log(`[BACKEND] File è istanza di File? ${file instanceof File}`);
      console.log(`[BACKEND] File ha _file? ${!!file._file}`);
      console.log(`[BACKEND] File ha arrayBuffer()? ${typeof file.arrayBuffer === 'function'}`);
      
      // Nel backend reale, multer fornisce il file come buffer o stream
      // Per il nostro oggetto File personalizzato, abbiamo bisogno di estrarre i dati
      let fileBuffer;
      
      if (typeof file.arrayBuffer === 'function') {
        // Se il file ha un metodo arrayBuffer (sia File standard che IsomorphicFile)
        console.log(`[BACKEND] Usando arrayBuffer() per estrarre i dati`);
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        // Se c'è un altro modo per accedere ai dati
        console.log(`[BACKEND] Il file non ha un metodo arrayBuffer(), cercando alternative`);
        
        // Prova con _file per IsomorphicFile
        if (file._file) {
          console.log(`[BACKEND] Usando file._file`);
          fileBuffer = fs.readFileSync(file._file);
        } else if (typeof file === 'string') {
          console.log(`[BACKEND] Il file è un percorso: ${file}`);
          fileBuffer = fs.readFileSync(file);
        } else {
          console.log(`[BACKEND] Proprietà del file:`, Object.keys(file));
          throw new Error('Formato file non supportato');
        }
      }
      
      // Salviamo il file
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`[BACKEND] File salvato con successo: ${filePath}`);
      
      // Simula l'inserimento nel database
      const dbRecord = {
        id: `video_${crypto.randomUUID()}`,
        filename: uniqueFilename,
        originalName: file.name,
        mimetype: file.type,
        size: file.size,
        path: filePath,
        url: `/api/videos/${uniqueFilename}`,
        metadata: metadata,
        uploadedAt: new Date().toISOString(),
        status: 'processing' // In un sistema reale, il video potrebbe essere inizialmente in elaborazione
      };
      
      console.log(`[BACKEND] Record nel database creato:`);
      console.log(JSON.stringify(dbRecord, null, 2));
      
      // Simula un'elaborazione in background del video
      setTimeout(() => {
        console.log(`[BACKEND] Elaborazione video completata per: ${dbRecord.id}`);
        dbRecord.status = 'ready';
        
        // In un sistema reale, qui si potrebbero generare thumbnails, trascoding, ecc.
        console.log(`[BACKEND] Video pronto per la riproduzione: ${dbRecord.url}`);
      }, 2000);
      
      return { 
        success: true, 
        message: 'Video caricato con successo', 
        data: { 
          ...dbRecord,
          // Non esporre il percorso completo al client
          path: undefined 
        } 
      };
    } catch (error) {
      console.error(`[BACKEND] Errore durante il salvataggio del file:`, error);
      return { 
        success: false, 
        error: `Errore durante il salvataggio del file: ${error.message}` 
      };
    }
  }
}

/**
 * Simula la parte frontend di upload di un video
 */
async function simulateFrontendVideoUpload() {
  console.log('\n=== FRONTEND: Simulazione upload video ===');
  
  // Simula selezione di un file video dall'utente (ad es. da <input type="file">)
  console.log('[FRONTEND] Utente ha selezionato un file video...');
  
  // In un'app reale, qui avremmo file selezionato dall'input
  // Creiamo invece un falso video MP4
  const videoData = generateFakeVideoData();
  const videoFile = new File([videoData], 'video-demo.mp4', { 
    type: 'video/mp4',
    lastModified: Date.now()
  });
  
  // Informazioni sul video
  console.log(`[FRONTEND] File video creato: ${videoFile.name}`);
  console.log(`  - Tipo: ${videoFile.type}`);
  console.log(`  - Dimensione: ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Crea i metadati per il video (forniti dall'utente tramite form)
  const metadata = {
    title: 'Video Demo Isomorfico',
    description: 'Questo video dimostra il funzionamento del modulo isomorfico',
    file_type: 'video'
  };
  
  console.log('[FRONTEND] Metadati video:');
  console.log(`  - Titolo: ${metadata.title}`);
  console.log(`  - Descrizione: ${metadata.description}`);
  
  // Preparazione del FormData per l'upload (nel component React)
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('file_type', metadata.file_type);
  
  console.log('[FRONTEND] FormData creato e pronto per l\'upload');
  
  // Gestione dello stato di progresso
  const uploadProgress = {
    started: false,
    percentage: 0
  };
  
  const updateProgress = (percentage) => {
    uploadProgress.started = true;
    uploadProgress.percentage = percentage;
    console.log(`[FRONTEND] Progresso upload: ${percentage}%`);
  };
  
  // Simula l'avanzamento progressivo dell'upload
  const progressInterval = setInterval(() => {
    if (uploadProgress.percentage < 100) {
      updateProgress(uploadProgress.percentage + 10);
    } else {
      clearInterval(progressInterval);
    }
  }, 300);
  
  // Nel frontend reale qui ci sarebbe una chiamata fetch all'API backend
  console.log('[FRONTEND] Invio richiesta al backend...');
  
  // Invece di fare un fetch reale, passiamo direttamente al backend simulato
  const backend = new MockMulterBackend();
  const response = await backend.processUpload(formData);
  
  // Simula un po' di ritardo nella risposta
  await new Promise(resolve => setTimeout(resolve, 1500));
  clearInterval(progressInterval);
  updateProgress(100);
  
  console.log('\n[FRONTEND] Risposta ricevuta dal backend:');
  console.log(JSON.stringify(response, null, 2));
  
  if (response.success) {
    console.log('[FRONTEND] Video caricato con successo!');
    return response.data;
  } else {
    console.error('[FRONTEND] Errore durante l\'upload:', response.error);
    throw new Error(response.error);
  }
}

/**
 * Test con un file video reale dal filesystem
 */
async function testWithRealVideoFile() {
  console.log('\n=== TEST: Upload con file video reale dal filesystem ===');
  
  // Creare una directory temporanea
  const testDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Crea un file video di test
  const testVideoPath = path.join(testDir, 'test-video.mp4');
  const videoBuffer = generateFakeVideoData(2 * 1024 * 1024); // 2MB
  fs.writeFileSync(testVideoPath, videoBuffer);
  console.log(`File video di test creato: ${testVideoPath} (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  
  // Crea un File isomorfico dal percorso del file
  const videoFile = createFileFromPath(testVideoPath, {
    type: 'video/mp4'
  });
  
  console.log(`File isomorfico creato da percorso: ${videoFile.name}`);
  console.log(`  - Tipo: ${videoFile.type}`);
  console.log(`  - Dimensione: ${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Crea i metadati
  const metadata = {
    title: 'Video da Filesystem',
    description: 'Test di upload da file reale sul filesystem',
    file_type: 'video'
  };
  
  // Crea FormData
  const formData = new FormData();
  formData.append('file', videoFile);
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('file_type', metadata.file_type);
  
  // Inviamo al nostro backend simulato
  console.log('Invio al backend...');
  const backend = new MockMulterBackend();
  const response = await backend.processUpload(formData);
  
  console.log('\nRisposta dal backend:');
  console.log(JSON.stringify(response, null, 2));
  
  if (response.success) {
    console.log('Upload del file video completato con successo!');
    return response.data;
  } else {
    console.error('Errore durante l\'upload:', response.error);
    throw new Error(response.error);
  }
}

/**
 * Esegue tutti i test in sequenza
 */
async function runAllTests() {
  try {
    console.log('===== TEST COMPLETO PER UPLOAD VIDEO ISOMORFICO =====');
    
    // Test 1: Simulazione frontend-backend
    await simulateFrontendVideoUpload();
    
    // Test 2: File video reale dal filesystem
    await testWithRealVideoFile();
    
    console.log('\n===== TUTTI I TEST COMPLETATI CON SUCCESSO =====');
  } catch (error) {
    console.error('\nERRORE DURANTE I TEST:', error);
  }
}

// Avvia i test
runAllTests();
