/**
 * Script per il backup dei dati critici dal database Supabase
 * Da eseguire prima del reset del database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente del modulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Credenziali Supabase
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

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

// Funzione per il backup di una tabella
async function backupTable(supabase, tableName, backupDir) {
  try {
    logger.info(`Backup della tabella '${tableName}'...`);
    
    // Recupera tutti i dati dalla tabella
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      logger.info(`Tabella '${tableName}' vuota, nessun dato da salvare.`);
      return;
    }
    
    // Salva i dati in un file JSON
    const backupFile = path.join(backupDir, `${tableName}_backup.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    
    logger.success(`Backup di ${data.length} record dalla tabella '${tableName}' completato!`);
    logger.info(`File salvato: ${backupFile}`);
    
    return data.length;
  } catch (error) {
    logger.error(`Errore nel backup della tabella '${tableName}': ${error.message}`);
    return 0;
  }
}

// Funzione principale
async function backupDatabase() {
  logger.section('BACKUP DATI DATABASE SUPABASE');
  
  // Crea client Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Crea directory per i backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups', timestamp);
  
  try {
    // Crea directory se non esiste
    fs.mkdirSync(backupDir, { recursive: true });
    logger.info(`Directory backup creata: ${backupDir}`);
    
    // Lista delle tabelle da includere nel backup
    const tables = [
      'users',
      'auth_sessions',
      'failed_login_attempts',
      'user_settings',
      'documents',
      'scenarios',
      'courses',
      'course_progress',
      'certificates',
      'simulations'
    ];
    
    let totalRecords = 0;
    const backupResults = {};
    
    // Backup di ogni tabella
    for (const table of tables) {
      const recordsCount = await backupTable(supabase, table, backupDir);
      totalRecords += recordsCount || 0;
      backupResults[table] = recordsCount || 0;
    }
    
    // Backup delle tabelle di sistema (metadata)
    logger.info('Tentativo di recupero metadati sugli utenti da auth.users...');
    
    try {
      // Usa una query SQL per ottenere dati da auth.users
      const { data: authUsers, error: authError } = await supabase.rpc('', {}, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'params=single-object',
          'Raw-Query': `
            SELECT id, email, raw_user_meta_data, created_at
            FROM auth.users
            LIMIT 1000;
          `
        }
      });
      
      if (authError) {
        logger.error(`Impossibile recuperare dati da auth.users: ${authError.message}`);
      } else if (authUsers) {
        const authUsersFile = path.join(backupDir, 'auth_users_backup.json');
        fs.writeFileSync(authUsersFile, JSON.stringify(authUsers, null, 2));
        logger.success(`Backup di ${authUsers.length} utenti da auth.users completato!`);
        backupResults['auth.users'] = authUsers.length;
        totalRecords += authUsers.length;
      }
    } catch (error) {
      logger.error(`Errore nel recupero dati auth.users: ${error.message}`);
    }
    
    // Salva il riepilogo del backup
    const summaryFile = path.join(backupDir, 'backup_summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalRecords,
      tables: backupResults
    }, null, 2));
    
    // Crea uno script per il ripristino
    const restoreScript = `
    import { createClient } from '@supabase/supabase-js';
    import fs from 'fs';
    import path from 'path';
    
    // Credenziali Supabase
    const SUPABASE_URL = '${SUPABASE_URL}';
    const SUPABASE_SERVICE_KEY = '${SUPABASE_SERVICE_KEY}';
    
    // Percorso dei file di backup
    const BACKUP_DIR = '${backupDir}';
    
    // Funzione principale
    async function restoreDatabase() {
      console.log('Ripristino dati da backup...');
      
      // Crea client Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      ${tables.map(table => `
      // Ripristino tabella ${table}
      try {
        const backupFile = path.join(BACKUP_DIR, '${table}_backup.json');
        if (fs.existsSync(backupFile)) {
          const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
          if (data && data.length > 0) {
            console.log(\`Ripristino di \${data.length} record nella tabella '${table}'...\`);
            const { error } = await supabase.from('${table}').insert(data);
            if (error) {
              console.error(\`Errore nel ripristino della tabella '${table}': \${error.message}\`);
            } else {
              console.log(\`Tabella '${table}' ripristinata con successo!\`);
            }
          }
        }
      } catch (error) {
        console.error(\`Errore nel ripristino della tabella '${table}': \${error.message}\`);
      }
      `).join('\n')}
      
      console.log('Ripristino completato!');
    }
    
    // Esegui il ripristino
    restoreDatabase().catch(error => {
      console.error('Errore durante il ripristino:', error);
    });
    `;
    
    const restoreScriptFile = path.join(backupDir, 'restore_backup.js');
    fs.writeFileSync(restoreScriptFile, restoreScript);
    
    logger.section('RIEPILOGO BACKUP');
    logger.success(`Backup completato! Salvati ${totalRecords} record in totale.`);
    logger.info(`Directory: ${backupDir}`);
    logger.info('File di riepilogo: backup_summary.json');
    logger.info('Script di ripristino: restore_backup.js');
    
    // Restituisci il percorso del backup
    return { backupDir, totalRecords };
  } catch (error) {
    logger.error(`Errore durante il backup: ${error.message}`);
    throw error;
  }
}

// Esegui il backup
backupDatabase().catch(error => {
  logger.error(`Errore fatale: ${error.message}`);
  process.exit(1);
});
