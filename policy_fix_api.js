/**
 * Script per applicare i fix delle policy RLS tramite API Supabase
 * Usa l'API Supabase per eseguire le query SQL di correzione
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Logger di utilità
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Recupera credenziali Supabase
function getSupabaseCredentials() {
  try {
    // Tenta di leggere da SUPABASE_CREDENTIALS.md
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const content = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      const urlMatch = content.match(/URL[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = content.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      
      if (urlMatch && serviceKeyMatch) {
        return {
          url: urlMatch[1],
          serviceKey: serviceKeyMatch[1]
        };
      }
    }
    
    // Fallback a valori predefiniti per test
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    logger.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Funzione per eseguire una query SQL tramite API Supabase
async function executeQuery(client, query) {
  try {
    // Prima prova con la funzione exec_sql se esiste
    try {
      const { data, error } = await client.rpc('exec_sql', { sql: query });
      
      if (!error) {
        return { success: true, data };
      }
    } catch (e) {
      // Ignora errori se la funzione non esiste
    }
    
    // Altrimenti usa una query raw
    const { error } = await client.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': query
      }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Funzione per applicare i fix delle policy
async function applyPolicyFixes() {
  logger.section('Applicazione fix policy RLS');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  logger.info(`URL Supabase: ${credentials.url}`);
  
  // Crea client con ruolo di servizio
  const supabase = createClient(credentials.url, credentials.serviceKey);
  
  // Leggi lo script SQL di correzione
  let sqlScript;
  try {
    sqlScript = fs.readFileSync('./fix_policies.sql', 'utf8');
  } catch (error) {
    logger.error(`Errore nella lettura dello script SQL: ${error.message}`);
    return false;
  }
  
  // Dividi lo script in singole query
  const queries = sqlScript
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0 && !q.startsWith('--'));
  
  logger.info(`Script SQL diviso in ${queries.length} query`);
  
  // Esegui le query una per una
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    
    // Ignora le query di SELECT per analisi
    if (query.toUpperCase().startsWith('SELECT')) {
      logger.info(`Saltando query di SELECT (${i + 1}/${queries.length})`);
      continue;
    }
    
    logger.info(`Esecuzione query ${i + 1}/${queries.length}: ${query.substring(0, 50)}...`);
    
    const { success, error } = await executeQuery(supabase, query);
    
    if (success) {
      successCount++;
      logger.success(`Query ${i + 1} eseguita con successo`);
    } else {
      errorCount++;
      logger.error(`Errore nell'esecuzione della query ${i + 1}: ${error}`);
    }
  }
  
  logger.section('Riepilogo operazioni');
  logger.info(`Query eseguite con successo: ${successCount}`);
  logger.info(`Query fallite: ${errorCount}`);
  
  if (errorCount === 0) {
    logger.success('Tutte le correzioni alle policy RLS sono state applicate con successo!');
    return true;
  } else {
    logger.error(`Si sono verificati ${errorCount} errori durante l'applicazione delle correzioni.`);
    logger.info('Puoi provare ad applicare manualmente le correzioni tramite SQL Editor di Supabase.');
    return false;
  }
}

// Esegui il fix delle policy
applyPolicyFixes().catch(error => {
  logger.error(`Errore imprevisto: ${error.message}`);
  process.exit(1);
});
