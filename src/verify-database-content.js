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

// Verifica il contenuto del database
console.log('===== VERIFICA CONTENUTO DEL DATABASE SQLITE =====');

// Query per ottenere gli utenti
db.all('SELECT * FROM users', [], (err, users) => {
  if (err) {
    console.error('Errore durante query utenti:', err.message);
    return;
  }

  console.log(`\n=== UTENTI (${users.length}) ===`);
  users.forEach((user, i) => {
    console.log(`\nUtente ${i+1}:`);
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Ruolo: ${user.role}`);
    console.log(`- Stato: ${user.account_status}`);
    console.log(`- Creato il: ${user.created_at}`);
  });

  // Query per ottenere le sessioni
  db.all('SELECT * FROM auth_sessions', [], (err, sessions) => {
    if (err) {
      console.error('Errore durante query sessioni:', err.message);
      return;
    }

    console.log(`\n=== SESSIONI AUTENTICAZIONE (${sessions.length}) ===`);
    sessions.forEach((session, i) => {
      console.log(`\nSessione ${i+1}:`);
      console.log(`- ID: ${session.id}`);
      console.log(`- User ID: ${session.user_id}`);
      console.log(`- Scadenza: ${session.expires_at}`);
      console.log(`- Creato il: ${session.created_at}`);
    });

    // Query per ottenere i documenti
    db.all('SELECT * FROM documents', [], (err, documents) => {
      if (err) {
        console.error('Errore durante query documenti:', err.message);
        return;
      }

      console.log(`\n=== DOCUMENTI (${documents.length}) ===`);
      documents.forEach((doc, i) => {
        console.log(`\nDocumento ${i+1}:`);
        console.log(`- ID: ${doc.id}`);
        console.log(`- Titolo: ${doc.title || '[Nessun titolo]'}`);
        console.log(`- User ID: ${doc.user_id}`);
        console.log(`- Tipo: ${doc.document_type || '[Non specificato]'}`);
        console.log(`- Stato: ${doc.status || '[Non specificato]'}`);
        console.log(`- Creato il: ${doc.created_at}`);
      });

      // Query per ottenere i corsi
      db.all('SELECT * FROM courses', [], (err, courses) => {
        if (err) {
          console.error('Errore durante query corsi:', err.message);
          return;
        }

        console.log(`\n=== CORSI (${courses.length}) ===`);
        courses.forEach((course, i) => {
          console.log(`\nCorso ${i+1}:`);
          console.log(`- ID: ${course.id}`);
          console.log(`- Titolo: ${course.title}`);
          console.log(`- Descrizione: ${course.description || '[Nessuna descrizione]'}`);
          console.log(`- Instructor ID: ${course.instructor_id || '[Nessun istruttore]'}`);
          console.log(`- Pubblicato: ${course.is_published ? 'Sì' : 'No'}`);
          console.log(`- Creato il: ${course.created_at}`);
        });

        // Verifica numero totale di tabelle
        db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
          if (err) {
            console.error('Errore durante query tabelle:', err.message);
            return;
          }

          console.log(`\n=== TABELLE DEL DATABASE (${tables.length}) ===`);
          console.log(tables.map(t => t.name).join(', '));

          // Chiudi la connessione al database
          db.close((err) => {
            if (err) {
              console.error('Errore durante la chiusura del database:', err.message);
            } else {
              console.log('\nVerifica completata. Connessione al database chiusa.');
            }
          });
        });
      });
    });
  });
});
