/**
 * Test di integrazione completa del sistema Cafasso AI Academy
 * 
 * Questo test verifica l'integrazione di tutti i componenti principali:
 * - Autenticazione
 * - Database MongoDB
 * - Servizio AI (DeepSeek e fallback)
 * - Servizio TTS
 * - API per i contenuti multimediali
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { MongoClient } = require('mongodb');

// Configurazione di test
const CONFIG = {
  baseURL: 'http://localhost:3000',
  apiURL: 'http://localhost:3000/api',
  admin: {
    username: 'admin',
    password: 'Cafasso@admin2025!'
  },
  testUser: {
    email: 'test-integration@cafasso-academy.it',
    password: 'Test@123456',
    username: 'test-integration'
  },
  openrouterKey: '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',
  mongodbUri: 'mongodb://localhost:27017/cafasso_academy'
};

// Utilità per salvataggio log
const logPath = './test-ai-output/integrazione-log.txt';
let testLog = '';

async function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  testLog += formattedMessage;
  console.log(message);
}

async function saveLog() {
  try {
    await fs.writeFile(logPath, testLog);
    console.log(`\nLog salvato in ${logPath}`);
  } catch (error) {
    console.error(`Errore nel salvataggio del log: ${error.message}`);
  }
}

// Funzioni di test
async function testMongoDB() {
  let client;
  try {
    log('\n=== Test connessione MongoDB ===');
    client = new MongoClient(CONFIG.mongodbUri);
    await client.connect();
    log('✅ Connessione a MongoDB riuscita');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    log(`Collection disponibili: ${collections.map(c => c.name).join(', ')}`);
    
    // Verifica presenza collezioni essenziali
    const requiredCollections = ['users', 'courses', 'documents', 'ai_model_usage'];
    for (const coll of requiredCollections) {
      if (!collections.some(c => c.name === coll)) {
        log(`⚠️ Collection mancante: ${coll}`);
      }
    }
    
    // Verifica admin user
    const adminUser = await db.collection('users').findOne({ username: CONFIG.admin.username });
    if (adminUser) {
      log(`✅ Utente admin verificato: ${adminUser.username} (${adminUser.email})`);
    } else {
      log('❌ Utente admin non trovato');
    }
    
    // Conta documenti nelle collezioni principali
    const counts = {};
    for (const coll of collections.map(c => c.name)) {
      counts[coll] = await db.collection(coll).countDocuments();
    }
    log(`Statistiche collezioni: ${JSON.stringify(counts, null, 2)}`);
    
    return true;
  } catch (error) {
    log(`❌ Errore nel test MongoDB: ${error.message}`);
    return false;
  } finally {
    if (client) await client.close();
  }
}

async function testAuthentication() {
  try {
    log('\n=== Test autenticazione ===');
    
    // Test login admin
    log('Test login admin...');
    const adminLoginResponse = await fetch(`${CONFIG.apiURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: CONFIG.admin.username,
        password: CONFIG.admin.password
      })
    });
    
    if (adminLoginResponse.ok) {
      const adminData = await adminLoginResponse.json();
      log(`✅ Login admin riuscito: ${JSON.stringify(adminData.user)}`);
      
      // Test verifica admin
      const verifyResponse = await fetch(`${CONFIG.apiURL}/admin/check`, {
        headers: { Authorization: `Bearer ${adminData.token}` }
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        log(`✅ Verifica admin riuscita: isAdmin = ${verifyData.isAdmin}`);
      } else {
        log('❌ Verifica admin fallita');
      }
    } else {
      log('❌ Login admin fallito');
    }
    
    // Verifica dell'esistenza dell'utente di test o creazione
    log('Verifica utente di test...');
    const checkUserResponse = await fetch(`${CONFIG.apiURL}/auth/check-user-exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CONFIG.testUser.email })
    });
    
    const userExists = (await checkUserResponse.json()).exists;
    
    if (!userExists) {
      log('Creazione utente di test...');
      const createUserResponse = await fetch(`${CONFIG.apiURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CONFIG.testUser)
      });
      
      if (createUserResponse.ok) {
        log('✅ Utente di test creato');
      } else {
        log('❌ Creazione utente di test fallita');
      }
    } else {
      log('✅ Utente di test esiste già');
    }
    
    // Login con utente di test
    log('Test login utente di test...');
    const loginResponse = await fetch(`${CONFIG.apiURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: CONFIG.testUser.username,
        password: CONFIG.testUser.password
      })
    });
    
    if (loginResponse.ok) {
      const userData = await loginResponse.json();
      log(`✅ Login utente di test riuscito: ${JSON.stringify(userData.user)}`);
      return userData.token;
    } else {
      log('❌ Login utente di test fallito');
      return null;
    }
  } catch (error) {
    log(`❌ Errore nel test autenticazione: ${error.message}`);
    return null;
  }
}

async function testAIServices(token) {
  try {
    log('\n=== Test servizi AI ===');
    
    // Test 1: DeepSeek (modello predefinito)
    log('Test generazione risposta con DeepSeek...');
    const promptDeepSeek = `Riassumi in 3 punti cosa fa un consulente del lavoro.`;
    
    const deepSeekResponse = await fetch(`${CONFIG.apiURL}/ai/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.openrouterKey}`,
        'X-User-Token': token
      },
      body: JSON.stringify({ 
        prompt: promptDeepSeek, 
        model: 'deepseek',
        startTime: Date.now() 
      })
    });
    
    if (deepSeekResponse.ok) {
      const deepSeekData = await deepSeekResponse.json();
      log('✅ Risposta DeepSeek generata');
      log(`Risposta: ${deepSeekData.text.substring(0, 150)}...`);
    } else {
      log('❌ Generazione risposta DeepSeek fallita');
    }
    
    // Test 2: TTS (modalità solo testo)
    log('Test servizio TTS (modalità testo)...');
    const textToConvert = "Il Consulente del Lavoro è un professionista specializzato nel diritto del lavoro e nella gestione delle risorse umane.";
    
    const ttsResponse = await fetch(`${CONFIG.apiURL}/ai/tts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Token': token
      },
      body: JSON.stringify({ 
        text: textToConvert, 
        options: { textOnly: true }
      })
    });
    
    if (ttsResponse.ok) {
      const ttsData = await ttsResponse.json();
      log('✅ Risposta TTS generata');
      log(`Testo: ${ttsData.text}`);
    } else {
      log('❌ Servizio TTS fallito');
    }
    
    return true;
  } catch (error) {
    log(`❌ Errore nel test AI: ${error.message}`);
    return false;
  }
}

async function testMediaServices(token) {
  try {
    log('\n=== Test servizi multimediali ===');
    
    // Test 1: Lettura media items
    log('Test lettura media items...');
    const mediaResponse = await fetch(`${CONFIG.apiURL}/media/items`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      log(`✅ Lettura media items riuscita: ${mediaData.items?.length || 0} elementi trovati`);
    } else {
      log('❌ Lettura media items fallita');
    }
    
    // Test 2: Verifica directory uploads
    try {
      await fs.access('./uploads');
      log('✅ Directory uploads esistente');
    } catch (error) {
      log('❌ Directory uploads non esistente');
    }
    
    return true;
  } catch (error) {
    log(`❌ Errore nel test media: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('=========================================');
  log('  TEST DI INTEGRAZIONE CAFASSO AI ACADEMY  ');
  log('=========================================');
  log(`Data e ora: ${new Date().toISOString()}`);
  
  // Verifica directory di output
  try {
    await fs.mkdir('./test-ai-output', { recursive: true });
  } catch (error) {
    // Directory già esistente
  }
  
  // Test database
  const dbSuccess = await testMongoDB();
  
  // Test autenticazione
  const authToken = await testAuthentication();
  
  if (authToken) {
    // Test servizi AI
    await testAIServices(authToken);
    
    // Test servizi multimediali
    await testMediaServices(authToken);
  }
  
  // Risultato dei test
  log('\n=========================================');
  log('  RISULTATO DEI TEST DI INTEGRAZIONE  ');
  log('=========================================');
  log(`Database: ${dbSuccess ? '✅ OK' : '❌ FALLITO'}`);
  log(`Autenticazione: ${authToken ? '✅ OK' : '❌ FALLITO'}`);
  
  // Salva il log
  await saveLog();
}

// Esegui i test
log('Avvio dei test di integrazione...');
runTests().catch(error => {
  log(`❌ Errore critico: ${error.message}`);
  saveLog();
});
