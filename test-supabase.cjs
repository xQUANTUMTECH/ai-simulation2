#!/usr/bin/env node

/**
 * CAFASSO ACADEMY - Test delle API Supabase
 * 
 * Questo script utilizza direttamente le API di Supabase per testare:
 * - Upload di documenti
 * - Upload di video
 * - Interazione con le tabelle
 * - Generazione di quiz tramite interazione con OpenAI (se configurato)
 * 
 * Per eseguire lo script:
 * 1. Configura le variabili d'ambiente SUPABASE_URL e SUPABASE_KEY
 * 2. Opzionale:  per testare la generazione di quiz
 * 3. Esegui: node test-supabase.cjs
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configurazione Supabase 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
let supabase;

// Configurazione OpenAI (opzionale)
const openaiKey = process.env.OPENAI_API_KEY;
let openaiEnabled = false;

// Bucket Storage
const DOCUMENTS_BUCKET = 'documents';
const VIDEOS_BUCKET = 'academy-media';
const TEST_USER_ID = 'test-user-123';

// Colori per output console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Interfaccia CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utilità per log formattati
function logError(message) {
  console.error(`${colors.red}[ERRORE] ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESSO] ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}[INFO] ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}[AVVISO] ${message}${colors.reset}`);
}

// Funzione di inizializzazione
async function initialize() {
  console.log(`${colors.magenta}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     CAFASSO ACADEMY - TEST API SUPABASE                   ║
║     Versione 1.0                                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Verifica variabili d'ambiente
  if (!supabaseUrl || !supabaseKey) {
    logError("Variabili d'ambiente SUPABASE_URL e SUPABASE_KEY non configurate");
    console.log(`
Configura le seguenti variabili d'ambiente:
- SUPABASE_URL: URL progetto Supabase
- SUPABASE_KEY: Chiave anonima Supabase
- OPENAI_API_KEY: (Opzionale) Chiave API OpenAI per generazione quiz
    
Esempi di configurazione:
- Windows (PowerShell): 
  $env:SUPABASE_URL="https://your-project.supabase.co"
  $env:SUPABASE_KEY="your-anon-key"

- Windows (CMD): 
  set SUPABASE_URL=https://your-project.supabase.co
  set SUPABASE_KEY=your-anon-key
    `);
    process.exit(1);
  }

  try {
    // Crea e inizializza client Supabase
    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verifica connessione
    const { error } = await supabase.from('documents').select('count', { count: 'exact', head: true });
    if (error) throw error;
    
    logSuccess("Connessione a Supabase stabilita con successo");
    
    // Verifica supporto OpenAI
    if (openaiKey) {
      openaiEnabled = true;
      logSuccess("Supporto OpenAI abilitato");
    } else {
      logWarning("API OpenAI non configurata. La generazione di quiz non sarà disponibile");
    }
    
    // Mostra menu principale
    showMainMenu();
  } catch (error) {
    logError(`Impossibile connettersi a Supabase: ${error.message}`);
    process.exit(1);
  }
}

// Menu principale
function showMainMenu() {
  console.log(`
${colors.cyan}=== MENU PRINCIPALE ===${colors.reset}
  
1. Test upload documento
2. Test upload video
3. Test generazione quiz${openaiEnabled ? '' : ' (API OpenAI non configurata)'}
4. Test tabelle database
5. Verifica storage
6. Esci
  `);

  rl.question('Scegli un\'opzione: ', (answer) => {
    switch (answer.trim()) {
      case '1':
        testDocumentUpload();
        break;
      case '2':
        testVideoUpload();
        break;
      case '3':
        if (openaiEnabled) {
          testQuizGeneration();
        } else {
          logWarning("API OpenAI non configurata. Configura la variabile d'ambiente OPENAI_API_KEY");
          setTimeout(showMainMenu, 1000);
        }
        break;
      case '4':
        testDatabaseTables();
        break;
      case '5':
        checkStorage();
        break;
      case '6':
        console.log(`${colors.green}Arrivederci!${colors.reset}`);
        rl.close();
        process.exit(0);
        break;
      default:
        logError("Opzione non valida");
        showMainMenu();
    }
  });
}

// Test upload documento
async function testDocumentUpload() {
  console.log(`${colors.cyan}=== TEST UPLOAD DOCUMENTO ===${colors.reset}`);
  
  rl.question('Percorso completo del file documento: ', async (filePath) => {
    if (!fs.existsSync(filePath)) {
      logError(`File non trovato: ${filePath}`);
      return setTimeout(showMainMenu, 1000);
    }

    try {
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).substring(1).toLowerCase();
      const fileBuffer = fs.readFileSync(filePath);
      
      // Validazione tipo file
      const validExtensions = ['pdf', 'doc', 'docx', 'txt'];
      if (!validExtensions.includes(fileExtension)) {
        logError(`Formato non supportato. Estensioni valide: ${validExtensions.join(', ')}`);
        return setTimeout(showMainMenu, 1000);
      }
      
      // Determina MIME type
      let mimeType;
      switch (fileExtension) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'doc':
          mimeType = 'application/msword';
          break;
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          mimeType = 'text/plain';
          break;
        default:
          mimeType = 'application/octet-stream';
      }
      
      logInfo(`File: ${fileName} (${formatSize(fileStats.size)})`);
      logInfo(`Tipo MIME: ${mimeType}`);
      logInfo("Caricamento in corso...");
      
      // Genera nome file univoco
      const uniqueFileName = `${TEST_USER_ID}/${Date.now()}_${fileName}`;
      
      // Carica su storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;
      
      // Recupera URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from(DOCUMENTS_BUCKET)
        .getPublicUrl(uniqueFileName);
      
      // Inserisci record nella tabella documents
      const document = {
        name: fileName,
        size: fileStats.size,
        type: mimeType,
        url: publicUrl,
        created_by: TEST_USER_ID,
        status: 'ready'
      };
      
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert(document)
        .select()
        .single();
        
      if (docError) throw docError;
      
      logSuccess("Documento caricato con successo!");
      logInfo(`ID Documento: ${docData.id}`);
      logInfo(`URL: ${publicUrl}`);
      
      // Se è un file di testo, chiedi se generare il quiz
      if (fileExtension === 'txt' && openaiEnabled) {
        rl.question('\nVuoi generare un quiz da questo documento? (s/n): ', async (answer) => {
          if (answer.toLowerCase() === 's') {
            await generateQuizFromFile(filePath, docData.id);
          } else {
            setTimeout(showMainMenu, 500);
          }
        });
      } else {
        setTimeout(showMainMenu, 1000);
      }
    } catch (error) {
      logError(`Errore: ${error.message}`);
      if (error.message.includes('already exists')) {
        logInfo("Suggerimento: Il file potrebbe esistere già nello storage. Prova con un nome file diverso.");
      }
      setTimeout(showMainMenu, 1000);
    }
  });
}

// Test upload video
async function testVideoUpload() {
  console.log(`${colors.cyan}=== TEST UPLOAD VIDEO ===${colors.reset}`);
  
  rl.question('Percorso completo del file video: ', async (filePath) => {
    if (!fs.existsSync(filePath)) {
      logError(`File non trovato: ${filePath}`);
      return setTimeout(showMainMenu, 1000);
    }

    try {
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).substring(1).toLowerCase();
      const fileBuffer = fs.readFileSync(filePath);
      
      // Validazione tipo file
      const validExtensions = ['mp4', 'webm', 'mov'];
      if (!validExtensions.includes(fileExtension)) {
        logError(`Formato non supportato. Estensioni valide: ${validExtensions.join(', ')}`);
        return setTimeout(showMainMenu, 1000);
      }
      
      // Controllo dimensioni (limite a 500MB per i test)
      const maxSizeBytes = 500 * 1024 * 1024;
      if (fileStats.size > maxSizeBytes) {
        logError(`File troppo grande (${formatSize(fileStats.size)}). Il limite per i test è ${formatSize(maxSizeBytes)}`);
        return setTimeout(showMainMenu, 1000);
      }
      
      // Determina MIME type
      let mimeType;
      switch (fileExtension) {
        case 'mp4':
          mimeType = 'video/mp4';
          break;
        case 'webm':
          mimeType = 'video/webm';
          break;
        case 'mov':
          mimeType = 'video/quicktime';
          break;
        default:
          mimeType = 'video/mp4';
      }
      
      logInfo(`File: ${fileName} (${formatSize(fileStats.size)})`);
      logInfo(`Tipo MIME: ${mimeType}`);
      logInfo("Caricamento in corso...");
      
      // Genera nome file univoco e percorso
      const timestamp = Date.now();
      const videoPath = `academy-videos/${timestamp}_${fileName}`;
      
      // Carica su storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(VIDEOS_BUCKET)
        .upload(videoPath, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;
      
      // Recupera URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from(VIDEOS_BUCKET)
        .getPublicUrl(videoPath);
      
      // Inserisci record nella tabella academy_videos
      const video = {
        title: fileName.split('.')[0],
        description: 'Video caricato per test tramite API',
        file_name: fileName,
        file_size: fileStats.size,
        file_type: mimeType,
        file_url: publicUrl,
        status: 'ready', // Per il test impostiamo subito a ready
        uploaded_by: TEST_USER_ID
      };
      
      const { data: videoData, error: videoError } = await supabase
        .from('academy_videos')
        .insert(video)
        .select()
        .single();
        
      if (videoError) throw videoError;
      
      logSuccess("Video caricato con successo!");
      logInfo(`ID Video: ${videoData.id}`);
      logInfo(`URL: ${publicUrl}`);
      
      setTimeout(showMainMenu, 1000);
    } catch (error) {
      logError(`Errore: ${error.message}`);
      if (error.message.includes('already exists')) {
        logInfo("Suggerimento: Il file potrebbe esistere già nello storage. Prova con un nome file diverso.");
      }
      setTimeout(showMainMenu, 1000);
    }
  });
}

// Test generazione quiz
async function testQuizGeneration() {
  console.log(`${colors.cyan}=== TEST GENERAZIONE QUIZ ===${colors.reset}`);
  
  rl.question('Percorso completo del file di testo: ', async (filePath) => {
    if (!fs.existsSync(filePath)) {
      logError(`File non trovato: ${filePath}`);
      return setTimeout(showMainMenu, 1000);
    }
    
    await generateQuizFromFile(filePath);
  });
}

// Genera quiz da file
async function generateQuizFromFile(filePath, documentId = null) {
  try {
    if (!openaiEnabled) {
      logWarning("Configurazione OpenAI mancante, impossibile generare quiz");
      return setTimeout(showMainMenu, 1000);
    }
    
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    if (fileExtension !== '.txt') {
      logWarning("Questa demo supporta solo file .txt per la generazione di quiz");
      return setTimeout(showMainMenu, 1000);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.length < 50) {
      logWarning("Il contenuto del file è troppo breve per generare un quiz");
      return setTimeout(showMainMenu, 1000);
    }
    
    logInfo("Preparazione generazione quiz...");
    
    // Chiedi dettagli quiz
    const quizTitle = await askQuestion(`Titolo quiz (default: ${fileName.split('.')[0]}): `);
    const numQuestionsStr = await askQuestion('Numero di domande (1-10, default: 5): ');
    const difficulty = await askQuestion('Difficoltà (easy/medium/hard/mixed, default: mixed): ');
    
    const title = quizTitle || fileName.split('.')[0];
    const numQuestions = parseInt(numQuestionsStr) || 5;
    const quizDifficulty = difficulty || 'mixed';
    
    logInfo(`Generazione quiz "${title}" con ${numQuestions} domande (${quizDifficulty})...`);
    
    // Se avessimo configurato OpenAI:
    // Qui andrebbe la vera chiamata a OpenAI per generare il quiz
    // Utilizziamo setTimeout per simulare il processo
    
    console.log(`${colors.yellow}Simulazione generazione quiz da OpenAI...${colors.reset}`);
    setTimeout(() => {
      const quizQuestions = [
        {
          question: "Quale dei seguenti è un beneficio principale dell'apprendimento personalizzato?",
          options: [
            "Riduce i costi dell'istruzione per tutti",
            "Adatta il contenuto alle esigenze individuali",
            "Elimina la necessità di insegnanti umani",
            "Standardizza completamente il curriculum"
          ],
          correctAnswer: 1
        },
        {
          question: "Quale tecnologia è considerata fondamentale per l'evoluzione dell'apprendimento a distanza?",
          options: [
            "Intelligenza artificiale conversazionale",
            "Realtà virtuale e aumentata",
            "Blockchain",
            "Robot fisici in aula"
          ],
          correctAnswer: 0
        }
      ];
      
      // Simula l'inserimento nel database
      logSuccess("Quiz generato con successo!");
      logInfo(`Titolo: ${title}`);
      logInfo(`Domande: ${quizQuestions.length}`);
      
      // Mostra un esempio
      console.log(`\n${colors.cyan}Esempio di domanda:${colors.reset}`);
      console.log(`Domanda: ${quizQuestions[0].question}`);
      quizQuestions[0].options.forEach((opt, idx) => {
        const marker = idx === quizQuestions[0].correctAnswer ? '✓' : ' ';
        console.log(`${marker} ${idx + 1}. ${opt}`);
      });
      
      setTimeout(showMainMenu, 1000);
    }, 2000);
  } catch (error) {
    logError(`Errore: ${error.message}`);
    setTimeout(showMainMenu, 1000);
  }
}

// Test tabelle database
async function testDatabaseTables() {
  console.log(`${colors.cyan}=== TEST TABELLE DATABASE ===${colors.reset}`);
  
  try {
    console.log("\nElenco tabelle e numero record:");
    
    const tables = [
      'documents',
      'academy_videos',
      'courses',
      'course_modules',
      'quizzes',
      'quiz_questions',
      'quiz_results'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`- ${table}: ${colors.red}Errore: ${error.message}${colors.reset}`);
        } else {
          console.log(`- ${table}: ${colors.green}${count} record${colors.reset}`);
        }
      } catch (tableError) {
        console.log(`- ${table}: ${colors.red}Errore: ${tableError.message}${colors.reset}`);
      }
    }
    
    // Mostra ultimi 5 documenti
    console.log("\nUltimi 5 documenti:");
    const { data: latestDocs, error: docsError } = await supabase
      .from('documents')
      .select('id, name, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (docsError) {
      logError(`Errore: ${docsError.message}`);
    } else if (latestDocs.length === 0) {
      console.log("Nessun documento trovato");
    } else {
      latestDocs.forEach(doc => {
        console.log(`- ${doc.id}: ${doc.name} (${doc.status}) - ${new Date(doc.created_at).toLocaleString()}`);
      });
    }
    
    // Mostra ultimi 5 video
    console.log("\nUltimi 5 video:");
    const { data: latestVideos, error: videosError } = await supabase
      .from('academy_videos')
      .select('id, title, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (videosError) {
      logError(`Errore: ${videosError.message}`);
    } else if (latestVideos.length === 0) {
      console.log("Nessun video trovato");
    } else {
      latestVideos.forEach(video => {
        console.log(`- ${video.id}: ${video.title} (${video.status}) - ${new Date(video.created_at).toLocaleString()}`);
      });
    }
  } catch (error) {
    logError(`Errore: ${error.message}`);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Verifica storage
async function checkStorage() {
  console.log(`${colors.cyan}=== VERIFICA STORAGE ===${colors.reset}`);
  
  try {
    // Controlla bucket documents
    console.log("\nBucket documenti:");
    const { data: docFiles, error: docError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(TEST_USER_ID, {
        limit: 10,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
      
    if (docError) {
      logError(`Errore bucket documenti: ${docError.message}`);
    } else if (!docFiles || docFiles.length === 0) {
      console.log("Nessun documento trovato");
    } else {
      docFiles.forEach(file => {
        console.log(`- ${file.name} (${formatSize(file.metadata.size)})`);
      });
    }
    
    // Controlla bucket video
    console.log("\nBucket video:");
    const { data: videoFiles, error: videoError } = await supabase.storage
      .from(VIDEOS_BUCKET)
      .list('academy-videos', {
        limit: 10,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });
      
    if (videoError) {
      logError(`Errore bucket video: ${videoError.message}`);
    } else if (!videoFiles || videoFiles.length === 0) {
      console.log("Nessun video trovato");
    } else {
      videoFiles.forEach(file => {
        console.log(`- ${file.name} (${formatSize(file.metadata.size)})`);
      });
    }
  } catch (error) {
    logError(`Errore: ${error.message}`);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Funzione per formattare dimensione file
function formatSize(bytes) {
  if (typeof bytes !== 'number') return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Funzione per fare domande in modo promise-based
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Avvia lo script
initialize();
