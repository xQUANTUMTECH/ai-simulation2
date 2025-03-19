import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sqlite3 from 'sqlite3';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Percorso del database e directory di storage
const dbPath = path.join(__dirname, '../database.sqlite');
const storageDir = path.join(__dirname, '../storage');

// Array di bucket da creare
const requiredBuckets = [
  'documents',       // Documenti generici
  'quiz_files',      // File relativi ai quiz
  'simulations',     // File per le simulazioni
  'avatars',         // Immagini degli avatar
  'videos',          // Video didattici
  'thumbnails',      // Miniature per video e altri contenuti
  'profile_images',  // Immagini del profilo utente
  'course_resources', // Risorse dei corsi
  'scenario_assets', // Asset per gli scenari
  'ai_outputs',      // Output generati dall'AI
  'certificates',    // Certificati degli utenti
  'temp'             // File temporanei
];

// Crea una connessione al database
const db = new (sqlite3.verbose().Database)(dbPath);

/**
 * Crea un bucket di storage sia nella tabella che nel filesystem
 * @param {string} bucketName - Nome del bucket da creare
 * @param {boolean} isPublic - Se il bucket è pubblico (true) o privato (false)
 * @returns {Promise<void>}
 */
function createBucket(bucketName, isPublic = false) {
  return new Promise((resolve, reject) => {
    console.log(`Creazione bucket "${bucketName}"...`);
    
    // Crea la directory del bucket se non esiste
    const bucketDir = path.join(storageDir, bucketName);
    if (!fs.existsSync(bucketDir)) {
      fs.mkdirSync(bucketDir, { recursive: true });
      console.log(`- Directory "${bucketDir}" creata`);
    } else {
      console.log(`- Directory "${bucketDir}" già esistente`);
    }
    
    // Verifica se il bucket esiste già nel database
    db.get(
      'SELECT id FROM storage_buckets WHERE name = ?',
      [bucketName],
      (err, row) => {
        if (err) {
          console.error(`Errore durante la verifica del bucket "${bucketName}":`, err.message);
          reject(err);
          return;
        }
        
        if (row) {
          console.log(`- Bucket "${bucketName}" già esistente nel database (ID: ${row.id})`);
          resolve();
          return;
        }
        
        // Inserisci il bucket nel database
        const bucketId = `bucket_${bucketName}`;
        const createdAt = new Date().toISOString();
        
        db.run(
          `INSERT INTO storage_buckets (id, name, created_at, updated_at, public) 
           VALUES (?, ?, ?, ?, ?)`,
          [bucketId, bucketName, createdAt, createdAt, isPublic ? 1 : 0],
          function(err) {
            if (err) {
              console.error(`Errore durante l'inserimento del bucket "${bucketName}":`, err.message);
              reject(err);
              return;
            }
            
            console.log(`- Bucket "${bucketName}" aggiunto al database (ID: ${bucketId})`);
            resolve();
          }
        );
      }
    );
  });
}

/**
 * Crea tutti i bucket necessari
 */
async function createAllBuckets() {
  console.log('===== CREAZIONE BUCKET DI STORAGE =====\n');
  
  // Verifica se la tabella storage_buckets esiste
  db.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='storage_buckets'",
    async (err, table) => {
      if (err) {
        console.error('Errore durante la verifica della tabella storage_buckets:', err.message);
        db.close();
        return;
      }
      
      if (!table) {
        console.log('Tabella storage_buckets non trovata. Creazione della tabella...');
        
        // Crea la tabella storage_buckets
        db.run(`
          CREATE TABLE storage_buckets (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            public INTEGER DEFAULT 0
          )
        `, async (err) => {
          if (err) {
            console.error('Errore durante la creazione della tabella storage_buckets:', err.message);
            db.close();
            return;
          }
          
          console.log('Tabella storage_buckets creata con successo.');
          
          // Crea la tabella storage_files se non esiste
          db.run(`
            CREATE TABLE IF NOT EXISTS storage_files (
              id TEXT PRIMARY KEY,
              bucket_id TEXT REFERENCES storage_buckets(id),
              name TEXT NOT NULL,
              path TEXT NOT NULL,
              size INTEGER,
              mime_type TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              user_id TEXT,
              content_type TEXT,
              metadata TEXT
            )
          `, async (err) => {
            if (err) {
              console.error('Errore durante la creazione della tabella storage_files:', err.message);
              db.close();
              return;
            }
            
            console.log('Tabella storage_files creata con successo.');
            await processBuckets();
          });
        });
      } else {
        await processBuckets();
      }
    }
  );
  
  async function processBuckets() {
    // Crea la directory di storage principale se non esiste
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
      console.log(`Directory principale di storage creata: ${storageDir}`);
    } else {
      console.log(`Directory principale di storage già esistente: ${storageDir}`);
    }
    
    // Crea tutti i bucket
    try {
      for (const bucket of requiredBuckets) {
        // I bucket dei documenti, avatar e profili sono pubblici
        const isPublic = ['documents', 'avatars', 'profile_images', 'thumbnails'].includes(bucket);
        await createBucket(bucket, isPublic);
      }
      
      console.log('\nCreazione di tutti i bucket completata!');
      console.log(`\nBucket creati: ${requiredBuckets.length}`);
      console.log('Directory di storage: ' + storageDir);
      
      // Chiudi la connessione al database
      db.close();
    } catch (error) {
      console.error('Errore durante la creazione dei bucket:', error);
      db.close();
    }
  }
}

// Esegui la funzione principale
createAllBuckets();
