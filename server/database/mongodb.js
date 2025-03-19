// Connessione a MongoDB per backend con pattern repository
import { MongoClient, ObjectId } from 'mongodb';
// Nota: TransactionOptions non è direttamente esportato come named export
import fs from 'fs';
import path from 'path';

// Configurazione sistema di logging unificato
const LOG_DIR = path.join(process.cwd(), 'logs');
const DB_LOG_FILE = path.join(LOG_DIR, 'database.log');

// Crea la directory dei logs se non esiste
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Funzione di logging unificata
const logDb = (level, message, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...details
  };
  
  console.log(`[${timestamp}] [DB] [${level.toUpperCase()}] ${message}`);
  
  try {
    fs.appendFileSync(
      DB_LOG_FILE, 
      JSON.stringify(logEntry) + '\n', 
      { flag: 'a' }
    );
  } catch (error) {
    console.error('Errore scrittura log DB:', error);
  }
};

// URI di connessione MongoDB
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";

// Variabile per memorizzare la connessione
let dbConnection;
let mongoClient;

// Flag per tenere traccia dei tentativi di riconnessione
let isReconnecting = false;

// Timeout tra i tentativi di riconnessione (ms)
const RECONNECT_INTERVAL_MS = 5000;

// Numero massimo di tentativi di riconnessione
const MAX_RECONNECT_ATTEMPTS = 10;

// Contatore per i tentativi di riconnessione
let reconnectAttempts = 0;

// Opzioni di connessione
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  wtimeoutMS: 2500,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 15000,
  retryWrites: true, // Abilita retry automatici per operazioni di scrittura
  retryReads: true   // Abilita retry automatici per operazioni di lettura
};

/**
 * Gestisce gli eventi di connessione MongoDB
 * @param {MongoClient} client - Client MongoDB
 */
function setupConnectionHandlers(client) {
  client.on('close', () => {
    logDb('warn', "Connessione MongoDB chiusa");
    attemptReconnection();
  });

  client.on('error', (error) => {
    logDb('error', "Errore nella connessione MongoDB", {
      error: error.name, 
      message: error.message,
      stack: error.stack
    });
    attemptReconnection();
  });

  client.on('timeout', () => {
    logDb('warn', "Timeout della connessione MongoDB");
    attemptReconnection();
  });

  client.on('reconnect', () => {
    logDb('info', "MongoDB riconnesso con successo");
    reconnectAttempts = 0; // Reset contatore tentativi
  });
}

/**
 * Tenta di riconnettersi al database MongoDB
 */
async function attemptReconnection() {
  // Evita tentativi multipli di riconnessione contemporanei
  if (isReconnecting) return;
  
  isReconnecting = true;
  
  try {
    // Limita il numero di tentativi
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logDb('error', `Superato il numero massimo di tentativi di riconnessione (${MAX_RECONNECT_ATTEMPTS})`);
      isReconnecting = false;
      return;
    }
    
    reconnectAttempts++;
    
    // Calcola timeout esponenziale
    const timeout = RECONNECT_INTERVAL_MS * Math.pow(1.5, reconnectAttempts - 1);
    
    logDb('info', `Tentativo di riconnessione ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} a MongoDB tra ${Math.round(timeout / 1000)} secondi...`);
    
    // Attendi prima di riconnetterti (backoff esponenziale)
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Se c'è un client esistente, chiudilo
    if (mongoClient) {
      try {
        await mongoClient.close(true);
      } catch (err) {
        logDb('warn', "Errore durante la chiusura del client MongoDB", {
          error: err.name,
          message: err.message
        });
      }
    }
    
    // Crea un nuovo client e connettiti
    mongoClient = new MongoClient(uri, options);
    await mongoClient.connect();
    
    // Imposta gli handler per la nuova connessione
    setupConnectionHandlers(mongoClient);
    
    // Aggiorna la connessione globale
    dbConnection = mongoClient.db();
    
    logDb('info', "MongoDB riconnesso con successo");
    reconnectAttempts = 0; // Reset contatore tentativi
  } catch (error) {
    logDb('error', `Tentativo di riconnessione ${reconnectAttempts} fallito`, {
      error: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Metti in coda il prossimo tentativo
    setTimeout(attemptReconnection, RECONNECT_INTERVAL_MS);
  } finally {
    isReconnecting = false;
  }
}

/**
 * Connette al database MongoDB
 * @returns {Promise<Db>} L'istanza del database connesso
 */
export async function connectToDatabase() {
  // Se abbiamo già una connessione, restituiscila
  if (dbConnection) return dbConnection;
  
  try {
    logDb('info', "Tentativo di connessione a MongoDB...");
    
    // Crea un nuovo client MongoDB
    mongoClient = new MongoClient(uri, options);
    
    // Connetti al server
    await mongoClient.connect();
    
    // Configura gli handler di connessione
    setupConnectionHandlers(mongoClient);
    
    // Memorizza la connessione
    dbConnection = mongoClient.db();
    
    logDb('info', "MongoDB connesso con successo", {
      dbName: dbConnection.databaseName,
      connectionId: mongoClient.topology?.id
    });
    
    return dbConnection;
  } catch (error) {
    logDb('error', "Errore di connessione a MongoDB", {
      error: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Avvia riconnessione automatica
    attemptReconnection();
    
    throw error;
  }
}

/**
 * Ottiene la connessione al database
 * @returns {Db|null} L'istanza del database o null se non connesso
 */
export function getDb() {
  return dbConnection;
}

/**
 * Chiude la connessione al database
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  if (mongoClient) {
    try {
      await mongoClient.close();
      dbConnection = null;
      mongoClient = null;
      logDb('info', "Connessione MongoDB chiusa");
    } catch (error) {
      logDb('error', "Errore nella chiusura della connessione", {
        error: error.name,
        message: error.message
      });
      throw error;
    }
  }
}

/**
 * Funzione generica per ritentare operazioni con backoff esponenziale
 * @param {Function} operation - La funzione da eseguire
 * @param {Object} options - Opzioni per i tentativi
 * @returns {Promise<any>} Il risultato dell'operazione
 */
export async function withRetry(operation, options = {}) {
  const {
    maxAttempts = 5,
    initialDelayMs = 100,
    factor = 2,
    collection = null,
    operationName = 'database operation'
  } = options;
  
  let attempt = 0;
  let lastError;
  
  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Log dell'errore
      logDb('warn', `Tentativo ${attempt}/${maxAttempts} fallito per ${operationName}`, {
        collection: collection?.collectionName,
        error: error.name,
        message: error.message,
        code: error.code
      });
      
      // Se è l'ultimo tentativo, non attendere
      if (attempt >= maxAttempts) break;
      
      // Calcola il ritardo con backoff esponenziale e jitter
      const delay = initialDelayMs * Math.pow(factor, attempt - 1) * (0.5 + Math.random());
      
      // Attendi prima del prossimo tentativo
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Log dell'errore finale
  logDb('error', `Tutti i tentativi falliti per ${operationName}`, {
    attempts: attempt,
    collection: collection?.collectionName,
    error: lastError.name,
    message: lastError.message,
    code: lastError.code,
    stack: lastError.stack
  });
  
  throw lastError;
}

/**
 * Avvia una sessione di transazione MongoDB
 * @param {Function} operation - Funzione che riceve la sessione e esegue operazioni nella transazione
 * @param {TransactionOptions} options - Opzioni per la transazione
 * @returns {Promise<any>} Il risultato dell'operazione
 */
export async function withTransaction(operation, options = {}) {
  const session = mongoClient.startSession();
  try {
    // Avvia la transazione con le opzioni fornite
    const transactionOptions = {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
      ...options
    };
    
    logDb('debug', 'Avvio transazione MongoDB', { sessionId: session.id });
    
    // Esegui la funzione nella transazione
    const result = await session.withTransaction(async () => {
      return await operation(session);
    }, transactionOptions);
    
    logDb('debug', 'Transazione MongoDB completata con successo', { sessionId: session.id });
    
    return result;
  } catch (error) {
    logDb('error', 'Errore durante la transazione MongoDB', {
      error: error.name,
      message: error.message,
      sessionId: session.id
    });
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Pattern Repository per MongoDB - Fornisce operazioni CRUD standard
 * @param {string} collectionName - Nome della collezione
 * @returns {Object} Oggetto con metodi CRUD standard
 */
export function createRepository(collectionName) {
  return {
    /**
     * Trova un documento per ID
     * @param {string} id - ID del documento
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object|null>} Il documento trovato o null
     */
    findById: async (id, options = {}) => {
      const { session, projection } = options;
      
      if (!id || !ObjectId.isValid(id)) {
        throw new Error(`ID non valido: ${id}`);
      }
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          const query = { _id: new ObjectId(id) };
          const result = await db.collection(collectionName)
            .findOne(query, { session, projection });
          
          if (result && result._id) {
            result._id = result._id.toString(); // Converti ObjectId in stringa
          }
          
          return result;
        }, { collection: db.collection(collectionName), operationName: `findById in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in findById per ${collectionName}`, {
          id,
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Trova documenti in base ad un filtro
     * @param {Object} filter - Filtro MongoDB
     * @param {Object} options - Opzioni aggiuntive (sort, limit, skip, projection)
     * @returns {Promise<Array>} Array di documenti
     */
    find: async (filter = {}, options = {}) => {
      const { sort, limit, skip, projection, session } = options;
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          let query = db.collection(collectionName).find(filter, { session });
          
          if (projection) query = query.project(projection);
          if (sort) query = query.sort(sort);
          if (skip) query = query.skip(skip);
          if (limit) query = query.limit(limit);
          
          const results = await query.toArray();
          
          // Converti tutti gli ObjectId in stringhe
          return results.map(doc => {
            if (doc._id) {
              doc._id = doc._id.toString();
            }
            return doc;
          });
        }, { collection: db.collection(collectionName), operationName: `find in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in find per ${collectionName}`, {
          filter: JSON.stringify(filter),
          options: JSON.stringify({ sort, limit, skip }),
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Conta documenti in base ad un filtro
     * @param {Object} filter - Filtro MongoDB
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<number>} Numero di documenti
     */
    count: async (filter = {}, options = {}) => {
      const { session } = options;
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          return await db.collection(collectionName).countDocuments(filter, { session });
        }, { collection: db.collection(collectionName), operationName: `count in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in count per ${collectionName}`, {
          filter: JSON.stringify(filter),
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Inserisce un nuovo documento
     * @param {Object} document - Documento da inserire
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object>} Documento inserito con ID
     */
    insertOne: async (document, options = {}) => {
      const { session } = options;
      
      if (!document) throw new Error('Documento non fornito');
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      // Aggiungi timestamp
      const now = new Date();
      const documentWithTimestamps = {
        ...document,
        created_at: now,
        updated_at: now
      };
      
      try {
        return await withRetry(async () => {
          const result = await db.collection(collectionName)
            .insertOne(documentWithTimestamps, { session });
          
          return {
            ...documentWithTimestamps,
            _id: result.insertedId.toString()
          };
        }, { collection: db.collection(collectionName), operationName: `insertOne in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in insertOne per ${collectionName}`, {
          error: error.name,
          message: error.message,
          code: error.code
        });
        
        // Gestione errori specifici
        if (error.code === 11000) { // Duplicate key error
          throw new Error(`Documento con chiave duplicata: ${JSON.stringify(error.keyValue)}`);
        }
        
        throw error;
      }
    },
    
    /**
     * Aggiorna un documento per ID
     * @param {string} id - ID del documento
     * @param {Object} updates - Aggiornamenti al documento
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Object>} Risultato aggiornamento
     */
    updateById: async (id, updates, options = {}) => {
      const { session, upsert = false } = options;
      
      if (!id || !ObjectId.isValid(id)) {
        throw new Error(`ID non valido: ${id}`);
      }
      
      if (!updates) throw new Error('Aggiornamenti non forniti');
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      // Aggiungi timestamp updated_at
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date()
      };
      
      // Prepara l'operatore $set
      const updateOperation = { $set: updatesWithTimestamp };
      
      try {
        return await withRetry(async () => {
          const result = await db.collection(collectionName).updateOne(
            { _id: new ObjectId(id) },
            updateOperation,
            { session, upsert }
          );
          
          return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId ? result.upsertedId.toString() : null
          };
        }, { collection: db.collection(collectionName), operationName: `updateById in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in updateById per ${collectionName}`, {
          id,
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Elimina un documento per ID
     * @param {string} id - ID del documento
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<boolean>} true se eliminato, false altrimenti
     */
    deleteById: async (id, options = {}) => {
      const { session } = options;
      
      if (!id || !ObjectId.isValid(id)) {
        throw new Error(`ID non valido: ${id}`);
      }
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          const result = await db.collection(collectionName)
            .deleteOne({ _id: new ObjectId(id) }, { session });
          
          return result.deletedCount > 0;
        }, { collection: db.collection(collectionName), operationName: `deleteById in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in deleteById per ${collectionName}`, {
          id,
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Elimina documenti in base ad un filtro
     * @param {Object} filter - Filtro MongoDB
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<number>} Numero di documenti eliminati
     */
    deleteMany: async (filter, options = {}) => {
      const { session } = options;
      
      if (!filter || Object.keys(filter).length === 0) {
        throw new Error('Filtro vuoto non consentito per deleteMany, usare deleteAll per eliminare tutti i documenti');
      }
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          const result = await db.collection(collectionName)
            .deleteMany(filter, { session });
          
          return result.deletedCount;
        }, { collection: db.collection(collectionName), operationName: `deleteMany in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in deleteMany per ${collectionName}`, {
          filter: JSON.stringify(filter),
          error: error.name,
          message: error.message
        });
        throw error;
      }
    },
    
    /**
     * Esegue un'aggregazione
     * @param {Array} pipeline - Pipeline di aggregazione
     * @param {Object} options - Opzioni aggiuntive
     * @returns {Promise<Array>} Risultato dell'aggregazione
     */
    aggregate: async (pipeline, options = {}) => {
      const { session } = options;
      
      if (!Array.isArray(pipeline)) {
        throw new Error('Pipeline deve essere un array');
      }
      
      const db = getDb();
      if (!db) throw new Error('Database non connesso');
      
      try {
        return await withRetry(async () => {
          const results = await db.collection(collectionName)
            .aggregate(pipeline, { session }).toArray();
          
          // Converti eventuali ObjectId in stringhe
          return results.map(doc => {
            if (doc._id && typeof doc._id.toString === 'function') {
              doc._id = doc._id.toString();
            }
            return doc;
          });
        }, { collection: db.collection(collectionName), operationName: `aggregate in ${collectionName}` });
      } catch (error) {
        logDb('error', `Errore in aggregate per ${collectionName}`, {
          pipeline: JSON.stringify(pipeline),
          error: error.name,
          message: error.message
        });
        throw error;
      }
    }
  };
}
