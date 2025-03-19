import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { connectToDatabase, getDb } from './database/mongodb.js';
import { ObjectId } from 'mongodb';

// Inizializzazione Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware per connessione MongoDB
app.use(async (req, res, next) => {
  try {
    // Assicura che il database sia connesso
    if (!getDb()) {
      await connectToDatabase();
    }
    next();
  } catch (error) {
    console.error('Errore di connessione DB:', error);
    res.status(500).json({ error: 'Errore di connessione al database' });
  }
});

// Rotta di base/healthcheck
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API per utenti
app.get('/api/users', async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection('users').find({}).limit(50).toArray();
    res.json(users);
  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    res.status(500).json({ error: 'Errore nel recupero utenti' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    
    // Controlla che l'ID sia valido
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utente non valido' });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    res.status(500).json({ error: 'Errore nel recupero utente' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const db = getDb();
    const newUser = req.body;
    
    // Validazione base (si potrebbe usare una libreria come Joi per validazione più completa)
    if (!newUser.email) {
      return res.status(400).json({ error: 'Email richiesta' });
    }
    
    // Controlla se l'utente esiste già
    const existingUser = await db.collection('users').findOne({ email: newUser.email });
    if (existingUser) {
      return res.status(409).json({ error: 'Utente già esistente con questa email' });
    }
    
    const result = await db.collection('users').insertOne(newUser);
    res.status(201).json({ 
      id: result.insertedId,
      ...newUser
    });
  } catch (error) {
    console.error('Errore nella creazione utente:', error);
    res.status(500).json({ error: 'Errore nella creazione utente' });
  }
});

// API per documenti
app.get('/api/documents', async (req, res) => {
  try {
    const db = getDb();
    const documents = await db.collection('documents').find({}).limit(50).toArray();
    res.json(documents);
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero documenti' });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID documento non valido' });
    }
    
    const document = await db.collection('documents').findOne({ _id: new ObjectId(id) });
    
    if (!document) {
      return res.status(404).json({ error: 'Documento non trovato' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Errore nel recupero documento:', error);
    res.status(500).json({ error: 'Errore nel recupero documento' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const db = getDb();
    const newDocument = req.body;
    
    // Validazione semplice
    if (!newDocument.title) {
      return res.status(400).json({ error: 'Titolo richiesto' });
    }
    
    const result = await db.collection('documents').insertOne(newDocument);
    res.status(201).json({ 
      id: result.insertedId,
      ...newDocument
    });
  } catch (error) {
    console.error('Errore nella creazione documento:', error);
    res.status(500).json({ error: 'Errore nella creazione documento' });
  }
});

// Avvio del server
async function startServer() {
  try {
    console.log('Tentativo di avvio del server Express...');
    
    // Connessione al database prima di avviare il server
    console.log('Tentativo di connessione a MongoDB...');
    await connectToDatabase();
    console.log('Connessione a MongoDB stabilita.');
    
    // Avvio del server
    app.listen(PORT, () => {
      console.log(`Server in esecuzione su http://localhost:${PORT}`);
      console.log(`API disponibili su http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error);
    console.error('Dettagli errore:', error.stack);
    process.exit(1);
  }
}

// Esporta per poter essere utilizzato come modulo
export { app, startServer };

// Se il file viene eseguito direttamente e non importato
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
