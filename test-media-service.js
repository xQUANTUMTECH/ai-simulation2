// Test ESM per il servizio di media
import { createFileFromPath, FormData, File } from './src/services/isomorphic-fetch.js';
import mediaService from './src/services/media-service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il dirname corrente in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test di upload con un File reale
 */
async function testWithRealFile() {
  try {
    console.log('Test ESM: Tentativo di caricamento con File API...');
    
    // Crea un buffer di dati per simulare un file
    const fileData = new Uint8Array(1024 * 1024); // 1MB di dati
    
    // Crea un File reale usando l'API isomorfica
    const fileObj = new File([fileData], 'test-esm.mp4', { 
      type: 'video/mp4',
      lastModified: Date.now()
    });
    
    // Metadata per il video
    const metadata = {
      title: 'Test ESM con File API',
      description: 'Video caricato con modulo ESM usando File API',
      file_type: 'video'
    };
    
    // Funzione di progresso
    const onProgress = (progress) => {
      console.log(`Progresso: ${progress}%`);
    };
    
    const result = await mediaService.uploadMedia(fileObj, metadata, onProgress);
    console.log('File API upload completato:', result);
    return result;
  } catch (error) {
    console.error('Errore durante il test con File API:', error);
    throw error;
  }
}

/**
 * Test di upload da percorso file usando il modulo ESM
 */
async function testWithFilePath() {
  try {
    console.log('\nTest ESM: Tentativo di caricamento da percorso file...');
    
    // Crea un file temporaneo di test se non esiste
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    const testFilePath = path.join(testDir, 'test-esm-video.mp4');
    
    // Se il file non esiste, crea un file fittizio
    if (!fs.existsSync(testFilePath)) {
      // Crea un file binario fittizio di 1MB
      const buffer = Buffer.alloc(1024 * 1024); // 1MB di dati vuoti
      fs.writeFileSync(testFilePath, buffer);
      console.log(`File di test ESM creato: ${testFilePath}`);
    }
    
    // Metadata per il video
    const metadata = {
      title: 'Test ESM da percorso file',
      description: 'Video caricato con modulo ESM usando percorso file',
      file_type: 'video'
    };
    
    // Funzione di progresso
    const onProgress = (progress) => {
      console.log(`Progresso: ${progress}%`);
    };
    
    // Usa il percorso del file direttamente
    const result = await mediaService.uploadMedia(testFilePath, metadata, onProgress);
    console.log('Upload da percorso file ESM completato:', result);
    return result;
  } catch (error) {
    console.error('Errore durante il test da percorso file ESM:', error);
    throw error;
  }
}

// Esegui tutti i test in sequenza
async function runAllTests() {
  try {
    await testWithRealFile();
    await testWithFilePath();
    console.log('\nTutti i test ESM completati con successo!');
  } catch (error) {
    console.error('\nErrore durante l\'esecuzione dei test ESM:', error);
  }
}

runAllTests();
