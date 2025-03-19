/**
 * Dimostrazione del modulo isomorfico per FormData e fetch
 * Questo test non richiede un server API attivo
 */

// Importa le funzioni dal modulo isomorfico
import { FormData, File, createFileFromPath } from './src/services/isomorphic-fetch.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock per simulare una risposta fetch senza server
// Invece di sovrascrivere la funzione importata, creiamo una nostra implementazione
const mockFetch = async (url, options) => {
  console.log(`\n[MOCK SERVER] Richiesta a: ${url}`);
  console.log(`[MOCK SERVER] Metodo: ${options.method || 'GET'}`);
  
  // Simula risposta del server
  if (url.includes('/media/upload')) {
    console.log('[MOCK SERVER] Elaborazione upload...');
    
    // Verifica che FormData sia presente e corretto
    if (options.body instanceof FormData) {
      console.log('[MOCK SERVER] FormData ricevuto correttamente');
      
      const title = options.body.get('title');
      const description = options.body.get('description');
      const fileType = options.body.get('file_type');
      const file = options.body.get('file');
      
      console.log('[MOCK SERVER] Dati ricevuti:');
      console.log(`- Titolo: ${title}`);
      console.log(`- Descrizione: ${description}`);
      console.log(`- Tipo file: ${fileType}`);
      console.log(`- File nome: ${file ? file.name : 'N/A'}`);
      console.log(`- File tipo: ${file ? file.type : 'N/A'}`);
      console.log(`- File dimensione: ${file ? file.size : 'N/A'} bytes`);
      
      // Simula risposta positiva
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'mock-file-' + Date.now(),
          file_url: `http://example.com/uploads/${file.name}`,
          title,
          description,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          created_at: new Date().toISOString()
        })
      };
    } else {
      console.log('[MOCK SERVER] Errore: FormData non trovato nel body');
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'FormData non trovato' })
      };
    }
  } else {
    console.log('[MOCK SERVER] Endpoint non gestito');
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Endpoint non trovato' })
    };
  }
};

/**
 * Test 1: File da array di bytes
 */
async function testFileFromBytes() {
  console.log('\n=== TEST 1: Creazione File da array di bytes ===');
  
  // Crea un array di byte fittizio (1KB di dati casuali)
  const fileData = new Uint8Array(1024);
  for (let i = 0; i < fileData.length; i++) {
    fileData[i] = Math.floor(Math.random() * 256);
  }
  
  // Crea un oggetto File usando il costruttore isomorfico
  const file = new File([fileData], 'dati-test.bin', { 
    type: 'application/octet-stream',
    lastModified: Date.now()
  });
  
  // Verifica proprietà del file
  console.log(`File creato: ${file.name}`);
  console.log(`- Tipo: ${file.type}`);
  console.log(`- Dimensione: ${file.size} bytes`);
  console.log(`- Data ultima modifica: ${new Date(file.lastModified).toISOString()}`);
  
  return file;
}

/**
 * Test 2: Creazione di FormData e aggiunta di valori
 */
async function testFormData(file) {
  console.log('\n=== TEST 2: Utilizzo di FormData ===');
  
  // Crea un FormData usando il costruttore isomorfico
  const formData = new FormData();
  
  // Aggiunge valori al FormData
  formData.append('file', file);
  formData.append('title', 'File di test');
  formData.append('description', 'Questo è un file di test creato con FormData isomorfico');
  formData.append('file_type', 'documento');
  
  // Aggiunge oggetto JSON
  formData.append('metadata', { 
    tags: ['test', 'isomorfico'],
    createdBy: 'test-script'
  });
  
  // Verifica il contenuto
  console.log('FormData creato con i seguenti campi:');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`- ${key}: File (${value.name}, ${value.size} bytes)`);
    } else {
      console.log(`- ${key}: ${typeof value === 'string' ? value : 'Oggetto'}`);
    }
  }
  
  return formData;
}

/**
 * Test 3: Creazione di un file da percorso
 */
async function testFileFromPath() {
  console.log('\n=== TEST 3: Creazione File da percorso ===');
  
  // Crea directory temporanea e file di test se non esistono
  const testDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  const testFilePath = path.join(testDir, 'file-test-isomorfico.txt');
  
  // Scrivi dati di test nel file
  fs.writeFileSync(testFilePath, 'Questo è un file di test per il modulo isomorfico.\n'.repeat(50));
  console.log(`File di test creato: ${testFilePath}`);
  
  // Crea un File dall'oggetto percorso
  const file = createFileFromPath(testFilePath, {
    type: 'text/plain'
  });
  
  console.log(`File creato da percorso: ${file.name}`);
  console.log(`- Tipo: ${file.type}`);
  console.log(`- Dimensione: ${file.size} bytes`);
  
  return file;
}

/**
 * Test 4: Upload file utilizzando fetch
 */
async function testFetch(file) {
  console.log('\n=== TEST 4: Upload con fetch ===');
  
  // Metadata per il file
  const metadata = {
    title: `Upload di ${file.name}`,
    description: 'Test di upload utilizzando fetch isomorfico',
    file_type: file.type.includes('text') ? 'documento' : 'altro'
  };
  
  // Crea FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', metadata.title);
  formData.append('description', metadata.description);
  formData.append('file_type', metadata.file_type);
  
  // Funzione di progresso simulata
  const onProgress = progress => {
    console.log(`Progresso upload: ${progress}%`);
  };
  
  // Simula il progresso
  let uploadProgress = 0;
  const interval = setInterval(() => {
    uploadProgress += 10;
    if (uploadProgress <= 90) {
      onProgress(uploadProgress);
    } else {
      clearInterval(interval);
    }
  }, 300);
  
  try {
    console.log('Invio richiesta upload...');
    // Usiamo direttamente il mock senza dipendere dalla funzione importata
    const response = await mockFetch('http://localhost:3000/api/media/upload', {
      method: 'POST',
      body: formData
    });
    
    clearInterval(interval);
    onProgress(100);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nell'upload: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Upload completato con successo!');
    console.log('Risposta server:', result);
    return result;
  } catch (error) {
    clearInterval(interval);
    console.error('Errore durante upload:', error);
    throw error;
  }
}

/**
 * Esegue tutti i test in sequenza
 */
async function runAllTests() {
  try {
    console.log('===== DIMOSTRAZIONE DEL MODULO ISOMORFICO FETCH/FORMDATA =====');
    
    // Test 1: File da bytes
    const fileFromBytes = await testFileFromBytes();
    
    // Test 2: FormData
    await testFormData(fileFromBytes);
    
    // Test 3: File da percorso
    const fileFromPath = await testFileFromPath();
    
    // Test 4: Upload con fetch
    await testFetch(fileFromPath);
    
    console.log('\n===== TUTTI I TEST COMPLETATI CON SUCCESSO =====');
  } catch (error) {
    console.error('\nERRORE DURANTE I TEST:', error);
  }
}

// Avvia i test
runAllTests();
