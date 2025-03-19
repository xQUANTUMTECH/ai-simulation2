/**
 * Script per testare la connessione al database Supabase e diagnosi problemi
 * Utilizza sia metodi di connessione diretta che il CLI Supabase quando disponibile
 */

const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurazione
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const LOG_DIR = './logs';

// Assicurati che la directory dei log esista
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFile = path.join(LOG_DIR, `db-connection-test-${new Date().toISOString().replace(/:/g, '-')}.log`);

// Utility per il logging
const logger = {
  info: (message) => {
    const logMessage = `[INFO][${new Date().toISOString()}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
  },
  error: (message, error) => {
    const errorDetails = error ? `\n${error.stack || error}` : '';
    const logMessage = `[ERROR][${new Date().toISOString()}] ${message}${errorDetails}`;
    console.error(logMessage);
    fs.appendFileSync(logFile, logMessage + '\n');
  },
  success: (message) => {
    const logMessage = `[SUCCESS][${new Date().toISOString()}] ${message}`;
    console.log('\x1b[32m%s\x1b[0m', logMessage); // verde
    fs.appendFileSync(logFile, logMessage + '\n');
  },
  warn: (message) => {
    const logMessage = `[WARNING][${new Date().toISOString()}] ${message}`;
    console.log('\x1b[33m%s\x1b[0m', logMessage); // giallo
    fs.appendFileSync(logFile, logMessage + '\n');
  }
};

// Test connessione diretta al database con JS client
async function testJsClient() {
  logger.info('Test connessione con client JavaScript...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('Credenziali Supabase mancanti nelle variabili di ambiente!');
    return { connected: false, error: 'Credenziali mancanti' };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test della connessione con una query leggera
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      logger.error(`Errore nella query: ${error.message}`, error);
      return { connected: false, error: error.message };
    }
    
    logger.success('Connessione JavaScript riuscita!');
    return { connected: true };
  } catch (error) {
    logger.error('Errore nella connessione JavaScript:', error);
    return { connected: false, error: error.message };
  }
}

// Test con client autenticato con chiave di servizio
async function testServiceRoleClient() {
  logger.info('Test connessione con client Service Role...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Chiave di servizio Supabase mancante nelle variabili di ambiente!');
    return { connected: false, error: 'Chiave di servizio mancante' };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test della connessione con una query amministrativa
    const { data, error } = await supabase.from('pg_stat_activity').select('count').limit(1);
    
    if (error) {
      logger.error(`Errore nella query con service role: ${error.message}`, error);
      return { connected: false, error: error.message };
    }
    
    logger.success('Connessione con chiave di servizio riuscita!');
    return { connected: true };
  } catch (error) {
    logger.error('Errore nella connessione con chiave di servizio:', error);
    return { connected: false, error: error.message };
  }
}

// Test utilizzando il CLI di Supabase
function testSupabaseCLI() {
  logger.info('Test connessione con Supabase CLI...');
  
  try {
    // Verifica se il CLI è installato
    const versionResult = spawnSync('supabase', ['--version'], { encoding: 'utf8' });
    
    if (versionResult.error) {
      logger.warn('Supabase CLI non trovato o non accessibile nel PATH');
      return { connected: false, error: 'CLI non disponibile' };
    }
    
    // Esegui una diagnostica del database
    const inspectResult = spawnSync('supabase', ['db', 'lint', '--linked'], { encoding: 'utf8' });
    
    if (inspectResult.status !== 0) {
      logger.error(`Errore nell'esecuzione di 'supabase db lint': ${inspectResult.stderr}`);
      return { connected: false, error: inspectResult.stderr };
    }
    
    logger.success('Test CLI completato con successo!');
    return { connected: true, output: inspectResult.stdout };
  } catch (error) {
    logger.error('Errore nell\'esecuzione del CLI Supabase:', error);
    return { connected: false, error: error.message };
  }
}

// Funzione principale
async function runTests() {
  logger.info('Inizio diagnostica connessione database...');
  logger.info(`URL: ${supabaseUrl}`);
  
  // Array per memorizzare i risultati dei test
  const results = [];
  
  // Test del client JavaScript standard
  results.push({
    test: 'Client JavaScript',
    result: await testJsClient()
  });
  
  // Test del client con chiave di servizio
  results.push({
    test: 'Client con chiave di servizio',
    result: await testServiceRoleClient()
  });
  
  // Test con il CLI di Supabase
  results.push({
    test: 'Supabase CLI',
    result: testSupabaseCLI()
  });
  
  // Riepilogo dei risultati
  logger.info('\n===== RIEPILOGO TEST CONNESSIONE DATABASE =====');
  
  let successCount = 0;
  for (const { test, result } of results) {
    if (result.connected) {
      logger.success(`✅ ${test}: SUCCESSO`);
      successCount++;
    } else {
      logger.error(`❌ ${test}: FALLITO - ${result.error}`);
    }
  }
  
  logger.info(`\nTest completati: ${successCount}/${results.length} test riusciti`);
  logger.info(`Log dei test salvati in: ${logFile}`);
  
  if (successCount === results.length) {
    logger.success('TUTTI I TEST CONNESSIONE RIUSCITI! 🎉');
  } else {
    logger.warn(`ATTENZIONE: ${results.length - successCount} test falliti. Controlla i dettagli nel log.`);
  }
  
  return {
    success: successCount === results.length,
    results,
    logFile
  };
}

// Esporta le funzioni per l'uso in altri moduli
module.exports = {
  testJsClient,
  testServiceRoleClient,
  testSupabaseCLI,
  runTests
};

// Esegui i test se questo script viene eseguito direttamente
if (require.main === module) {
  runTests()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('Errore fatale durante l\'esecuzione dei test', error);
      process.exit(1);
    });
}
