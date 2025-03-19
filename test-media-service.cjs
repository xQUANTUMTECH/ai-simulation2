// Test del servizio di media utilizzando CommonJS con implementazione isomorfica
const fs = require('fs');
const path = require('path');
const mediaService = require('./src/services/media-service.js');

/**
 * Test di upload di un file mock
 */
async function testMockVideoUpload() {
  try {
    console.log('Test 1: Tentativo di caricamento video con mock...');
    // Creo un mock del file - ora sarà convertito in un File reale internamente
    const mockFile = {
      name: 'video.mp4',
      type: 'video/mp4',
      size: 1024 * 1024
    };
    
    // Metadati per il video
    const metadata = {
      title: 'Video di test con mock',
      description: 'Video caricato per test usando mock',
      file_type: 'video'
    };
    
    // Funzione di progresso
    const onProgress = (progress) => {
      console.log(`Progresso: ${progress}%`);
    };
    
    const result = await mediaService.uploadMedia(mockFile, metadata, onProgress);
    console.log('Video mock caricato con successo:', result);
    return result;
  } catch (error) {
    console.error('Errore durante il caricamento del video mock:', error);
    throw error;
  }
}

/**
 * Test di upload usando un percorso di file
 */
async function testFilePathUpload() {
  try {
    console.log('\nTest 2: Tentativo di caricamento video da percorso file...');
    
    // Crea un file temporaneo di test se non esiste
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    const testFilePath = path.join(testDir, 'test-video.mp4');
    
    // Se il file non esiste, crea un file fittizio
    if (!fs.existsSync(testFilePath)) {
      // Crea un file binario fittizio di 1MB
      const buffer = Buffer.alloc(1024 * 1024); // 1MB di dati vuoti
      fs.writeFileSync(testFilePath, buffer);
      console.log(`File di test creato: ${testFilePath}`);
    }
    
    // Metadata per il video
    const metadata = {
      title: 'Video di test da file reale',
      description: 'Video caricato per test usando percorso file',
      file_type: 'video'
    };
    
    // Funzione di progresso
    const onProgress = (progress) => {
      console.log(`Progresso: ${progress}%`);
    };
    
    // Usa il percorso del file direttamente
    const result = await mediaService.uploadMedia(testFilePath, metadata, onProgress);
    console.log('Video da percorso file caricato con successo:', result);
    return result;
  } catch (error) {
    console.error('Errore durante il caricamento del video da percorso file:', error);
    throw error;
  }
}

// Esegui tutti i test in sequenza
async function runAllTests() {
  try {
    await testMockVideoUpload();
    await testFilePathUpload();
    console.log('\nTutti i test completati con successo!');
  } catch (error) {
    console.error('\nErrore durante l\'esecuzione dei test:', error);
  }
}

runAllTests();
