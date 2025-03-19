// Script per creare un utente amministratore nel database MongoDB
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URI di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";

// Dettagli dell'utente admin da creare
const admin = {
  email: "admin@cafasso-academy.it",
  username: "admin",
  password: "Cafasso@admin2025!",
  full_name: "Amministratore Sistema",
  role: "ADMIN",
  isVerified: true,
  created_at: new Date(),
  updated_at: new Date()
};

// Funzione principale
async function createAdminUser() {
  console.log("Script di creazione utente amministratore");
  console.log("==========================================");
  
  let client;
  try {
    // Connessione a MongoDB
    console.log(`Connessione a MongoDB: ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✓ Connessione a MongoDB stabilita");
    
    const db = client.db('cafasso_academy');
    
    // Verifica se l'utente esiste già
    const existingUser = await db.collection('users').findOne({ 
      $or: [
        { email: admin.email },
        { username: admin.username }
      ]
    });
    
    if (existingUser) {
      console.log(`! L'utente con email ${admin.email} o username ${admin.username} esiste già.`);
      
      // Se l'utente esiste ma non è admin, aggiorniamo il ruolo
      if (existingUser.role !== 'ADMIN') {
        console.log("L'utente esiste ma non è admin. Aggiornamento del ruolo...");
        await db.collection('users').updateOne(
          { _id: existingUser._id },
          { 
            $set: { 
              role: 'ADMIN',
              updated_at: new Date()
            } 
          }
        );
        console.log(`✓ Ruolo dell'utente aggiornato a ADMIN`);
      } else {
        console.log("L'utente è già un amministratore.");
      }
    } else {
      // Crea l'utente admin
      console.log("Creazione nuovo utente amministratore...");
      
      // Hash della password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(admin.password, saltRounds);
      
      // Dati da inserire
      const adminData = {
        email: admin.email,
        username: admin.username,
        password_hash,
        full_name: admin.full_name,
        role: admin.role,
        isVerified: admin.isVerified,
        created_at: admin.created_at,
        updated_at: admin.updated_at
      };
      
      const result = await db.collection('users').insertOne(adminData);
      console.log(`✓ Utente amministratore creato con ID: ${result.insertedId}`);
    }
    
    // Verifica finale
    const adminUser = await db.collection('users').findOne({ email: admin.email });
    console.log("\nDettagli utente amministratore:");
    console.log(`- ID: ${adminUser._id}`);
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Username: ${adminUser.username}`);
    console.log(`- Nome: ${adminUser.full_name}`);
    console.log(`- Ruolo: ${adminUser.role}`);
    console.log(`- Verificato: ${adminUser.isVerified}`);
    console.log(`- Creato il: ${adminUser.created_at}`);
    
    // Crea un file di credenziali per riferimento futuro
    const credentialsInfo = `
CREDENZIALI UTENTE AMMINISTRATORE
===============================
Email: ${admin.email}
Username: ${admin.username}
Password: ${admin.password}
Ruolo: ${admin.role}

Queste credenziali possono essere utilizzate per accedere al pannello di amministrazione.
Per motivi di sicurezza, modificare la password dopo il primo accesso.
    `;
    
    fs.writeFileSync(path.join(__dirname, 'admin-credentials.txt'), credentialsInfo);
    console.log("\n✓ File di credenziali creato: admin-credentials.txt");
    
    console.log("\nPROCESSO COMPLETATO CON SUCCESSO!");
    
  } catch (error) {
    console.error("Errore durante la creazione dell'utente amministratore:", error);
  } finally {
    // Chiudi la connessione
    if (client) {
      await client.close();
      console.log("Connessione a MongoDB chiusa");
    }
  }
}

// Esecuzione della funzione principale
createAdminUser().catch(console.error);
