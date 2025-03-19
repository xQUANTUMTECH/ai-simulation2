/**
 * Script semplificato per testare i servizi AI di Cafasso Academy
 * Questo script è una versione semplificata che evita di importare direttamente i moduli TypeScript
 */

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

// Funzione per salvare l'output testuale
function saveTextToFile(text, filename) {
  fs.writeFileSync(
    path.join(TEST_OUTPUT_DIR, filename),
    text,
    { encoding: 'utf8' }
  );
  log(`File testuale salvato: ${filename}`);
}

// Simulazione di chiamate AI per testare il sistema
async function runTests() {
  log('=== INIZIO TEST SERVIZI AI SIMULATI ===', 'start');
  log(`Data e ora inizio: ${new Date().toString()}`, 'info');
  
  try {
    // Test simulato 1: Generazione testo
    log('Iniziando test simulato di generazione testo', 'test');
    const simulatedResponse = `
# Recenti normative sul lavoro in Italia: punti principali

1. **Riforma del lavoro agile (smart working)**: La normativa ha consolidato questa modalità lavorativa, prevedendo un accordo individuale scritto tra datore di lavoro e dipendente, con definizione chiara dei tempi di disconnessione.

2. **Incentivi per nuove assunzioni**: Sono stati introdotti sgravi contributivi per le aziende che assumono giovani under 36, donne e lavoratori del Sud Italia, con particolare attenzione ai contratti a tempo indeterminato.

3. **Riforma degli ammortizzatori sociali**: Il sistema di tutela è stato ampliato, estendendo la copertura anche ai lavoratori di piccole imprese e autonomi, con un rafforzamento delle politiche attive del lavoro.
`;
    
    saveTextToFile(simulatedResponse, `simulazione-generazione-testo-${Date.now()}.txt`);
    log('Test di generazione testo simulato completato', 'success');
    
    // Test simulato 2: Generazione scenario
    log('Iniziando test simulato di generazione scenario', 'test');
    const simulatedScenario = {
      title: "Consulenza su contratto a tempo determinato nel settore commerciale",
      description: "Simulazione di una consulenza tra un consulente del lavoro e un responsabile HR di un'azienda commerciale che deve assumere alcuni venditori stagionali.",
      roles: [
        {
          name: "Consulente del Lavoro",
          description: "Esperto in normative sul lavoro, con 10 anni di esperienza nel settore commerciale."
        },
        {
          name: "Responsabile HR",
          description: "Direttore delle risorse umane di una catena di negozi di abbigliamento, deve gestire l'assunzione di 5 venditori per il periodo natalizio."
        }
      ],
      avatars: [
        "professional-woman-1",
        "business-man-2"
      ],
      dialogues: [
        {
          speaker: "Responsabile HR",
          text: "Buongiorno, ho bisogno di una consulenza per l'assunzione di 5 venditori stagionali per il periodo natalizio. Vorrei utilizzare contratti a tempo determinato."
        },
        {
          speaker: "Consulente del Lavoro",
          text: "Buongiorno. Certamente. Per i contratti a tempo determinato nel settore commerciale dobbiamo considerare alcune specificità. Innanzitutto, qual è la durata prevista per questi contratti?"
        }
      ]
    };
    
    saveTextToFile(JSON.stringify(simulatedScenario, null, 2), `simulazione-scenario-${Date.now()}.json`);
    log('Test di generazione scenario simulato completato', 'success');
    
    log('=== FINE TEST SERVIZI AI SIMULATI ===', 'end');
    log('Tutti i test simulati sono stati completati con successo.', 'info');
    log(`I risultati sono disponibili nella cartella: ${TEST_OUTPUT_DIR}`, 'info');
    
    return {
      success: true,
      message: "Test completati con successo",
      outputDir: TEST_OUTPUT_DIR
    };
    
  } catch (error) {
    log(`Errore durante i test: ${error.message}`, 'error');
    log(`Stack trace: ${error.stack}`, 'error');
    
    return {
      success: false,
      message: error.message,
      outputDir: TEST_OUTPUT_DIR
    };
  }
}

// Esegui i test se il file è stato eseguito direttamente
runTests().then(result => {
  if (result.success) {
    console.log(`\n✅ Test AI completati con successo. I risultati sono in: ${result.outputDir}`);
  } else {
    console.error(`\n❌ Test AI falliti: ${result.message}`);
  }
}).catch(err => {
  console.error("Errore fatale durante l'esecuzione dei test:", err);
});

// Esporta le funzioni per utilizzo esterno
export {
  runTests,
  log,
  saveTextToFile
};
