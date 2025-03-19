// Server Express per MongoDB
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente dal file .env
dotenv.config();

// Stampa le chiavi (solo per debugging)
console.log('API Keys disponibili:');
console.log('OpenRouter:', process.env.OPENROUTER_API_KEY ? 'Sì' : 'No');
console.log('Groq:', process.env.GROQ_API_KEY ? 'Sì' : 'No');

// Importo le API di autenticazione e lo script di migrazione
import authRouter, { authenticateToken, requireAdmin } from './server/api-auth.js';
import migrateSupabaseTables from './migrazione-supabase-tabelle.js';

// URI di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "http://localhost:3000";

// Configurazione email (usa un servizio di test in sviluppo)
const emailTransporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: "zppqc4rvqkxc3axd@ethereal.email", // credenziali di test generate
    pass: "AFyZWcPECCSNqHYUeK"
  }
});

// In un ambiente di produzione, usare un servizio SMTP reale:
/*
const emailTransporter = nodemailer.createTransport({
  host: "smtp.hostingreale.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
*/

// Variabile per memorizzare la connessione
let db;

// Variabili per la gestione della connessione MongoDB
let mongoClient;
let isReconnecting = false;
const RECONNECT_INTERVAL_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectAttempts = 0;

// Opzioni di connessione MongoDB
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  wtimeoutMS: 2500,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 15000
};

/**
 * Gestisce gli eventi di connessione MongoDB
 * @param {MongoClient} client - Client MongoDB
 */
function setupConnectionHandlers(client) {
  client.on('close', () => {
    console.log("⚠️ Connessione MongoDB chiusa");
    attemptReconnection();
  });

  client.on('error', (error) => {
    console.error("❌ Errore nella connessione MongoDB:", error);
    attemptReconnection();
  });

  client.on('timeout', () => {
    console.error("⚠️ Timeout della connessione MongoDB");
    attemptReconnection();
  });

  client.on('reconnect', () => {
    console.log("✅ MongoDB riconnesso con successo");
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
      console.error(`❌ Superato il numero massimo di tentativi di riconnessione (${MAX_RECONNECT_ATTEMPTS})`);
      console.error("Il server continuerà a funzionare ma le operazioni database potrebbero fallire");
      console.error("È necessario un riavvio manuale del server");
      isReconnecting = false;
      return;
    }
    
    reconnectAttempts++;
    
    // Calcola timeout esponenziale
    const timeout = RECONNECT_INTERVAL_MS * Math.pow(1.5, reconnectAttempts - 1);
    
    console.log(`⏳ Tentativo di riconnessione ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} a MongoDB tra ${Math.round(timeout / 1000)} secondi...`);
    
    // Attendi prima di riconnetterti (backoff esponenziale)
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Se c'è un client esistente, chiudilo
    if (mongoClient) {
      try {
        await mongoClient.close(true);
      } catch (err) {
        console.warn("Errore durante la chiusura del client MongoDB:", err);
      }
    }
    
    // Crea un nuovo client e connettiti
    mongoClient = new MongoClient(MONGODB_URI, mongoOptions);
    await mongoClient.connect();
    
    // Imposta gli handler per la nuova connessione
    setupConnectionHandlers(mongoClient);
    
    // Aggiorna la connessione globale
    db = mongoClient.db('cafasso_academy');
    
    console.log("✅ MongoDB riconnesso con successo");
    
    // Verifica che tutte le collezioni necessarie esistano
    await checkAndInitializeCollections();
    
    reconnectAttempts = 0; // Reset contatore tentativi
  } catch (error) {
    console.error(`❌ Tentativo di riconnessione ${reconnectAttempts} fallito:`, error);
    
    // Metti in coda il prossimo tentativo
    setTimeout(attemptReconnection, RECONNECT_INTERVAL_MS);
  } finally {
    isReconnecting = false;
  }
}

/**
 * Verifica e inizializza le collezioni necessarie
 */
async function checkAndInitializeCollections() {
  try {
    // Verifica collezioni
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log("Collezioni disponibili:", collectionNames);
    
    // Elenco delle collezioni richieste
    const requiredCollections = ['users', 'documents', 'scenarios', 'conversations', 'media'];
    
    // Verifica e crea le collezioni mancanti
    for (const collName of requiredCollections) {
      if (!collectionNames.includes(collName)) {
        console.log(`Creazione collezione mancante: ${collName}`);
        await db.createCollection(collName);
      }
    }
  } catch (error) {
    console.error("Errore durante la verifica delle collezioni:", error);
  }
}

// Funzione di connessione al database
async function connectToMongoDB() {
  try {
    console.log("⏳ Tentativo di connessione a MongoDB...");
    
    // Crea un nuovo client MongoDB
    mongoClient = new MongoClient(MONGODB_URI, mongoOptions);
    
    // Connetti al server
    await mongoClient.connect();
    
    // Configura gli handler di connessione
    setupConnectionHandlers(mongoClient);
    
    // Memorizza la connessione
    db = mongoClient.db('cafasso_academy');
    
    console.log("✅ Connessione a MongoDB riuscita!");
    
    // Verifica collezioni
    await checkAndInitializeCollections();
    
    // Migra le tabelle da Supabase a MongoDB
    try {
      console.log("Avvio migrazione tabelle Supabase...");
      await migrateSupabaseTables();
      console.log("✅ Migrazione delle tabelle completata!");
    } catch (migrationError) {
      console.error("⚠️ Errore nella migrazione delle tabelle:", migrationError);
      console.log("Continuo con l'avvio del server nonostante l'errore di migrazione...");
    }
    
    return db;
  } catch (error) {
    console.error("❌ Errore di connessione MongoDB:", error);
    
    // Avvia la riconnessione dopo un breve ritardo
    setTimeout(attemptReconnection, RECONNECT_INTERVAL_MS);
    
    throw error;
  }
}

// Inizializzazione Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Imposta la db reference per i router
app.use((req, res, next) => {
  req.app.locals.db = db;
  next();
});

// Healthcheck endpoint
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mongodb: db ? 'connected' : 'disconnected'
  });
});

// Genera un token di verifica casuale
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Invia email di conferma registrazione
const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${HOST}/api/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: '"Cafasso Academy" <noreply@cafasso-academy.it>',
      to: email,
      subject: 'Conferma la tua email per Cafasso Academy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7;">Cafasso Academy</h2>
          <p>Grazie per esserti registrato a Cafasso Academy!</p>
          <p>Per confermare il tuo account, clicca sul link qui sotto:</p>
          <p>
            <a 
              href="${verificationUrl}" 
              style="display: inline-block; background-color: #a855f7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
            >
              Conferma Email
            </a>
          </p>
          <p>Oppure copia e incolla questo URL nel tuo browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>Questo link scadrà tra 24 ore.</p>
          <p>Se non hai richiesto questo account, ignora questa email.</p>
        </div>
      `
    };
    
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email di verifica inviata:', info.messageId);
    return info;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email di verifica:', error);
    throw error;
  }
};

// Usa il router di autenticazione
app.use('/api/auth', authRouter);

// API per verifica email
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token mancante' });
    }

    // Cerca l'utente con il token di verifica
    const user = await db.collection('users').findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ error: 'Token non valido' });
    }

    // Verifica che il token non sia scaduto
    if (new Date() > new Date(user.tokenExpires)) {
      return res.status(400).json({ error: 'Token scaduto' });
    }

    // Aggiorna l'utente come verificato
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { isVerified: true },
        $unset: { verificationToken: "", tokenExpires: "" }
      }
    );

    // Genera una semplice pagina HTML di conferma
    const htmlResponse = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email verificata | Cafasso Academy</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
          color: #333;
        }
        .success {
          color: #10b981;
          margin-bottom: 1rem;
        }
        .card {
          background-color: #f9fafb;
          border-radius: 0.5rem;
          padding: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .button {
          display: inline-block;
          background-color: #a855f7;
          color: white;
          padding: 0.75rem 1.5rem;
          text-decoration: none;
          border-radius: 0.25rem;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="success">Email verificata con successo!</h1>
        <p>Il tuo account è stato attivato. Ora puoi accedere a Cafasso Academy.</p>
        <a href="${HOST}" class="button">Vai alla pagina di login</a>
      </div>
    </body>
    </html>
    `;

    // Invia risposta HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlResponse);
  } catch (error) {
    console.error('Errore nella verifica email:', error);
    res.status(500).json({ error: 'Errore durante la verifica email' });
  }
});

// API per utenti - richiedi autenticazione
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.collection('users').find({}).limit(50).toArray();
    res.json(users);
  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    res.status(500).json({ error: 'Errore nel recupero utenti' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newUser = req.body;
    
    // Validazione base
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

// API per invio email
app.post('/api/email/send', authenticateToken, async (req, res) => {
  try {
    const { type, recipient, subject, token, template } = req.body;

    // Validazione di base
    if (!type || !recipient || !subject) {
      return res.status(400).json({ error: 'Tipo, destinatario e oggetto sono richiesti' });
    }

    // Verifica email in formato valido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    // Genera token se necessario e non fornito
    let verificationToken = token;
    if ((type === 'verification' || type === 'password_reset') && !token) {
      verificationToken = generateVerificationToken();
    }

    // Costruisci l'URL di verifica
    const verificationUrl = `${HOST}/api/auth/verify-email?token=${verificationToken}`;
    const resetUrl = `${HOST}/api/auth/reset-password?token=${verificationToken}`;

    // Seleziona il template in base al tipo
    let htmlContent = '';
    if (template) {
      // Usa template personalizzato fornito
      htmlContent = template;
    } else if (type === 'verification') {
      // Template per verifica account
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7;">Cafasso Academy</h2>
          <p>Grazie per esserti registrato a Cafasso Academy!</p>
          <p>Per confermare il tuo account, clicca sul link qui sotto:</p>
          <p>
            <a 
              href="${verificationUrl}" 
              style="display: inline-block; background-color: #a855f7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
            >
              Conferma Email
            </a>
          </p>
          <p>Oppure copia e incolla questo URL nel tuo browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>Questo link scadrà tra 24 ore.</p>
          <p>Se non hai richiesto questo account, ignora questa email.</p>
        </div>
      `;
    } else if (type === 'welcome') {
      // Template di benvenuto
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7;">Benvenuto su Cafasso Academy!</h2>
          <p>Ciao,</p>
          <p>Grazie per esserti registrato su Cafasso Academy. Siamo felici di averti con noi!</p>
          <p>La tua registrazione è stata completata con successo e ora puoi accedere a tutti i nostri corsi e risorse.</p>
          <p>
            <a 
              href="${HOST}" 
              style="display: inline-block; background-color: #a855f7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
            >
              Accedi alla Piattaforma
            </a>
          </p>
          <p>Per qualsiasi domanda o supporto, non esitare a contattarci.</p>
          <p>Cordiali saluti,<br>Il team di Cafasso Academy</p>
        </div>
      `;
    } else if (type === 'password_reset') {
      // Template per reset password
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7;">Reset della Password</h2>
          <p>Hai richiesto il reset della password per il tuo account Cafasso Academy.</p>
          <p>Clicca sul link qui sotto per impostare una nuova password:</p>
          <p>
            <a 
              href="${resetUrl}" 
              style="display: inline-block; background-color: #a855f7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;"
            >
              Reset Password
            </a>
          </p>
          <p>Oppure copia e incolla questo URL nel tuo browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>Questo link scadrà tra 1 ora.</p>
          <p>Se non hai richiesto questo reset, ignora questa email o contatta l'assistenza.</p>
        </div>
      `;
    } else {
      return res.status(400).json({ error: 'Tipo di email non valido' });
    }

    // Sostituzione dei placeholder
    htmlContent = htmlContent
      .replace(/{{name}}/g, 'Utente')
      .replace(/{{verificationUrl}}/g, verificationUrl)
      .replace(/{{resetUrl}}/g, resetUrl);

    // Configurazione email
    const mailOptions = {
      from: '"Cafasso Academy" <noreply@cafasso-academy.it>',
      to: recipient,
      subject,
      html: htmlContent
    };
    
    // Invio email
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email inviata:', info.messageId);
    
    // Per Ethereal, ottieni e restituisci l'URL di anteprima
    const previewUrl = nodemailer.getTestMessageUrl(info);
    
    // Restituisci il risultato
    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl,
      recipient,
      subject,
      type,
      token: verificationToken
    });
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    res.status(500).json({ error: 'Errore durante l\'invio dell\'email' });
  }
});

// API per documenti - richiedi autenticazione
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await db.collection('documents').find({}).limit(50).toArray();
    res.json(documents);
  } catch (error) {
    console.error('Errore nel recupero documenti:', error);
    res.status(500).json({ error: 'Errore nel recupero documenti' });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  try {
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

// API per verificare stato dell'admin
app.get('/api/admin/check', authenticateToken, async (req, res) => {
  try {
    // Se il middleware authenticateToken è stato superato, l'utente è autenticato
    // Ora verifichiamo il ruolo
    const isAdmin = req.user.role === 'ADMIN';
    
    res.json({
      isAdmin,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        username: req.user.username
      }
    });
  } catch (error) {
    console.error('Errore nella verifica stato admin:', error);
    res.status(500).json({ error: 'Errore nella verifica stato admin' });
  }
});

// Importa le API media e i nuovi router
import { router as mediaRouter, serveMediaFiles } from './server/api-media.js';
import { router as scenariosRouter } from './server/api-scenarios.js';
import { router as aiRouter } from './server/api-ai.js';
import { router as webhookRouter } from './server/api-webhook.js';

// Crea directory per uploads se non esiste
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Collega i router alle API
app.use('/api/media', mediaRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/ai', aiRouter);
app.use('/api/webhooks', webhookRouter);

// Serve i file statici dalla directory uploads
app.use('/uploads', serveMediaFiles);

// Avvio del server
async function startServer() {
  try {
    console.log('Avvio del server Express con MongoDB...');
    
    // Connessione a MongoDB
    await connectToMongoDB();
    
    // Avvio del server
    app.listen(PORT, () => {
      console.log(`Server in esecuzione su http://localhost:${PORT}`);
      console.log(`API disponibili su http://localhost:${PORT}/api`);
      console.log(`API Auth su http://localhost:${PORT}/api/auth`);
      console.log(`API Media su http://localhost:${PORT}/api/media`);
      console.log(`API Webhook su http://localhost:${PORT}/api/webhooks`);
      console.log(`Files media in http://localhost:${PORT}/uploads`);
    });
  } catch (error) {
    console.error('Errore nell\'avvio del server:', error);
    process.exit(1);
  }
}

// Avvio del server
startServer();
