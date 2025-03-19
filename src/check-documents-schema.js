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

// Funzione per verificare la struttura della tabella documents
console.log('Verifico la struttura della tabella documents...');

db.all('PRAGMA table_info(documents)', (err, columns) => {
  if (err) {
    console.error('Errore:', err);
    return;
  }
  
  console.log('Colonne nella tabella documents:');
  columns.forEach(c => console.log(` - ${c.name} (${c.type})`));
  
  // Verifichiamo se manca la colonna created_by
  const hasCretedByColumn = columns.some(c => c.name === 'created_by');
  console.log(`\nLa colonna 'created_by' ${hasCretedByColumn ? 'esiste' : 'NON esiste'} nella tabella documents`);
  
  if (!hasCretedByColumn) {
    console.log('\nAggiunta della colonna created_by alla tabella documents...');
    
    db.run('ALTER TABLE documents ADD COLUMN created_by TEXT', function(err) {
      if (err) {
        console.error('Errore durante l\'aggiunta della colonna:', err.message);
      } else {
        console.log('Colonna created_by aggiunta con successo alla tabella documents');
      }
      
      // Chiudi la connessione al database
      db.close();
    });
  } else {
    // Chiudi la connessione al database
    db.close();
  }
});
