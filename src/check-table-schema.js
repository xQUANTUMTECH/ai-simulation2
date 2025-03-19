import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Percorso del database
const dbPath = path.join(__dirname, '../database.sqlite');

// Crea una connessione al database
const db = new (sqlite3.verbose().Database)(dbPath);

// Verifica struttura della tabella auth_sessions
db.all('PRAGMA table_info(auth_sessions)', (err, columns) => {
  if(err) {
    console.error('Errore:', err);
  } else {
    console.log('Colonne nella tabella auth_sessions:');
    columns.forEach(c => console.log(` - ${c.name} (${c.type})`));
  }
  
  // Chiudi la connessione al database
  db.close();
});
