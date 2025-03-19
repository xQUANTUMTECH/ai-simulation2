import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea una connessione al database
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new (sqlite3.verbose().Database)(dbPath);

// Inizializza il database con le tabelle necessarie
const initDatabase = () => {
  db.serialize(() => {
    // Crea la tabella users
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crea la tabella documents
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Crea la tabella courses
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database inizializzato con successo!');
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
initDatabase();

// Gestisci la chiusura pulita
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

export {
  db,
  closeDatabase
};
