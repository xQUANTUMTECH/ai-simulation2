/**
 * Test del pattern repository MongoDB con dati reali
 * Questo test utilizza dati rappresentativi dell'applicazione Cafasso AI Academy
 * per verificare le operazioni di database in scenari realistici
 */
import { 
  connectToDatabase, 
  closeConnection, 
  createRepository, 
  withRetry, 
  withTransaction 
} from './server/database/mongodb.js';

// Colori per output console
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

// Stampa un titolo formattato
function printTitle(title) {
  console.log("\n" + colors.magenta + "━".repeat(80) + colors.reset);
  console.log(colors.magenta + " 🔬 " + title + colors.reset);
  console.log(colors.magenta + "━".repeat(80) + colors.reset);
}

// Log colorato
function log(type, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
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
      color = colors.cyan;
      prefix = '🧪 TEST: ';
      break;
    default:
      color = colors.reset;
      prefix = '';
  }
  
  console.log(`${color}[${timestamp}] ${prefix}${message}${colors.reset}`);
}

/**
 * Dati di test realistici
 */
const DATI_TEST = {
  // Dati utenti
  users: [
    {
      email: "mario.rossi@example.com",
      username: "mario.rossi", // Aggiunto username univoco
      password: "$2a$10$abcdefghijklmnopqrstuvwxyz012345", // hash fittizio
      nome: "Mario",
      cognome: "Rossi",
      role: "USER",
      isActive: true,
      lastLogin: new Date(),
      preferences: {
        language: "it-IT",
        notifications: true,
        darkMode: false
      }
    },
    {
      email: "anna.verdi@example.com",
      username: "anna.verdi", // Aggiunto username univoco
      password: "$2a$10$abcdefghijklmnopqrstuvwxyz012345", // hash fittizio
      nome: "Anna",
      cognome: "Verdi",
      role: "USER",
      isActive: true,
      preferences: {
        language: "it-IT",
        notifications: false,
        darkMode: true
      }
    },
    {
      email: "admin@cafassoaitraining.com",
      username: "admin.sistema", // Aggiunto username univoco
      password: "$2a$10$abcdefghijklmnopqrstuvwxyz012345", // hash fittizio
      nome: "Admin",
      cognome: "Sistema",
      role: "ADMIN",
      isActive: true,
      preferences: {
        language: "it-IT",
        notifications: true,
        darkMode: false
      }
    }
  ],
  
  // Dati corsi
  courses: [
    {
      titolo: "Introduzione all'Intelligenza Artificiale",
      descrizione: "Corso base sui concetti fondamentali dell'AI e le sue applicazioni",
      durata: 120, // in minuti
      livello: "BASE",
      tags: ["ai", "base", "introduzione"],
      moduli: [
        { titolo: "Cos'è l'AI", durata: 30 },
        { titolo: "Machine Learning", durata: 45 },
        { titolo: "Deep Learning", durata: 45 }
      ],
      attivo: true,
      createdAt: new Date('2025-01-10')
    },
    {
      titolo: "Analisi Dati con Python",
      descrizione: "Corso intermedio sull'analisi dati utilizzando Python e librerie specifiche",
      durata: 240, // in minuti
      livello: "INTERMEDIO",
      tags: ["python", "data-analysis", "pandas"],
      moduli: [
        { titolo: "Introduzione a Python", durata: 60 },
        { titolo: "Pandas e NumPy", durata: 90 },
        { titolo: "Visualizzazione Dati", durata: 60 },
        { titolo: "Casi Studio", durata: 30 }
      ],
      attivo: true,
      createdAt: new Date('2025-02-15')
    }
  ],
  
  // Dati scenari simulazione
  scenarios: [
    {
      titolo: "Consulenza Fiscale Base",
      descrizione: "Simulazione di consulenza fiscale per privati",
      categoria: "FISCALE",
      difficolta: "BASE",
      protagonista: {
        nome: "Cliente",
        descrizione: "Un cliente che ha bisogno di assistenza fiscale",
        avatar: "avatar1.png"
      },
      npc: {
        nome: "Consulente",
        descrizione: "Consulente fiscale esperto",
        avatar: "avatar2.png"
      },
      dialoghi: [
        {
          turno: 1,
          speaker: "npc",
          testo: "Buongiorno, come posso aiutarla oggi?",
          opzioni: ["Vorrei informazioni sulle detrazioni fiscali", "Ho bisogno di aiuto per la dichiarazione dei redditi"]
        },
        {
          turno: 2,
          speaker: "protagonista",
          opzioni: [
            {
              testo: "Vorrei informazioni sulle detrazioni fiscali",
              risposta: "Potrebbe dirmi quali spese ha sostenuto nell'ultimo anno?"
            },
            {
              testo: "Ho bisogno di aiuto per la dichiarazione dei redditi",
              risposta: "Certamente, ha già raccolto tutti i documenti necessari?"
            }
          ]
        }
      ],
      attivo: true
    }
  ],
  
  // Dati quiz
  quizzes: [
    {
      titolo: "Quiz Concetti Base AI",
      descrizione: "Verifica le tue conoscenze sui concetti fondamentali dell'AI",
      courseId: "corso1", // riferimento fittizio
      domande: [
        {
          testo: "Quale di queste tecnologie NON è considerata parte dell'Intelligenza Artificiale?",
          tipo: "MULTIPLA",
          opzioni: [
            "Machine Learning",
            "Deep Learning",
            "HTML",
            "Natural Language Processing"
          ],
          rispostaCorretta: 2, // indice dell'opzione corretta (HTML)
          punteggio: 10
        },
        {
          testo: "Il machine learning si basa su:",
          tipo: "MULTIPLA",
          opzioni: [
            "Programmazione esplicita di ogni regola",
            "Algoritmi che imparano dai dati",
            "Solo su reti neurali",
            "Esclusivamente programmazione simbolica"
          ],
          rispostaCorretta: 1, // indice dell'opzione corretta
          punteggio: 15
        }
      ],
      tempoDiCompletamento: 600, // secondi
      attivo: true
    }
  ]
};

/**
 * Test inserimento e query utenti
 * @param {Object} db - Connessione database
 */
async function testRepositoryUtenti(db) {
  printTitle("Test Repository Utenti");
  
  // Crea repository
  const usersRepo = createRepository('users');
  
  try {
    // Pulizia iniziale
    log('info', "Pulizia collezione utenti...");
    await db.collection('users').deleteMany({});
    
    // Test inserimento batch di utenti
    log('test', "Inserimento batch utenti...");
    const userIds = [];
    
    for (const userData of DATI_TEST.users) {
      const result = await usersRepo.insertOne(userData);
      userIds.push(result._id);
      log('info', `Inserito utente ${userData.nome} ${userData.cognome} con ID: ${result._id}`);
    }
    
    // Test count
    const countUsers = await usersRepo.count({});
    if (countUsers === DATI_TEST.users.length) {
      log('success', `Conteggio utenti corretto: ${countUsers}`);
    } else {
      throw new Error(`Errore nel conteggio utenti: trovati ${countUsers} invece di ${DATI_TEST.users.length}`);
    }
    
    // Test ricerca per ruolo
    log('test', "Ricerca utenti per ruolo ADMIN...");
    const admins = await usersRepo.find({ role: "ADMIN" });
    if (admins.length === 1) {
      log('success', `Trovato ${admins.length} admin: ${admins[0].nome} ${admins[0].cognome}`);
    } else {
      throw new Error(`Errore nella ricerca admin: trovati ${admins.length} invece di 1`);
    }
    
    // Test ricerca con proiezione
    log('test', "Ricerca con proiezione (solo email e nome)...");
    const usersProjection = await usersRepo.find(
      { isActive: true },
      { projection: { email: 1, nome: 1, cognome: 1 } }
    );
    
    if (usersProjection.length > 0 && usersProjection[0].email && !usersProjection[0].password) {
      log('success', `Proiezione funziona correttamente, campi limitati: ${Object.keys(usersProjection[0]).join(', ')}`);
    } else {
      throw new Error("Errore nella proiezione dei campi");
    }
    
    // Test update
    log('test', "Aggiornamento preferenze utente...");
    const updateResult = await usersRepo.updateById(userIds[0], { 
      "preferences.darkMode": true,
      lastModified: new Date()
    });
    
    if (updateResult.modifiedCount === 1) {
      const updatedUser = await usersRepo.findById(userIds[0]);
      if (updatedUser.preferences.darkMode === true) {
        log('success', `Aggiornamento riuscito, dark mode impostata a: ${updatedUser.preferences.darkMode}`);
      } else {
        throw new Error("Aggiornamento non riuscito, i campi non sono stati modificati");
      }
    } else {
      throw new Error(`Errore nell'aggiornamento utente con ID ${userIds[0]}`);
    }
    
    // Test ricerca con ordinamento
    log('test', "Ricerca con ordinamento per cognome...");
    const sortedUsers = await usersRepo.find(
      { role: "USER" },
      { sort: { cognome: 1 } }
    );
    
    if (sortedUsers.length >= 2 && sortedUsers[0].cognome < sortedUsers[1].cognome) {
      log('success', `Ordinamento corretto: ${sortedUsers.map(u => u.cognome).join(' → ')}`);
    } else {
      throw new Error("Errore nell'ordinamento degli utenti");
    }
  } catch (error) {
    log('error', `Test repository utenti fallito: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Test inserimento e query corsi
 * @param {Object} db - Connessione database
 */
async function testRepositoryCorsi(db) {
  printTitle("Test Repository Corsi");
  
  // Crea repository
  const coursesRepo = createRepository('courses');
  
  try {
    // Pulizia iniziale
    log('info', "Pulizia collezione corsi...");
    await db.collection('courses').deleteMany({});
    
    // Test inserimento corsi
    log('test', "Inserimento corsi...");
    const courseIds = [];
    
    for (const courseData of DATI_TEST.courses) {
      const result = await coursesRepo.insertOne(courseData);
      courseIds.push(result._id);
      log('info', `Inserito corso "${courseData.titolo}" con ID: ${result._id}`);
    }
    
    // Test ricerca per tag
    log('test', "Ricerca corsi per tag...");
    const pythonCourses = await coursesRepo.find({ tags: "python" });
    if (pythonCourses.length === 1) {
      log('success', `Trovato ${pythonCourses.length} corso con tag "python": ${pythonCourses[0].titolo}`);
    } else {
      throw new Error(`Errore nella ricerca per tag: trovati ${pythonCourses.length} invece di 1`);
    }
    
    // Test ricerca per livello
    log('test', "Ricerca corsi per livello...");
    const corsiBase = await coursesRepo.find({ livello: "BASE" });
    if (corsiBase.length === 1) {
      log('success', `Trovato ${corsiBase.length} corso di livello BASE: ${corsiBase[0].titolo}`);
    } else {
      throw new Error(`Errore nella ricerca per livello: trovati ${corsiBase.length} invece di 1`);
    }
    
    // Test aggregazione per calcolare durata totale
    log('test', "Aggregazione per calcolare durata totale corsi...");
    const aggregationResult = await coursesRepo.aggregate([
      { $group: { _id: null, totaleDurata: { $sum: "$durata" } } }
    ]);
    
    if (aggregationResult.length > 0) {
      const totaleDurata = aggregationResult[0].totaleDurata;
      log('success', `Durata totale dei corsi: ${totaleDurata} minuti`);
      
      // Verifica che il totale sia corretto
      const totalExpected = DATI_TEST.courses.reduce((acc, course) => acc + course.durata, 0);
      if (totaleDurata === totalExpected) {
        log('success', `Il totale calcolato (${totaleDurata}) corrisponde al valore atteso (${totalExpected})`);
      } else {
        throw new Error(`Il totale calcolato (${totaleDurata}) non corrisponde al valore atteso (${totalExpected})`);
      }
    } else {
      throw new Error('Errore nell\'aggregazione dei corsi');
    }
    
    // Test di una query più complessa - Corsi con almeno 3 moduli
    log('test', "Query complessa: corsi con almeno 3 moduli...");
    const corsiMultiModulo = await coursesRepo.find({
      "moduli.3": { $exists: true }  // Controlla se esiste l'elemento con indice 3 (quarto elemento)
    });
    
    if (corsiMultiModulo.length === 1) {
      log('success', `Trovato ${corsiMultiModulo.length} corso con 4+ moduli: ${corsiMultiModulo[0].titolo} (${corsiMultiModulo[0].moduli.length} moduli)`);
    } else {
      throw new Error(`Errore nella query complessa: trovati ${corsiMultiModulo.length} invece di 1`);
    }
  } catch (error) {
    log('error', `Test repository corsi fallito: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Test delle transazioni MongoDB
 * @param {Object} db - Connessione database
 */
async function testTransazioni(db) {
  printTitle("Test Transazioni MongoDB");
  
  // Crea repository
  const scenariosRepo = createRepository('scenarios');
  const quizzesRepo = createRepository('quizzes');
  
  try {
    // Pulizia iniziale
    log('info', "Pulizia collezioni...");
    await db.collection('scenarios').deleteMany({});
    await db.collection('quizzes').deleteMany({});
    
    // Test transazione riuscita
    log('test', "Test transazione riuscita...");
    
    const transactionResult = await withTransaction(async (session) => {
      // Inserisci scenario nella transazione
      const scenarioInsert = await scenariosRepo.insertOne(
        DATI_TEST.scenarios[0],
        { session }
      );
      
      // Modifica il quiz per collegarlo allo scenario creato e inseriscilo
      const quizData = { ...DATI_TEST.quizzes[0], scenarioId: scenarioInsert._id };
      const quizInsert = await quizzesRepo.insertOne(
        quizData,
        { session }
      );
      
      return {
        scenarioId: scenarioInsert._id,
        quizId: quizInsert._id
      };
    });
    
    log('success', `Transazione completata con successo, ID Scenario: ${transactionResult.scenarioId}, ID Quiz: ${transactionResult.quizId}`);
    
    // Verifica che entrambi i documenti siano stati inseriti
    const scenario = await scenariosRepo.findById(transactionResult.scenarioId);
    const quiz = await quizzesRepo.findById(transactionResult.quizId);
    
    if (scenario && quiz) {
      log('success', `Entrambi i documenti inseriti dalla transazione sono presenti nel database`);
    } else {
      throw new Error("Errore nella verifica dei documenti inseriti dalla transazione");
    }
    
    // Test transazione fallita
    log('test', "Test transazione fallita (rollback)...");
    try {
      await withTransaction(async (session) => {
        // Inserisci un documento valido
        const scenarioInsert = await scenariosRepo.insertOne(
          { ...DATI_TEST.scenarios[0], titolo: "Questo scenario sarà rollback" },
          { session }
        );
        
        log('info', `Fase 1 transazione: scenario inserito con ID: ${scenarioInsert._id}`);
        
        // Ora forza un errore per causare rollback
        throw new Error("Errore simulato per testare rollback");
      });
    } catch (error) {
      // La transazione dovrebbe fallire qui
      log('success', `La transazione è fallita come previsto: ${error.message}`);
      
      // Verifica che il documento non sia stato inserito (rollback)
      const failedScenarios = await scenariosRepo.find({ titolo: "Questo scenario sarà rollback" });
      
      if (failedScenarios.length === 0) {
        log('success', `Rollback funzionante: lo scenario non è stato inserito nel database`);
      } else {
        throw new Error("Errore nel rollback della transazione");
      }
    }
  } catch (error) {
    log('error', `Test transazioni fallito: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Test funzione withRetry per gestione resiliente errori
 */
async function testRetryMechanism() {
  printTitle("Test Meccanismo Retry");
  
  try {
    log('test', "Test withRetry con errori temporanei...");
    
    // Controlla quanti tentativi ci vogliono per avere successo
    let attemptCount = 0;
    const maxAttempts = 5;
    const expectedSuccessAttempt = 3; // L'operazione avrà successo al terzo tentativo
    
    const result = await withRetry(async () => {
      attemptCount++;
      log('info', `Tentativo ${attemptCount}/${maxAttempts}...`);
      
      if (attemptCount < expectedSuccessAttempt) {
        // Simula diversi tipi di errore temporaneo
        if (attemptCount === 1) {
          throw new Error("Errore di rete simulato");
        } else if (attemptCount === 2) {
          const error = new Error("Timeout connessione simulato");
          error.code = 'ETIMEDOUT';
          throw error;
        }
      }
      
      // Al terzo tentativo (o successivi) ritorna con successo
      return `Operazione completata con successo al tentativo ${attemptCount}`;
    }, {
      maxAttempts,
      initialDelayMs: 100,
      operationName: "test-retry-operazione"
    });
    
    if (attemptCount === expectedSuccessAttempt) {
      log('success', `withRetry ha funzionato correttamente: successo al tentativo ${attemptCount}`);
      log('success', `Risultato: ${result}`);
    } else {
      throw new Error(`withRetry non ha funzionato come previsto: successo al tentativo ${attemptCount} invece che ${expectedSuccessAttempt}`);
    }
    
    // Test fallimento dopo tutti i tentativi
    log('test', "Test withRetry che fallisce dopo tutti i tentativi...");
    
    attemptCount = 0;
    const maxFailedAttempts = 3;
    
    try {
      await withRetry(async () => {
        attemptCount++;
        log('info', `Tentativo ${attemptCount}/${maxFailedAttempts}...`);
        
        // Fallisce sempre
        throw new Error(`Errore permanente simulato (tentativo ${attemptCount})`);
      }, {
        maxAttempts: maxFailedAttempts,
        initialDelayMs: 50,
        operationName: "test-retry-fallimento"
      });
      
      throw new Error("withRetry non ha fallito come previsto");
    } catch (error) {
      if (attemptCount === maxFailedAttempts) {
        log('success', `withRetry ha correttamente fallito dopo ${maxFailedAttempts} tentativi`);
      } else {
        throw new Error(`withRetry ha fallito dopo ${attemptCount} tentativi invece che ${maxFailedAttempts}`);
      }
    }
  } catch (error) {
    log('error', `Test meccanismo retry fallito: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Test di performance semplice
 * @param {Object} db - Connessione database
 */
async function testPerformance(db) {
  printTitle("Test Performance Repository");
  
  // Crea repository per il test
  const testRepo = createRepository('performance_test');
  
  // Numero di documenti da inserire
  const NUM_DOCUMENTS = 100;
  
  try {
    // Pulizia iniziale
    log('info', "Pulizia collezione test...");
    await db.collection('performance_test').deleteMany({});
    
    // Genera dati di test
    const testDocuments = [];
    for (let i = 0; i < NUM_DOCUMENTS; i++) {
      testDocuments.push({
        index: i,
        name: `Test Document ${i}`,
        value: Math.random() * 1000,
        tags: [`tag${i % 5}`, `category${i % 10}`],
        isActive: i % 3 === 0,
        created: new Date()
      });
    }
    
    // Test inserimento batch
    log('test', `Inserimento batch di ${NUM_DOCUMENTS} documenti...`);
    const startInsert = Date.now();
    
    for (const doc of testDocuments) {
      await testRepo.insertOne(doc);
    }
    
    const insertDuration = Date.now() - startInsert;
    log('success', `Inserimento completato in ${insertDuration}ms (${(insertDuration / NUM_DOCUMENTS).toFixed(2)}ms per documento)`);
    
    // Test lettura con filtro
    log('test', "Test lettura con filtro...");
    const startRead = Date.now();
    
    const results = await testRepo.find({ isActive: true });
    
    const readDuration = Date.now() - startRead;
    log('success', `Lettura di ${results.length} documenti completata in ${readDuration}ms`);
    
    // Test aggregazione
    log('test', "Test aggregazione...");
    const startAggr = Date.now();
    
    const aggrResults = await testRepo.aggregate([
      { $group: { _id: "$isActive", count: { $sum: 1 }, avgValue: { $avg: "$value" } } }
    ]);
    
    const aggrDuration = Date.now() - startAggr;
    log('success', `Aggregazione completata in ${aggrDuration}ms`);
    log('info', `Risultati aggregazione: ${JSON.stringify(aggrResults)}`);
    
    // Test eliminazione batch
    log('test', `Eliminazione batch di documenti...`);
    const startDelete = Date.now();
    
    const deleteResult = await db.collection('performance_test').deleteMany({});
    
    const deleteDuration = Date.now() - startDelete;
    log('success', `Eliminazione di ${deleteResult.deletedCount} documenti completata in ${deleteDuration}ms`);
  } catch (error) {
    log('error', `Test performance fallito: ${error.message}`);
    if (error.stack) console.error(error.stack);
  }
}

/**
 * Esecuzione di tutti i test
 */
async function runAllTests() {
  let db;
  
  try {
    printTitle("INIZIO TEST PATTERN REPOSITORY CON DATI REALI");
    log('info', "Connessione al database...");
    
    // Connessione al database
    db = await connectToDatabase();
    log('success', "Connessione al database MongoDB stabilita");
    
    // Esegui tutti i test
    await testRepositoryUtenti(db);
    await testRepositoryCorsi(db);
    await testTransazioni(db);
    await testRetryMechanism();
    await testPerformance(db);
    
    printTitle("TUTTI I TEST COMPLETATI");
  } catch (error) {
    log('error', `Errore generale nei test: ${error.message}`);
    if (error.stack) console.error(error.stack);
  } finally {
    // Chiudi la connessione al database
    if (db) {
      log('info', "Chiusura connessione database...");
      await closeConnection();
      log('success', "Connessione database chiusa");
    }
  }
}

// Esecuzione dei test
runAllTests()
  .then(() => {
    log('info', "Esecuzione test completata");
    process.exit(0);
  })
  .catch(error => {
    log('error', `Errore non gestito: ${error.message}`);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  });
