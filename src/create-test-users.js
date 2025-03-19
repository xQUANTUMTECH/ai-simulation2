import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Per ottenere l'equivalente di __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Percorso del database
const dbPath = path.join(__dirname, '../database.sqlite');

// Verifica che il database esista
if (!fs.existsSync(dbPath)) {
  console.error('Database non trovato! Esegui prima initialize-complete-database.bat');
  process.exit(1);
}

// Crea una connessione al database
const db = new (sqlite3.verbose().Database)(dbPath);

// Funzione per creare utenti di test
async function createTestUsers() {
  return new Promise((resolve, reject) => {
    console.log('Creazione utenti di test...');

    // Crea un utente amministratore
    const adminId = `admin_${uuidv4().substring(0, 8)}`;
    const adminEmail = 'direttore@cafasso.edu';
    const adminUsername = 'direttore';

    // Crea un utente normale
    const userId = `user_${uuidv4().substring(0, 8)}`;
    const userEmail = 'studente@cafasso.edu';
    const userUsername = 'studente';

    // Esegui le operazioni in una transazione
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Inserisci l'amministratore
      db.run(
        `INSERT INTO users (id, email, username, role, account_status)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, adminEmail, adminUsername, 'ADMIN', 'active'],
        function(err) {
          if (err) {
            console.error('Errore durante l\'inserimento dell\'admin:', err.message);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          console.log(`Admin creato con ID: ${adminId}`);
          
          // Inserisci le impostazioni utente per l'admin
          db.run(
            `INSERT INTO user_settings (user_id, theme, notifications_enabled, language)
             VALUES (?, ?, ?, ?)`,
            [adminId, 'dark', 1, 'it'],
            function(err) {
              if (err) {
                console.error('Errore durante l\'inserimento delle impostazioni admin:', err.message);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Inserisci l'utente normale
              db.run(
                `INSERT INTO users (id, email, username, role, account_status)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, userEmail, userUsername, 'USER', 'active'],
                function(err) {
                  if (err) {
                    console.error('Errore durante l\'inserimento dell\'utente:', err.message);
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  console.log(`Utente creato con ID: ${userId}`);
                  
                  // Inserisci le impostazioni utente per l'utente normale
                  db.run(
                    `INSERT INTO user_settings (user_id, theme, notifications_enabled, language)
                     VALUES (?, ?, ?, ?)`,
                    [userId, 'light', 1, 'it'],
                    function(err) {
                      if (err) {
                        console.error('Errore durante l\'inserimento delle impostazioni utente:', err.message);
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                      }
                      
                      // Crea una sessione attiva per entrambi gli utenti
                      const adminSessionId = `session_${uuidv4().substring(0, 8)}`;
                      const userSessionId = `session_${uuidv4().substring(0, 8)}`;
                      
                      // Data di scadenza tra 7 giorni
                      const expiresAt = new Date();
                      expiresAt.setDate(expiresAt.getDate() + 7);
                      
                      db.run(
                        `INSERT INTO auth_sessions (id, user_id, expires_at)
                         VALUES (?, ?, ?)`,
                        [adminSessionId, adminId, expiresAt.toISOString()],
                        function(err) {
                          if (err) {
                            console.error('Errore durante l\'inserimento della sessione admin:', err.message);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                          }
                          
                          db.run(
                            `INSERT INTO auth_sessions (id, user_id, expires_at)
                             VALUES (?, ?, ?)`,
                            [userSessionId, userId, expiresAt.toISOString()],
                            function(err) {
                              if (err) {
                                console.error('Errore durante l\'inserimento della sessione utente:', err.message);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                              }
                              
                              // Commit della transazione
                              db.run('COMMIT', function(err) {
                                if (err) {
                                  console.error('Errore durante il commit:', err.message);
                                  db.run('ROLLBACK');
                                  reject(err);
                                  return;
                                }
                                
                                console.log('\nUtenti creati con successo:');
                                console.log(`- Admin: ${adminEmail} (ID: ${adminId})`);
                                console.log(`- Utente: ${userEmail} (ID: ${userId})`);
                                console.log('\nSessioni create:');
                                console.log(`- Admin: ${adminSessionId}`);
                                console.log(`- Utente: ${userSessionId}`);
                                
                                resolve({
                                  admin: { id: adminId, email: adminEmail, sessionId: adminSessionId },
                                  user: { id: userId, email: userEmail, sessionId: userSessionId }
                                });
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

// Funzione per creare contenuti di esempio
async function createSampleContent(users) {
  return new Promise((resolve, reject) => {
    console.log('\nCreazione contenuti di esempio...');
    
    // Crea un documento di esempio
    const documentId = `doc_${uuidv4().substring(0, 8)}`;
    const documentTitle = 'Guida introduttiva all\'AI Academy';
    const documentContent = 'Benvenuti alla Cafasso AI Academy! Questa piattaforma offre strumenti avanzati per l\'apprendimento attraverso l\'intelligenza artificiale.';
    
    // Crea un corso di esempio
    const courseId = `course_${uuidv4().substring(0, 8)}`;
    const courseTitle = 'Intelligenza Artificiale: Concetti Base';
    const courseDescription = 'Un corso introduttivo ai fondamenti dell\'intelligenza artificiale, machine learning e deep learning.';
    
    // Esegui le operazioni in una transazione
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Inserisci il documento
      db.run(
        `INSERT INTO documents (id, user_id, title, content, document_type, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [documentId, users.admin.id, documentTitle, documentContent, 'text', 'published', users.admin.id],
        function(err) {
          if (err) {
            console.error('Errore durante l\'inserimento del documento:', err.message);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          console.log(`Documento creato con ID: ${documentId}`);
          
          // Inserisci il corso
          db.run(
            `INSERT INTO courses (id, title, description, instructor_id, is_published)
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, courseTitle, courseDescription, users.admin.id, 1],
            function(err) {
              if (err) {
                console.error('Errore durante l\'inserimento del corso:', err.message);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              console.log(`Corso creato con ID: ${courseId}`);
              
              // Commit della transazione
              db.run('COMMIT', function(err) {
                if (err) {
                  console.error('Errore durante il commit:', err.message);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                console.log('\nContenuti creati con successo:');
                console.log(`- Documento: "${documentTitle}" (ID: ${documentId})`);
                console.log(`- Corso: "${courseTitle}" (ID: ${courseId})`);
                
                resolve({
                  document: { id: documentId, title: documentTitle },
                  course: { id: courseId, title: courseTitle }
                });
              });
            }
          );
        }
      );
    });
  });
}

// Funzione per verificare il database
async function verifyDatabase() {
  return new Promise((resolve, reject) => {
    console.log('\nVerifica del database...');
    
    // Verifica la presenza delle tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table'", function(err, tables) {
      if (err) {
        console.error('Errore durante la verifica delle tabelle:', err.message);
        reject(err);
        return;
      }
      
      console.log(`Numero di tabelle trovate: ${tables.length}`);
      console.log('Tabelle principali:');
      ['users', 'auth_sessions', 'documents', 'courses', 'storage_files', 'storage_buckets'].forEach(tableName => {
        const found = tables.some(t => t.name === tableName);
        console.log(`- ${tableName}: ${found ? 'Presente' : 'MANCANTE'}`);
      });
      
      // Verifica il numero di utenti
      db.get("SELECT COUNT(*) as count FROM users", function(err, result) {
        if (err) {
          console.error('Errore durante il conteggio degli utenti:', err.message);
          reject(err);
          return;
        }
        
        console.log(`\nNumero di utenti: ${result.count}`);
        
        // Verifica il numero di documenti
        db.get("SELECT COUNT(*) as count FROM documents", function(err, result) {
          if (err) {
            console.error('Errore durante il conteggio dei documenti:', err.message);
            reject(err);
            return;
          }
          
          console.log(`Numero di documenti: ${result.count}`);
          
          // Verifica il numero di corsi
          db.get("SELECT COUNT(*) as count FROM courses", function(err, result) {
            if (err) {
              console.error('Errore durante il conteggio dei corsi:', err.message);
              reject(err);
              return;
            }
            
            console.log(`Numero di corsi: ${result.count}`);
            
            // Verifica il numero di sessioni
            db.get("SELECT COUNT(*) as count FROM auth_sessions", function(err, result) {
              if (err) {
                console.error('Errore durante il conteggio delle sessioni:', err.message);
                reject(err);
                return;
              }
              
              console.log(`Numero di sessioni: ${result.count}`);
              
              console.log('\nVerifica completata con successo!');
              resolve();
            });
          });
        });
      });
    });
  });
}

// Funzione principale
async function main() {
  try {
    console.log('============================================');
    console.log('Creazione utenti e contenuti di test...');
    console.log('============================================\n');
    
    // Crea gli utenti di test
    const users = await createTestUsers();
    
    // Crea i contenuti di esempio
    const contents = await createSampleContent(users);
    
    // Verifica il database
    await verifyDatabase();
    
    console.log('\n============================================');
    console.log('IMPORTANTE: Utilizza queste credenziali per accedere:');
    console.log('- Admin: direttore@cafasso.edu');
    console.log('- Utente: studente@cafasso.edu');
    console.log('============================================');
    
    // Chiudi la connessione al database
    db.close();
  } catch (error) {
    console.error('Errore durante l\'esecuzione:', error);
    // Chiudi la connessione al database in caso di errore
    db.close();
  }
}

// Esegui il programma
main();
