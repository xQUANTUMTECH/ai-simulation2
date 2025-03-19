/**
 * Test del pattern repository MongoDB implementato
 * Questo test verifica che le operazioni CRUD sul database siano robuste
 * e che la gestione degli errori e i retry automatici funzionino correttamente
 */
import { 
  connectToDatabase, 
  closeConnection, 
  createRepository, 
  withRetry, 
  withTransaction 
} from './server/database/mongodb.js';

// Configurazione
const TEST_COLLECTION = 'test_repository_pattern';
const TEST_DOCUMENTS = [
  { name: 'Documento di test 1', value: 100, tags: ['test', 'primo'] },
  { name: 'Documento di test 2', value: 200, tags: ['test', 'secondo'] },
  { name: 'Documento di test 3', value: 300, tags: ['test', 'terzo'] }
];

// Colori per output console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m"
};

/**
 * Funzione helper per log colorati
 */
function log(type, message) {
  let color;
  let prefix;
  
  switch(type) {
    case 'success':
      color = colors.green;
      prefix = '✅ SUCCESSO: ';
      break;
    case 'error':
      color = colors.red;
      prefix = '❌ ERRORE: ';
      break;
    case 'info':
      color = colors.blue;
      prefix = 'ℹ️ INFO: ';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠️ ATTENZIONE: ';
      break;
    case 'test':
      color = colors.magenta;
      prefix = '🧪 TEST: ';
      break;
    default:
      color = colors.reset;
      prefix = '';
  }
  
  console.log(`${color}${prefix}${message}${colors.reset}`);
}

/**
 * Funzione di test asincrona
 */
async function runTests() {
  let repository;
  let testDocumentIds = [];
  
  try {
    log('info', 'Avvio test del pattern repository MongoDB...');
    
    // 1. Connessione al database
    log('test', 'Connessione al database...');
    const db = await connectToDatabase();
    log('success', 'Connessione al database stabilita con successo');
    
    // 2. Creazione repository
    log('test', `Creazione repository per la collezione "${TEST_COLLECTION}"...`);
    repository = createRepository(TEST_COLLECTION);
    log('success', 'Repository creato con successo');
    
    // 3. Pulizia collezione di test
    log('test', 'Pulizia collezione di test...');
    await db.collection(TEST_COLLECTION).deleteMany({});
    log('success', 'Collezione di test pulita con successo');
    
    // 4. Test insertOne
    log('test', 'Test insertOne...');
    for (const testDoc of TEST_DOCUMENTS) {
      const result = await repository.insertOne(testDoc);
      testDocumentIds.push(result._id);
      log('info', `Documento inserito con ID: ${result._id}`);
    }
    log('success', `Inseriti ${TEST_DOCUMENTS.length} documenti di test`);
    
    // 5. Test findById
    log('test', 'Test findById...');
    const docId = testDocumentIds[0];
    const foundDoc = await repository.findById(docId);
    if (foundDoc && foundDoc._id === docId) {
      log('success', `Documento trovato correttamente: ${foundDoc.name}`);
    } else {
      throw new Error(`Errore nel recupero del documento con ID ${docId}`);
    }
    
    // 6. Test find con filtro
    log('test', 'Test find con filtro...');
    const filteredDocs = await repository.find({ value: { $gt: 150 } });
    if (filteredDocs.length === 2) {
      log('success', `Trovati ${filteredDocs.length} documenti con valore > 150`);
    } else {
      throw new Error(`Errore nel filtro dei documenti: trovati ${filteredDocs.length} invece di 2`);
    }
    
    // 7. Test count
    log('test', 'Test count...');
    const count = await repository.count({ tags: 'test' });
    if (count === 3) {
      log('success', `Count corretto: ${count} documenti con tag 'test'`);
    } else {
      throw new Error(`Errore nel count dei documenti: ${count} invece di 3`);
    }
    
    // 8. Test updateById
    log('test', 'Test updateById...');
    const updateResult = await repository.updateById(docId, { value: 999, updated: true });
    if (updateResult.modifiedCount === 1) {
      const updatedDoc = await repository.findById(docId);
      if (updatedDoc.value === 999 && updatedDoc.updated === true) {
        log('success', 'Documento aggiornato correttamente');
      } else {
        throw new Error('Aggiornamento non riuscito, i campi non corrispondono');
      }
    } else {
      throw new Error(`Errore nell'aggiornamento del documento con ID ${docId}`);
    }
    
    // 9. Test withRetry
    log('test', 'Test withRetry con operazione che fallisce temporaneamente...');
    let attemptCount = 0;
    const maxAttempts = 3;
    
    try {
      const retryResult = await withRetry(async () => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          // Simula un errore temporaneo per i primi tentativi
          throw new Error('Errore temporaneo simulato');
        }
        return 'Operazione completata con successo';
      }, { maxAttempts, initialDelayMs: 50 });
      
      log('success', `withRetry ha completato l'operazione con successo dopo ${attemptCount} tentativi`);
    } catch (error) {
      throw new Error(`withRetry non ha funzionato correttamente: ${error.message}`);
    }
    
    // 10. Test aggregate
    log('test', 'Test aggregate...');
    const aggregateResult = await repository.aggregate([
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);
    
    if (aggregateResult.length > 0) {
      const total = aggregateResult[0].total;
      log('success', `Aggregazione completata con successo, valore totale: ${total}`);
    } else {
      throw new Error('Errore nell\'operazione di aggregazione');
    }
    
    // 11. Test deleteById
    log('test', 'Test deleteById...');
    const deleteResult = await repository.deleteById(docId);
    if (deleteResult) {
      const deletedDoc = await repository.findById(docId);
      if (!deletedDoc) {
        log('success', 'Documento eliminato correttamente');
      } else {
        throw new Error(`Il documento con ID ${docId} esiste ancora dopo l'eliminazione`);
      }
    } else {
      throw new Error(`Errore nell'eliminazione del documento con ID ${docId}`);
    }
    
    // 12. Test withTransaction (se disponibile)
    log('test', 'Test withTransaction...');
    try {
      const transactionResult = await withTransaction(async (session) => {
        // Inserisci un documento nella transazione
        const insertResult = await repository.insertOne(
          { name: 'Documento transazione', value: 500 },
          { session }
        );
        
        // Aggiorna un documento esistente nella stessa transazione
        const secondDocId = testDocumentIds[1];
        await repository.updateById(
          secondDocId,
          { value: 777, updatedInTransaction: true },
          { session }
        );
        
        return insertResult._id;
      });
      
      log('success', `Transazione completata con successo, ID inserito: ${transactionResult}`);
    } catch (error) {
      // Le transazioni potrebbero non essere supportate in tutti gli ambienti MongoDB
      log('warning', `Test transazione non completato: ${error.message}`);
      log('info', 'Questo potrebbe essere normale se non stai usando un replica set o se la versione MongoDB non supporta transazioni');
    }
    
    // Pulizia finale
    log('test', 'Pulizia finale collezione di test...');
    await db.collection(TEST_COLLECTION).deleteMany({});
    log('success', 'Collezione di test pulita con successo');
    
    // Risultato complessivo
    log('success', 'TUTTI I TEST COMPLETATI CON SUCCESSO');
    
  } catch (error) {
    log('error', `Test fallito: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Chiudi la connessione al database
    try {
      log('info', 'Chiusura connessione database...');
      await closeConnection();
      log('success', 'Connessione database chiusa con successo');
    } catch (closeError) {
      log('error', `Errore nella chiusura della connessione: ${closeError.message}`);
    }
  }
}

// Esegui i test
runTests()
  .then(() => {
    log('info', 'Test del pattern repository MongoDB completati');
    process.exit(0);
  })
  .catch(error => {
    log('error', `Errore non gestito: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
