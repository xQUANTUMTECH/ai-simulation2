import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea una connessione al database
const dbPath = path.join(__dirname, '../../database.sqlite');

// Verifica se il file database esiste già
const dbExists = fs.existsSync(dbPath);

// Crea una nuova connessione
const db = new (sqlite3.verbose().Database)(dbPath);

// Funzione per inizializzare tutte le tabelle del database
const initFullDatabaseSchema = () => {
  console.log('Creazione dello schema completo del database SQLite...');
  
  db.serialize(() => {
    // Abilita foreign keys
    db.run('PRAGMA foreign_keys = ON;');
    
    // Tabelle principali utente
    console.log('Creazione tabelle utente...');
    
// Tabella users
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    account_status TEXT DEFAULT 'active',
    role TEXT DEFAULT 'USER',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
    
    // Tabella auth_sessions
    db.run(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Tabella failed_login_attempts
    db.run(`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT
      )
    `);
    
    // Tabella user_settings
    db.run(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        theme TEXT DEFAULT 'light',
        notifications_enabled BOOLEAN DEFAULT 1,
        language TEXT DEFAULT 'it',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Tabelle di contenuto
    console.log('Creazione tabelle di contenuto...');
    
    // Tabella documents
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        document_type TEXT,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Tabella scenarios
    db.run(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        difficulty TEXT,
        created_by TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    
    // Tabella courses
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructor_id TEXT,
        is_published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id)
      )
    `);
    
// Tabella activities per il registro delle attività
db.run(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('user', 'course', 'video', 'document', 'certificate', 'alert', 'admin', 'system')),
    message TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    user_id TEXT,
    related_id TEXT,
    importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Tabella activity_reads per tracciare le attività lette
db.run(`
  CREATE TABLE IF NOT EXISTS activity_reads (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    read_at DATETIME,
    UNIQUE(activity_id, user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Tabella system_alerts per gli avvisi di sistema
db.run(`
  CREATE TABLE IF NOT EXISTS system_alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    message TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    category TEXT NOT NULL CHECK (
      category IN (
        'system', 'security', 'performance', 'storage', 'network',
        'application', 'database', 'user', 'content', 'ai'
      )
    ),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by TEXT,
    auto_resolve INTEGER NOT NULL DEFAULT 0,
    resolve_by DATETIME,
    assigned_to TEXT,
    source TEXT,
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  )
`);

// Simulazione storage bucket (tabella per tracciare i file)
console.log('Creazione tabella storage...');

db.run(`
  CREATE TABLE IF NOT EXISTS storage_files (
    id TEXT PRIMARY KEY,
    bucket_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    content_type TEXT,
    size INTEGER,
    owner_id TEXT,
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )
`);

    console.log('Schema del database creato con successo!');
    
    // Se il database è appena stato creato, inserisci alcuni dati di esempio
    if (!dbExists) {
      console.log('Inserimento dati di esempio...');
      
    // Utente admin di esempio
    db.run(`
      INSERT INTO users (id, email, username, account_status, role)
      VALUES ('admin_user_123', 'admin@example.com', 'admin', 'active', 'ADMIN')
    `);
    
    // Utente normale di esempio
    db.run(`
      INSERT INTO users (id, email, username, account_status, role)
      VALUES ('test_user_456', 'user@example.com', 'test_user', 'active', 'USER')
    `);
      
      // Documento di esempio
      db.run(`
        INSERT INTO documents (id, user_id, title, content, document_type, status)
        VALUES (
          'doc_789', 
          'admin_user_123', 
          'Documento di benvenuto', 
          'Benvenuto alla Cafasso AI Academy! Questo è un documento di esempio.',
          'text',
          'published'
        )
      `);
      
      // Scenario di esempio
      db.run(`
        INSERT INTO scenarios (id, title, description, difficulty, created_by)
        VALUES (
          'scenario_101', 
          'Scenario di test', 
          'Uno scenario di esempio per testare le funzionalità',
          'principiante',
          'admin_user_123'
        )
      `);
      
      console.log('Dati di esempio inseriti con successo!');
    }
  });
};

// Funzione per chiudere la connessione
const closeDatabase = () => {
  db.close((err) => {
    if (err) {
      console.error('Errore durante la chiusura del database:', err);
    } else {
      console.log('Connessione al database chiusa');
    }
  });
};

// Esegui l'inizializzazione
initFullDatabaseSchema();

// Gestisci la chiusura pulita
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

export {
  db,
  closeDatabase
};
