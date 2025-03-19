/**
 * Script per importare dati in Supabase utilizzando diverse metodologie
 * basate sulla documentazione ufficiale Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawnSync } from 'child_process';
import { dbConnection } from './src/services/db-connection.js';

// Ottieni il percorso corrente del modulo in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Credenziali Supabase da SUPABASE_CREDENTIALS.md
const SUPABASE_URL = 'https://twusehwykpemphqtxlrx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';
const PROJECT_REF = 'twusehwykpemphqtxlrx';

// Utility per il logging
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERRORE: ${message}`);
    if (error) {
      console.error(error.stack || error);
    }
  },
  success: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`);
  },
  warning: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ⚠️ ${message}`);
  }
};

/**
 * Importa dati in Supabase utilizzando la Supabase API (metodo programmatico)
 * Ideale per piccoli set di dati o importazioni automatizzate
 * @param {string} tableName - Nome della tabella in cui importare i dati
 * @param {Array} data - Array di oggetti da inserire nella tabella
 * @param {boolean} useServiceRole - Se true, usa il service role token per bypass RLS
 * @returns {Promise<Object>} - Risultato dell'operazione di inserimento
 */
async function importDataViaApi(tableName, data, useServiceRole = false) {
  logger.log(`Importazione dati via API nella tabella '${tableName}'...`);
  
  try {
    // Scegli il token appropriato in base alle necessità
    const authToken = useServiceRole ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
    
    // Crea un client Supabase (preferibilmente usa il servizio centralizzato in produzione)
    const supabase = createClient(SUPABASE_URL, authToken);
    
    // Verifica la connessione
    const { error: connectionError } = await supabase.from('_dummy_query').select('count').limit(1).catch(() => ({ error: true }));
    if (connectionError) {
      throw new Error('Impossibile connettersi al database Supabase. Verifica le credenziali e la connettività.');
    }
    
    // Esegui l'inserimento in batch per evitare problemi con dataset di grandi dimensioni
    const BATCH_SIZE = 1000; // Dimensione massima consigliata per batch
    const batches = [];
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }
    
    logger.log(`Importazione suddivisa in ${batches.length} batch.`);
    
    let insertedRows = 0;
    let errors = [];
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.log(`Elaborazione batch ${i+1}/${batches.length} (${batch.length} righe)...`);
      
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();
      
      if (error) {
        errors.push(error);
        logger.error(`Errore nel batch ${i+1}: ${error.message}`, error);
      } else {
        insertedRows += insertedData?.length || 0;
        logger.success(`Batch ${i+1} completato: ${insertedData?.length || 0} righe inserite.`);
      }
    }
    
    return {
      success: errors.length === 0,
      insertedRows,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    logger.error('Errore nell\'importazione dati via API:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Prepara un file CSV da dati JavaScript e lo importa utilizzando il comando COPY di Postgres
 * Metodo ottimale per grandi dataset
 * @param {string} tableName - Nome della tabella in cui importare i dati
 * @param {Array} data - Array di oggetti da inserire nella tabella
 * @param {Array} columns - Array di nomi di colonne nell'ordine desiderato
 * @returns {Promise<Object>} - Risultato dell'operazione di importazione
 */
async function importViaPgCopy(tableName, data, columns) {
  logger.log(`Importazione dati via comando COPY PostgreSQL nella tabella '${tableName}'...`);
  
  const tempDir = path.join(__dirname, 'temp');
  const csvFilePath = path.join(tempDir, `${tableName}_import.csv`);
  
  try {
    // Crea la directory temporanea se non esiste
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Converte i dati in formato CSV
    logger.log('Preparazione del file CSV...');
    
    // Scrivi l'intestazione delle colonne
    let csvContent = columns.join(',') + '\n';
    
    // Aggiungi le righe di dati
    for (const row of data) {
      const csvRow = columns.map(col => {
        const value = row[col];
        
        // Gestione di valori nulli, stringhe con virgole e caratteri speciali
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'string') {
          // Metti le stringhe tra virgolette e gestisci le virgolette nei dati
          return `"${value.replace(/"/g, '""')}"`;
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else {
          return String(value);
        }
      }).join(',');
      
      csvContent += csvRow + '\n';
    }
    
    // Scrivi il file CSV
    fs.writeFileSync(csvFilePath, csvContent);
    logger.success(`File CSV creato con successo: ${csvFilePath}`);
    
    // Importa il file CSV usando psql e il comando COPY
    // NOTA: Richiede che l'utente abbia psql installato localmente
    logger.log('Esecuzione comando COPY tramite psql...');
    
    // Preparazione del comando COPY
    const copyCommand = `\\COPY ${tableName} (${columns.join(',')}) FROM '${csvFilePath.replace(/\\/g, '\\\\')}' WITH DELIMITER ',' CSV HEADER`;
    
    // Costruisci il comando psql
    const psqlCommand = [
      'psql',
      `-h ${SUPABASE_URL.replace('https://', '')}`,
      '-p 5432',
      '-d postgres',
      `-U postgres`,
      `-c "${copyCommand}"`
    ].join(' ');
    
    // Esecuzione del comando
    const result = spawnSync(psqlCommand, {
      shell: true,
      env: {
        ...process.env,
        PGPASSWORD: 'YOUR_DB_PASSWORD' // Questo va sostituito con la password effettiva
      }
    });
    
    // Verifica il risultato
    if (result.error) {
      throw new Error(`Errore nell'esecuzione del comando psql: ${result.error.message}`);
    }
    
    if (result.status !== 0) {
      throw new Error(`Comando psql fallito con codice di uscita ${result.status}: ${result.stderr.toString()}`);
    }
    
    // Pulizia del file temporaneo
    fs.unlinkSync(csvFilePath);
    logger.success('Importazione completata con successo tramite COPY!');
    
    return {
      success: true,
      output: result.stdout.toString()
    };
  } catch (error) {
    logger.error('Errore nell\'importazione dati via COPY:', error);
    
    // Pulizia del file temporaneo in caso di errore
    try {
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
    } catch (e) {
      logger.warning(`Non è stato possibile eliminare il file temporaneo ${csvFilePath}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Importa dati tramite la CLI di Supabase utilizzando dump SQL
 * Utile per importazioni complete del database o ripristini
 * @param {string} sqlFilePath - Percorso al file SQL da importare
 * @returns {Promise<Object>} - Risultato dell'operazione di importazione
 */
async function importViaSupabaseCli(sqlFilePath) {
  logger.log(`Importazione dati via Supabase CLI dal file '${sqlFilePath}'...`);
  
  try {
    // Verifica se il file SQL esiste
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Il file SQL '${sqlFilePath}' non esiste.`);
    }
    
    // Esegui il comando supabase db push per applicare il file SQL
    logger.log('Esecuzione comando supabase db push...');
    
    const result = spawnSync('supabase', ['db', 'push', '--linked', '--db-url', `postgresql://postgres:postgres@${SUPABASE_URL.replace('https://', '')}:5432/postgres`], {
      shell: true
    });
    
    // Verifica il risultato
    if (result.error) {
      throw new Error(`Errore nell'esecuzione del comando Supabase CLI: ${result.error.message}`);
    }
    
    if (result.status !== 0) {
      throw new Error(`Comando Supabase CLI fallito con codice di uscita ${result.status}: ${result.stderr.toString()}`);
    }
    
    logger.success('Importazione completata con successo tramite Supabase CLI!');
    
    return {
      success: true,
      output: result.stdout.toString()
    };
  } catch (error) {
    logger.error('Errore nell\'importazione dati via Supabase CLI:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Esempi di utilizzo delle funzioni di importazione
 */
async function runExamples() {
  logger.log('=== ESEMPI DI IMPORTAZIONE DATI IN SUPABASE ===');
  
  // Dati di esempio
  const sampleUsers = [
    { username: 'mario.rossi', email: 'mario.rossi@example.com', role: 'user' },
    { username: 'laura.bianchi', email: 'laura.bianchi@example.com', role: 'admin' },
    { username: 'giuseppe.verdi', email: 'giuseppe.verdi@example.com', role: 'user' }
  ];
  
  // Esempio 1: Importazione tramite API
  logger.log('\n1. Importazione tramite API Supabase');
  const apiResult = await importDataViaApi('users', sampleUsers, true);
  console.log('Risultato:', apiResult);
  
  // Esempio 2: Importazione tramite COPY
  logger.log('\n2. Importazione tramite comando COPY PostgreSQL');
  const copyResult = await importViaPgCopy('users', sampleUsers, ['username', 'email', 'role']);
  console.log('Risultato:', copyResult);
  
  // Esempio 3: Importazione tramite Supabase CLI
  logger.log('\n3. Importazione tramite Supabase CLI');
  const cliResult = await importViaSupabaseCli('./supabase/migrations/example_migration.sql');
  console.log('Risultato:', cliResult);
}

// Esporta le funzioni per l'uso in altri moduli
export {
  importDataViaApi,
  importViaPgCopy,
  importViaSupabaseCli
};

// Se eseguito direttamente, esegui gli esempi
if (import.meta.url === `file://${__filename}`) {
  runExamples()
    .catch(error => {
      logger.error('Errore nell\'esecuzione degli esempi:', error);
      process.exit(1);
    });
}
