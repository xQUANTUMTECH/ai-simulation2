import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb, withRetry } from './database/mongodb.js';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

// Configurazione sistema di logging avanzato
const LOG_DIR = path.join(process.cwd(), 'logs');
const AUTH_LOG_FILE = path.join(LOG_DIR, 'auth.log');

// Crea la directory dei logs se non esiste
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Funzione di logging
const logAuth = (level, message, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...details
  };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  
  try {
    fs.appendFileSync(
      AUTH_LOG_FILE, 
      JSON.stringify(logEntry) + '\n', 
      { flag: 'a' }
    );
  } catch (error) {
    console.error('Errore scrittura log:', error);
  }
};

// Configurazione router Express
const router = express.Router();

// Secret per JWT (idealmente dovrebbe essere in variabili d'ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'cafasso-ai-academy-secret-key';

// Middleware per verificare il token di autenticazione
export const authenticateToken = async (req, res, next) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const requestPath = req.originalUrl || req.url;
  const requestMethod = req.method;
  const requestIP = req.ip || req.connection.remoteAddress;
  
  logAuth('debug', `Richiesta autenticazione ${requestId}`, { 
    path: requestPath, 
    method: requestMethod, 
    ip: requestIP
  });
  
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      logAuth('warn', `Autenticazione fallita: token mancante ${requestId}`, { 
        path: requestPath 
      });
      return res.status(401).json({ error: 'Token di autenticazione mancante' });
    }
    
    // Verifica il token JWT con Promise invece del callback
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          logAuth('warn', `Verifica token fallita ${requestId}`, { 
            error: err.name,
            message: err.message
          });
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
    
    logAuth('debug', `Token decodificato ${requestId}`, {
      userId: decoded.id,
      role: decoded.role
    });
    
    // Verifica che l'utente esista ancora nel database
    const db = getDb();
    if (!db) {
      logAuth('error', `Connessione al database fallita ${requestId}`);
      return res.status(500).json({ error: 'Errore di connessione al database' });
    }
    
    if (!ObjectId.isValid(decoded.id)) {
      logAuth('warn', `ID utente non valido nel token ${requestId}`, { 
        id: decoded.id 
      });
      return res.status(400).json({ error: 'ID utente non valido nel token' });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
    
    if (!user) {
      logAuth('warn', `Utente non trovato nel database ${requestId}`, { 
        userId: decoded.id 
      });
      return res.status(403).json({ error: 'Utente non trovato o account disattivato' });
    }
    
    // Aggiorna req.user con i dati più recenti dell'utente dal database
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role || 'USER'  // Assicura che ci sia sempre un ruolo
    };
    
    logAuth('info', `Utente autenticato ${requestId}`, { 
      userId: req.user.id,
      username: req.user.username, 
      role: req.user.role,
      path: requestPath,
      method: requestMethod
    });
    
    next();
  } catch (error) {
    logAuth('error', `Errore di autenticazione ${requestId}`, { 
      error: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto, effettua nuovamente il login' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token non valido' });
    } else {
      return res.status(500).json({ error: 'Errore interno durante l\'autenticazione' });
    }
  }
};

// Middleware per verificare il ruolo admin
export const requireAdmin = (req, res, next) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  const requestPath = req.originalUrl || req.url;
  const requestMethod = req.method;
  const requestIP = req.ip || req.connection.remoteAddress;
  
  logAuth('debug', `Verifica ruolo admin ${requestId}`, { 
    path: requestPath, 
    method: requestMethod 
  });
  
  if (!req.user) {
    logAuth('warn', `Verifica admin fallita: utente non autenticato ${requestId}`, { 
      path: requestPath 
    });
    return res.status(401).json({ error: 'Utente non autenticato' });
  }
  
  if (req.user.role !== 'ADMIN') {
    logAuth('warn', `Accesso admin negato ${requestId}`, { 
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      path: requestPath
    });
    return res.status(403).json({ error: 'Accesso non autorizzato. Richiesto ruolo admin.' });
  }
  
  logAuth('info', `Accesso admin autorizzato ${requestId}`, { 
    userId: req.user.id,
    username: req.user.username,
    path: requestPath,
    method: requestMethod,
    ip: requestIP
  });
  
  next();
};

// Route per il login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password richieste' });
    }
    
    const db = getDb();
    
    // Verifica che il database sia disponibile
    if (!db) {
      logAuth('error', 'Connessione al database non disponibile durante login');
      return res.status(500).json({ error: 'Errore di connessione al database' });
    }
    
    // Cerca l'utente per email, usando una normale query senza withRetry per semplicità
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    // Verifica la password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }
    
    // Genera token JWT
    const token = jwt.sign(
      { 
        id: user._id.toString(),
        email: user.email,
        role: user.role || 'USER',
        username: user.username
      }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Rimuovi la password hash dal risultato
    const { password_hash, ...userWithoutPassword } = user;
    
    // Converti l'ObjectId in stringa
    userWithoutPassword._id = userWithoutPassword._id.toString();
    
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ error: 'Errore durante il login' });
  }
});

// Route per la registrazione utente
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, full_name, company } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password e username richiesti' });
    }
    
    const db = getDb();
    
    // Verifica che il database sia disponibile
    if (!db) {
      logAuth('error', 'Connessione al database non disponibile durante registrazione');
      return res.status(500).json({ error: 'Errore di connessione al database' });
    }

    // Utilizzo della funzione withRetry per le operazioni sul database
    try {
      // Verifica se l'email è già in uso
      const existingUserByEmail = await withRetry(
        async () => db.collection('users').findOne({ email }),
        { collection: db.collection('users'), operationName: 'Verifica email durante registrazione' }
      );
      
      if (existingUserByEmail) {
        return res.status(409).json({ error: 'Email già in uso' });
      }
      
      // Verifica se l'username è già in uso
      const existingUserByUsername = await withRetry(
        async () => db.collection('users').findOne({ username }),
        { collection: db.collection('users'), operationName: 'Verifica username durante registrazione' }
      );
      
      if (existingUserByUsername) {
        return res.status(409).json({ error: 'Username già in uso' });
      }
      
      // Hash della password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      // Crea il nuovo utente
      const newUser = {
        email,
        username,
        password_hash,
        full_name: full_name || '',
        company: company || '',
        role: 'USER', // Default role
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const result = await withRetry(
        async () => db.collection('users').insertOne(newUser),
        { collection: db.collection('users'), operationName: 'Inserimento nuovo utente' }
      );
      
      // Rimuovi la password hash dal risultato
      const { password_hash: _, ...userWithoutPassword } = newUser;
      
      // Aggiungi l'ID generato
      userWithoutPassword._id = result.insertedId.toString();
      
      res.status(201).json({
        user: userWithoutPassword,
        message: 'Utente registrato con successo'
      });
      
      return; // Termina la funzione qui dopo il successo
      
    } catch (dbError) {
      logAuth('error', 'Errore operazione database durante registrazione', {
        error: dbError.name,
        message: dbError.message,
        stack: dbError.stack
      });
      return res.status(500).json({ error: 'Errore durante l\'operazione sul database' });
    }
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore durante la registrazione' });
  }
});

// Route per ottenere i dati dell'utente corrente
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utente non valido' });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Rimuovi la password hash dal risultato
    const { password_hash, ...userWithoutPassword } = user;
    
    // Converti l'ObjectId in stringa
    userWithoutPassword._id = userWithoutPassword._id.toString();
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Errore nel recupero dati utente:', error);
    res.status(500).json({ error: 'Errore nel recupero dati utente' });
  }
});

// Route per verificare se l'utente è admin con doppia verifica dal database
router.get('/check-admin', authenticateToken, async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  
  try {
    // Prima verifica dal token decodificato
    const tokenAdmin = req.user.role === 'ADMIN';
    
    // Seconda verifica direttamente dal database per sicurezza
    const db = getDb();
    if (!db) {
      logAuth('error', `Connessione al database fallita durante verifica admin ${requestId}`);
      return res.status(500).json({ error: 'Errore di connessione al database' });
    }
    
    if (!ObjectId.isValid(req.user.id)) {
      logAuth('warn', `ID utente non valido durante verifica admin ${requestId}`);
      return res.status(400).json({ error: 'ID utente non valido' });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    
    if (!user) {
      logAuth('warn', `Utente non trovato nel database durante verifica admin ${requestId}`);
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    // Verifica se l'utente è realmente admin nel database
    const dbAdmin = user.role === 'ADMIN';
    
    // Log per debug
    logAuth('info', `Verifica admin completata ${requestId}`, {
      userId: req.user.id,
      tokenAdmin,
      dbAdmin,
      match: tokenAdmin === dbAdmin
    });
    
    // Se c'è discrepanza tra token e DB, dare priorità al database
    const isAdmin = dbAdmin;
    
    res.json({ isAdmin, verified: true });
  } catch (error) {
    logAuth('error', `Errore nella verifica ruolo admin ${requestId}`, {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Errore nella verifica ruolo admin', verified: false });
  }
});

// Route per logout (invalidazione token lato server non necessaria con JWT,
// ma utile per eventuali altre operazioni di cleanup)
router.post('/logout', authenticateToken, (req, res) => {
  // Con JWT, il client dovrebbe semplicemente rimuovere il token
  // Qui possiamo aggiungere logica per token blacklisting se necessario
  res.json({ message: 'Logout effettuato con successo' });
});

// Esporta il router
export default router;
