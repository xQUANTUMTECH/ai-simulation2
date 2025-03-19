// Script di test semplice per MongoDB
import { MongoClient } from 'mongodb';

// URI di connessione MongoDB
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";

async function testConnection() {
  console.log("Tentativo di connessione a MongoDB...");
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Connessione a MongoDB riuscita!");
    
    // Lista dei database disponibili
    const adminDb = client.db("admin");
    const dbs = await adminDb.admin().listDatabases();
    console.log("Database disponibili:", dbs.databases.map(db => db.name));
    
    // Verifica database cafasso_academy
    const db = client.db("cafasso_academy");
    const collections = await db.listCollections().toArray();
    console.log("Collezioni nel database cafasso_academy:", collections.map(c => c.name));
    
    // Creiamo collezioni di test se non esistono
    if (collections.length === 0) {
      console.log("Nessuna collezione trovata, creo collezioni di test...");
      await db.createCollection("users");
      await db.createCollection("documents");
      console.log("Collezioni di test create!");
    }
    
    // Chiusura della connessione
    await client.close();
    console.log("Connessione chiusa");
  } catch (error) {
    console.error("❌ Errore di connessione:", error);
    console.error("Stack completo:", error.stack);
  }
}

// Esegui il test
testConnection().catch(console.error);
