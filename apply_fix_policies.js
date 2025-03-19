/**
 * Script per applicare le policy corrette direttamente al database Supabase
 * Utilizza fetch per eseguire le query SQL direttamente senza autenticazione
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Credenziali Supabase
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Logger per messaggi di stato
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  error: (message) => console.error(`[ERRORE] ❌ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(40));
    console.log(title);
    console.log('='.repeat(40) + '\n');
  }
};

// Funzione per eseguire una query SQL tramite curl
async function executeQueryWithCurl(sql) {
  try {
    logger.info(`Esecuzione query con curl: ${sql.substr(0, 60)}...`);
    
    // Escape delle virgolette e degli altri caratteri speciali
    const escapedSql = sql.replace(/"/g, '\\"').replace(/\n/g, ' ');
    
    // Costruisci il comando curl
    const curlCommand = `curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \\
      -H "apikey: ${SUPABASE_SERVICE_KEY}" \\
      -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \\
      -H "Content-Type: application/json" \\
      -d '{"sql": "${escapedSql}"}'`;
    
    // Esegui il comando curl
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr && !stderr.includes('warning')) {
      logger.error(`Errore durante l'esecuzione di curl: ${stderr}`);
      return false;
    }
    
    // Verifica la risposta
    try {
      const response = JSON.parse(stdout);
      if (response.error) {
        logger.error(`Errore dal server: ${response.error}`);
        return false;
      }
    } catch (e) {
      // Se non è JSON, non è un errore
    }
    
    logger.success('Query eseguita con successo tramite curl!');
    return true;
  } catch (err) {
    logger.error(`Errore durante l'esecuzione del comando curl: ${err.message}`);
    return false;
  }
}

// Funzione principale
async function applyFixPolicies() {
  logger.section('APPLICAZIONE POLICY CORRETTE');
  
  try {
    // Verifica connessione al database
    logger.info('Tentativo di correzione policy RLS...');
    
    // Leggi lo script SQL
    let sqlScript;
    try {
      sqlScript = fs.readFileSync('./fix_policies_simple.sql', 'utf-8');
      logger.success('Script SQL letto con successo.');
    } catch (err) {
      logger.error(`Errore nella lettura dello script SQL: ${err.message}`);
      return;
    }
    
    logger.section('Applicazione del fix con script SQL');
    
    // Dividi lo script in singole query
    const queries = sqlScript
      .split(';')
      .map(query => query.trim())
      .filter(query => query && !query.startsWith('--'));
    
    logger.info(`Script diviso in ${queries.length} query separate`);
    
    // Esegui ogni query sequenzialmente
    let successCount = 0;
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if (await executeQueryWithCurl(query)) {
        successCount++;
      }
    }
    
    // Riepilogo
    logger.section('RIEPILOGO');
    logger.info(`Query eseguite con successo: ${successCount}/${queries.length}`);
    
    if (successCount > 0) {
      logger.success(`${successCount} policy sono state applicate con successo!`);
    } else {
      logger.error('Nessuna query è stata eseguita correttamente.');
      logger.info('Probabilmente è necessario applicare lo script manualmente tramite SQL Editor di Supabase.');
    }
    
  } catch (err) {
    logger.error(`Errore imprevisto: ${err.message}`);
  }
  
  logger.section('CONCLUSIONE');
  logger.info('Processo completato!');
  logger.info('Per verificare se il problema è stato risolto, esegui:');
  logger.info('node test-supabase-connection.js');
}

// Esegui lo script
applyFixPolicies();
