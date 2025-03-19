import DatabaseOperations from './database/db-operations.js';

// Funzione principale per testare le operazioni del database
async function testDatabaseOperations() {
  console.log('=== TEST OPERAZIONI DATABASE SQLITE ===');
  const db = new DatabaseOperations();
  
  try {
    // 1. Test delle operazioni utente
    console.log('\n--- TEST OPERAZIONI UTENTE ---');
    
    // Creazione utente test
    const userId = await db.createUser('test@cafasso.com');
    console.log(`Utente creato con ID: ${userId}`);
    
    // Recupero utente
    const user = await db.getUser(userId);
    console.log('Dati utente:', user);
    
    // 2. Test delle operazioni documento
    console.log('\n--- TEST OPERAZIONI DOCUMENTO ---');
    
    // Creazione documento
    const docId = await db.createDocument(userId, 'Questo è un documento di test');
    console.log(`Documento creato con ID: ${docId}`);
    
    // Recupero documento
    const doc = await db.getDocument(docId);
    console.log('Dati documento:', doc);
    
    // Recupero documenti utente
    const userDocs = await db.getUserDocuments(userId);
    console.log(`Documenti dell'utente (${userDocs.length}):`, userDocs);
    
    // 3. Test delle operazioni corso
    console.log('\n--- TEST OPERAZIONI CORSO ---');
    
    // Creazione corso
    const courseId = await db.createCourse('Corso di test', 'Descrizione del corso di test');
    console.log(`Corso creato con ID: ${courseId}`);
    
    // Recupero corso
    const course = await db.getCourse(courseId);
    console.log('Dati corso:', course);
    
    // Recupero tutti i corsi
    const courses = await db.getAllCourses();
    console.log(`Corsi disponibili (${courses.length}):`, courses);
    
    // 4. Test delle operazioni di ricerca
    console.log('\n--- TEST OPERAZIONI DI RICERCA ---');
    
    // Ricerca documenti
    const docSearchResults = await db.searchDocuments('test');
    console.log(`Risultati ricerca documenti (${docSearchResults.length}):`, docSearchResults);
    
    // Ricerca corsi
    const courseSearchResults = await db.searchCourses('test');
    console.log(`Risultati ricerca corsi (${courseSearchResults.length}):`, courseSearchResults);
    
    console.log('\n=== TEST COMPLETATI CON SUCCESSO ===');
    
  } catch (error) {
    console.error('ERRORE DURANTE I TEST:', error);
  } finally {
    // Chiudi la connessione al database
    await db.close();
    console.log('Connessione al database chiusa');
  }
}

// Esegui i test
testDatabaseOperations();
