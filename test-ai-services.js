// Importa il servizio AI
import { aiService } from './src/services/ai-service.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartella per i file di output del test
const TEST_OUTPUT_DIR = path.join(__dirname, 'test-ai-output');
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR);
}

// Utility per scrivere i log su file e console
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  console.log(logMessage);
  
  fs.appendFileSync(
    path.join(TEST_OUTPUT_DIR, 'ai-test-log.txt'), 
    logMessage + '\n', 
    { encoding: 'utf8' }
  );
}

// Funzione per salvare l'output audio
async function saveAudioToFile(audioBuffer, filename) {
  fs.writeFileSync(
    path.join(TEST_OUTPUT_DIR, filename),
    Buffer.from(audioBuffer)
  );
  log(`File audio salvato: ${filename}`);
}

// Funzione per salvare l'output testuale
function saveTextToFile(text, filename) {
  fs.writeFileSync(
    path.join(TEST_OUTPUT_DIR, filename),
    text,
    { encoding: 'utf8' }
  );
  log(`File testuale salvato: ${filename}`);
}

// Test 1: Generazione di testo con diversi modelli
async function testTextGeneration() {
  log('Iniziando test di generazione testo', 'test');
  
  const prompt = 'Fornisci una breve spiegazione delle recenti normative sul lavoro in Italia in 3 punti principali.';
  const models = ['mistral', 'llama2', 'codellama'];
  
  for (const model of models) {
    try {
      log(`Testando generazione testo con modello: ${model}`, 'test');
      const start = Date.now();
      
      const response = await aiService.generateResponse(prompt, model);
      const duration = Date.now() - start;
      
      log(`Risposta generata in ${duration}ms con ${model}`, 'success');
      saveTextToFile(response, `text-generation-${model}.txt`);
      
      log(`Test generazione testo con ${model} completato con successo`, 'success');
    } catch (error) {
      log(`Errore nel test di generazione testo con ${model}: ${error.message}`, 'error');
    }
  }
}

// Test 2: Text-to-Speech con diverse voci e lingue
async function testTTS() {
  log('Iniziando test di Text-to-Speech', 'test');
  
  const testCases = [
    {
      description: 'Italiano standard',
      text: 'Questo è un test di sintesi vocale per il sistema Cafasso AI Academy.',
      options: { language: 'it', voice: 'alloy' }
    },
    {
      description: 'Italiano formale',
      text: 'La normativa prevede che il contratto di lavoro debba essere redatto per iscritto.',
      options: { language: 'it', voice: 'echo' }
    },
    {
      description: 'Italiano tecnico',
      text: 'L\'articolo 2094 del Codice Civile definisce il lavoratore subordinato.',
      options: { language: 'it', voice: 'nova' }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      log(`Testando TTS: ${testCase.description}`, 'test');
      const start = Date.now();
      
      const audioBuffer = await aiService.textToSpeech(testCase.text, testCase.options);
      const duration = Date.now() - start;
      
      log(`Audio generato in ${duration}ms per "${testCase.description}"`, 'success');
      
      const filename = `tts-${testCase.options.voice}-${Date.now()}.mp3`;
      await saveAudioToFile(audioBuffer, filename);
      
      log(`Test TTS "${testCase.description}" completato con successo`, 'success');
    } catch (error) {
      log(`Errore nel test TTS "${testCase.description}": ${error.message}`, 'error');
    }
  }
}

// Test 3: Generazione di scenari da conversazioni
async function testScenarioGeneration() {
  log('Iniziando test di generazione scenari', 'test');
  
  const testConversations = [
    {
      description: 'Scenario consulenza contrattuale',
      messages: [
        { role: 'user', content: 'Vorrei creare uno scenario per simulare una consulenza su un contratto di lavoro.' },
        { role: 'assistant', content: 'Che tipo di contratto ti interessa simulare?' },
        { role: 'user', content: 'Un contratto a tempo determinato nel settore commerciale.' }
      ]
    },
    {
      description: 'Scenario gestione dipendenti',
      messages: [
        { role: 'user', content: 'Mi serve uno scenario per simulare la gestione di un team di lavoro.' },
        { role: 'assistant', content: 'Quali aspetti della gestione vuoi trattare?' },
        { role: 'user', content: 'Valutazione delle performance e feedback costruttivo.' }
      ]
    }
  ];
  
  for (const testCase of testConversations) {
    try {
      log(`Testando generazione scenario: ${testCase.description}`, 'test');
      const start = Date.now();
      
      const scenario = await aiService.generateScenarioFromChat(testCase.messages);
      const duration = Date.now() - start;
      
      log(`Scenario generato in ${duration}ms per "${testCase.description}"`, 'success');
      saveTextToFile(
        JSON.stringify(scenario, null, 2), 
        `scenario-${testCase.description.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
      );
      
      // Verifica della struttura del risultato
      const requiredFields = ['title', 'description', 'roles', 'avatars'];
      const missingFields = requiredFields.filter(field => !scenario[field]);
      
      if (missingFields.length > 0) {
        log(`Lo scenario generato manca dei seguenti campi: ${missingFields.join(', ')}`, 'warning');
      } else {
        log(`Struttura dello scenario verificata: tutti i campi richiesti sono presenti`, 'success');
      }
      
      log(`Test generazione scenario "${testCase.description}" completato con successo`, 'success');
    } catch (error) {
      log(`Errore nel test di generazione scenario "${testCase.description}": ${error.message}`, 'error');
    }
  }
}

// Esegui tutti i test in sequenza
async function runAllTests() {
  log('=== INIZIO SUITE DI TEST SERVIZI AI ===', 'start');
  log(`Data e ora inizio: ${new Date().toString()}`, 'info');
  
  try {
    await testTextGeneration();
    await testTTS();
    await testScenarioGeneration();
    
    log('=== FINE SUITE DI TEST SERVIZI AI ===', 'end');
    log('Tutti i test sono stati completati.', 'info');
    log(`I risultati sono disponibili nella cartella: ${TEST_OUTPUT_DIR}`, 'info');
  } catch (error) {
    log(`Errore critico nell'esecuzione dei test: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
  }
}

// Esegui i test
runAllTests().catch(err => {
  log(`Errore fatale: ${err.message}`, 'error');
  console.error(err);
});

// Esponiamo le funzioni per poterle chiamare dal file batch
export {
  testTextGeneration,
  testTTS,
  testScenarioGeneration,
  runAllTests
};
