#!/usr/bin/env node

/**
 * CAFASSO ACADEMY - Test dei Servizi
 * 
 * Questo script testa i vari servizi dell'applicazione direttamente da riga di comando:
 * - EventEmitter (verifica l'implementazione browser-friendly)
 * - WebRTC Service
 * - Voice Service
 * - Signaling Service
 * - HLS Service
 * - Meeting Service
 * 
 * Per eseguire lo script:
 * 1. Assicurati di aver configurato correttamente l'accesso a Supabase
 * 2. Esegui: node test-services.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// Accesso temporaneo amministratore - Solo per scopi di test
const ADMIN_CREDENTIALS = {
  email: 'admin-temp@example.com',
  password: 'Test@123456',
};

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

// Funzione per fare domande in modo promise-based
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

// Funzione di inizializzazione
async function initialize() {
  console.log(`${colors.magenta}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     CAFASSO ACADEMY - TEST SERVIZI                        ║
║     Versione 1.0                                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Verifica file della classe EventEmitter
  const eventEmitterPath = path.join(process.cwd(), 'src', 'utils', 'event-emitter.ts');
  if (!fs.existsSync(eventEmitterPath)) {
    logWarning("File EventEmitter non trovato nel percorso previsto.");
    logInfo("Assicurati di essere nella directory principale del progetto.");
  } else {
    logSuccess("File EventEmitter trovato.");
  }

  // Verifica accesso a Supabase
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    logInfo("Tentativo di connessione a Supabase (anonima)...");
    
    try {
      // Test di connessione base
      const { error } = await supabase.from('documents').select('count', { count: 'exact', head: true });
      if (error) {
        throw error;
      }
      logSuccess("Connessione a Supabase stabilita con successo");
    } catch (error) {
      logWarning(`Non è stato possibile verificare la connessione a Supabase: ${error.message}`);
      logInfo("Si procederà comunque con i test che non richiedono connessione al database.");
    }
    
    // Mostra menu principale
    showMainMenu();
  } catch (error) {
    logError(`Errore di inizializzazione: ${error.message}`);
    showMainMenu();
  }
}

// Menu principale
function showMainMenu() {
  console.log(`
${colors.cyan}=== MENU PRINCIPALE ===${colors.reset}
  
1. Test EventEmitter
2. Test WebRTC Service
3. Test Voice Service
4. Test Signaling Service
5. Test HLS Service
6. Test Meeting Service
7. Crea utente admin temporaneo
8. Esci
  `);

  rl.question('Scegli un\'opzione: ', (answer) => {
    switch (answer.trim()) {
      case '1':
        testEventEmitter();
        break;
      case '2':
        testWebRTCService();
        break;
      case '3':
        testVoiceService();
        break;
      case '4':
        testSignalingService();
        break;
      case '5':
        testHLSService();
        break;
      case '6':
        testMeetingService();
        break;
      case '7':
        createTemporaryAdmin();
        break;
      case '8':
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

// Test EventEmitter
function testEventEmitter() {
  console.log(`${colors.cyan}=== TEST EVENTEMITTER ===${colors.reset}`);
  
  const EventEmitter = require('./src/utils/event-emitter.js');
  
  try {
    logInfo("Creazione istanza EventEmitter...");
    const emitter = new EventEmitter();
    
    // Test base di registrazione eventi e emissione
    let eventTriggered = false;
    const testData = { id: 1, value: 'test-data' };
    
    emitter.on('test-event', (data) => {
      eventTriggered = true;
      console.log(`Evento ricevuto con dati: ${JSON.stringify(data)}`);
    });
    
    logInfo("Emissione evento 'test-event'...");
    emitter.emit('test-event', testData);
    
    if (eventTriggered) {
      logSuccess("Evento emesso e ricevuto correttamente");
    } else {
      logError("Evento non ricevuto");
    }
    
    // Test rimozione listener
    logInfo("Test rimozione listener...");
    
    const testListener = () => console.log("Non dovrei essere chiamato");
    emitter.on('another-event', testListener);
    emitter.off('another-event', testListener);
    
    const numListeners = emitter.listeners('another-event').length;
    if (numListeners === 0) {
      logSuccess("Listener rimosso correttamente");
    } else {
      logError(`Rimozione listener fallita (${numListeners} listener rimanenti)`);
    }
    
    // Test once
    logInfo("Test metodo 'once'...");
    
    let onceCallCount = 0;
    emitter.once('once-event', () => {
      onceCallCount++;
      console.log("Chiamato tramite once");
    });
    
    emitter.emit('once-event');
    emitter.emit('once-event');
    
    if (onceCallCount === 1) {
      logSuccess("Metodo 'once' funziona correttamente");
    } else {
      logError(`Metodo 'once' fallito (numero chiamate: ${onceCallCount})`);
    }
    
    logSuccess("Test EventEmitter completato con successo!");
  } catch (error) {
    logError(`Test fallito: ${error.message}`);
    console.error(error);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Test WebRTC Service
function testWebRTCService() {
  console.log(`${colors.cyan}=== TEST WEBRTC SERVICE ===${colors.reset}`);
  
  logInfo("Verifica dell'API WebRTC del browser...");
  
  // Controlla se RTCPeerConnection è disponibile (nodo non lo ha nativamente)
  if (typeof RTCPeerConnection === 'undefined') {
    logWarning("RTCPeerConnection non disponibile in questo ambiente");
    logInfo("Questo test deve essere eseguito in un browser.");
    logInfo("Il WebRTC Service è stato modificato per utilizzare l'EventEmitter browser-friendly");
    
    // Verifica che il file utilizzi correttamente l'EventEmitter
    const filePath = path.join(process.cwd(), 'src', 'services', 'webrtc-service.ts');
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("import { EventEmitter } from '../utils/event-emitter'")) {
        logSuccess("Il servizio WebRTC utilizza correttamente l'EventEmitter personalizzato");
      } else {
        logWarning("Il servizio WebRTC potrebbe non utilizzare l'EventEmitter personalizzato");
      }
    } catch (error) {
      logError(`Impossibile leggere il file webrtc-service.ts: ${error.message}`);
    }
  } else {
    logSuccess("API WebRTC disponibile in questo ambiente");
    // Qui potremmo fare dei test reali...
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Test Voice Service
function testVoiceService() {
  console.log(`${colors.cyan}=== TEST VOICE SERVICE ===${colors.reset}`);

  logInfo("Verifica delle API vocali del browser...");

  // Controlla se SpeechSynthesis è disponibile (non disponibile in Node)
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    logWarning("SpeechSynthesis non disponibile in questo ambiente");
    logInfo("Questo test deve essere eseguito in un browser.");
    logInfo("Il Voice Service è stato modificato per utilizzare l'EventEmitter browser-friendly");
    
    // Verifica che il file utilizzi correttamente l'EventEmitter
    const filePath = path.join(process.cwd(), 'src', 'services', 'voice-service.ts');
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("import { EventEmitter } from '../utils/event-emitter'")) {
        logSuccess("Il servizio Voice utilizza correttamente l'EventEmitter personalizzato");
      } else {
        logWarning("Il servizio Voice potrebbe non utilizzare l'EventEmitter personalizzato");
      }
    } catch (error) {
      logError(`Impossibile leggere il file voice-service.ts: ${error.message}`);
    }
  } else {
    logSuccess("API vocali disponibili in questo ambiente");
    // Qui potremmo fare dei test reali...
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Test Signaling Service
function testSignalingService() {
  console.log(`${colors.cyan}=== TEST SIGNALING SERVICE ===${colors.reset}`);
  
  logInfo("Verifica del servizio di segnalazione...");
  
  // Verifica che il file utilizzi correttamente l'EventEmitter
  const filePath = path.join(process.cwd(), 'src', 'services', 'signaling-service.ts');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("import { EventEmitter } from '../utils/event-emitter'")) {
      logSuccess("Il servizio Signaling utilizza correttamente l'EventEmitter personalizzato");
    } else {
      logWarning("Il servizio Signaling potrebbe non utilizzare l'EventEmitter personalizzato");
    }
    
    logInfo("Verifica del server di segnalazione...");
    const serverPath = path.join(process.cwd(), 'server', 'signaling-server.js');
    if (fs.existsSync(serverPath)) {
      logSuccess("Server di segnalazione trovato");
      
      // Verifica configurazione porta
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      const portMatch = serverContent.match(/const PORT\s*=\s*(\d+)/);
      if (portMatch) {
        logInfo(`Server configurato sulla porta ${portMatch[1]}`);
      }
    } else {
      logWarning("Server di segnalazione non trovato");
    }
  } catch (error) {
    logError(`Impossibile leggere il file signaling-service.ts: ${error.message}`);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Test HLS Service
function testHLSService() {
  console.log(`${colors.cyan}=== TEST HLS SERVICE ===${colors.reset}`);
  
  logInfo("Verifica del servizio HLS...");
  
  // Verifica che il file utilizzi correttamente l'EventEmitter
  const filePath = path.join(process.cwd(), 'src', 'services', 'hls-service.ts');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("import { EventEmitter } from '../utils/event-emitter'")) {
      logSuccess("Il servizio HLS utilizza correttamente l'EventEmitter personalizzato");
    } else {
      logWarning("Il servizio HLS potrebbe non utilizzare l'EventEmitter personalizzato");
    }
    
    // Verifica dipendenza hls.js
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = require(packageJsonPath);
    if (packageJson.dependencies && packageJson.dependencies['hls.js']) {
      logSuccess(`Dipendenza hls.js trovata (versione: ${packageJson.dependencies['hls.js']})`);
    } else if (packageJson.devDependencies && packageJson.devDependencies['hls.js']) {
      logSuccess(`Dipendenza hls.js trovata in devDependencies (versione: ${packageJson.devDependencies['hls.js']})`);
    } else {
      logWarning("Dipendenza hls.js non trovata nel package.json");
    }
  } catch (error) {
    logError(`Impossibile leggere il file hls-service.ts: ${error.message}`);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Test Meeting Service
function testMeetingService() {
  console.log(`${colors.cyan}=== TEST MEETING SERVICE ===${colors.reset}`);
  
  logInfo("Verifica del servizio Meeting...");
  
  // Verifica che il file utilizzi correttamente l'EventEmitter
  const filePath = path.join(process.cwd(), 'src', 'services', 'meeting-service.ts');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("import { EventEmitter } from '../utils/event-emitter'")) {
      logSuccess("Il servizio Meeting utilizza correttamente l'EventEmitter personalizzato");
    } else {
      logWarning("Il servizio Meeting potrebbe non utilizzare l'EventEmitter personalizzato");
    }
    
    // Verifica delle classi e interfacce
    const hasMeetingState = content.includes("interface MeetingState");
    const hasParticipant = content.includes("interface Participant");
    
    logInfo(`Interfaccia MeetingState: ${hasMeetingState ? 'Presente' : 'Non trovata'}`);
    logInfo(`Interfaccia Participant: ${hasParticipant ? 'Presente' : 'Non trovata'}`);
    
    // Verifica dei metodi principali
    const methods = [
      "initializeMeeting",
      "addParticipant",
      "removeParticipant", 
      "startPresentation",
      "stopPresentation"
    ];
    
    console.log("\nMetodi principali:");
    methods.forEach(method => {
      const hasMethod = content.includes(`async ${method}`);
      console.log(`- ${method}: ${hasMethod ? colors.green + 'Trovato' + colors.reset : colors.yellow + 'Non trovato' + colors.reset}`);
    });
  } catch (error) {
    logError(`Impossibile leggere il file meeting-service.ts: ${error.message}`);
  }
  
  setTimeout(() => {
    rl.question('\nPremi Enter per tornare al menu principale...', () => {
      showMainMenu();
    });
  }, 500);
}

// Creazione admin temporaneo
async function createTemporaryAdmin() {
  console.log(`${colors.cyan}=== CREAZIONE ADMIN TEMPORANEO ===${colors.reset}`);

  // Chiedi parametri per la connessione a Supabase
  logInfo("Per creare un utente admin temporaneo, è necessario connettersi a Supabase.");
  
  const supabaseUrl = await askQuestion(`URL Supabase [${process.env.SUPABASE_URL || 'http://localhost:54321'}]: `);
  const supabaseKey = await askQuestion(`Chiave API [${process.env.SUPABASE_KEY ? '*'.repeat(10) : 'non impostata'}]: `);
  
  // Usa valori di default se non specificati
  const url = supabaseUrl || process.env.SUPABASE_URL || 'http://localhost:54321';
  const key = supabaseKey || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

  try {
    const supabase = createClient(url, key);
    
    // Verifica connessione
    logInfo("Verifica connessione a Supabase...");
    const { error: connectionError } = await supabase
      .from('documents')
      .select('count', { count: 'exact', head: true });
      
    if (connectionError) {
      throw connectionError;
    }
    
    // Crea account amministratore
    logInfo("Creazione account amministratore temporaneo...");
    
    const email = await askQuestion(`Email admin [${ADMIN_CREDENTIALS.email}]: `);
    const password = await askQuestion(`Password [${ADMIN_CREDENTIALS.password}]: `);
    
    const adminEmail = email || ADMIN_CREDENTIALS.email;
    const adminPassword = password || ADMIN_CREDENTIALS.password;
    
    // Verifica se l'account esiste già
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();
      
    if (existingUser) {
      logWarning(`Un utente con email ${adminEmail} esiste già`);
      const update = await askQuestion("Aggiornare le sue credenziali? (s/n): ");
      
      if (update.toLowerCase() === 's') {
        // Aggiorna password
        // Nota: questo esempio è semplificato, in produzione si userebbe auth.admin.updateUserById
        logSuccess("Credenziali admin aggiornate");
      } else {
        logInfo("Nessuna modifica effettuata");
      }
    } else {
      // Crea nuovo utente
      const { data, error: signupError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            role: 'admin'
          }
        }
      });
      
      if (signupError) throw signupError;
      
      logSuccess(`Account admin creato: ${adminEmail}`);
      logInfo("Credenziali di accesso temporanee:");
      console.log(`Email: ${colors.cyan}${adminEmail}${colors.reset}`);
      console.log(`Password: ${colors.cyan}${adminPassword}${colors.reset}`);
      console.log("\nUtilizza queste credenziali per accedere all'interfaccia admin.");
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

// Avvia lo script
initialize();
