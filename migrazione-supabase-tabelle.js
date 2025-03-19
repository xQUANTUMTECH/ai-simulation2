// Script per migrare e creare tutte le tabelle di Supabase su MongoDB
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URI di connessione MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";

// Funzione principale per la migrazione
async function migrateSupabaseTables() {
  console.log("=====================================================");
  console.log("Migrazione delle tabelle Supabase a MongoDB");
  console.log("=====================================================");
  
  let client;
  try {
    // Connessione a MongoDB
    console.log(`Connessione a MongoDB: ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✓ Connessione a MongoDB stabilita");
    
    const db = client.db('cafasso_academy');
    
    // Definizione delle tabelle principali da migrare
    // Basata sui file di migrazione in supabase/migrations
    const tables = [
      // Tabelle utente e autenticazione
      {
        name: 'users',
        indexes: [
          { key: { email: 1 }, unique: true },
          { key: { username: 1 }, unique: true },
          { key: { role: 1 } }
        ],
        schema: {
          validator: {
            $jsonSchema: {
              bsonType: "object",
              required: ["email"],
              properties: {
                email: { bsonType: "string" },
                username: { bsonType: "string" },
                password_hash: { bsonType: "string" },
                full_name: { bsonType: "string" },
                company: { bsonType: "string" },
                role: { bsonType: "string" },
                account_status: { bsonType: "string" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" },
                verificationToken: { bsonType: "string" },
                tokenExpires: { bsonType: "date" },
                isVerified: { bsonType: "bool" }
              }
            }
          }
        }
      },
      {
        name: 'auth_sessions',
        indexes: [
          { key: { user_id: 1 } },
          { key: { expires_at: 1 }, expireAfterSeconds: 0 } // TTL index
        ],
        schema: {
          validator: {
            $jsonSchema: {
              bsonType: "object",
              required: ["user_id"],
              properties: {
                user_id: { bsonType: "string" },
                device_info: { bsonType: "object" },
                ip_address: { bsonType: "string" },
                is_valid: { bsonType: "bool" },
                expires_at: { bsonType: "date" },
                created_at: { bsonType: "date" },
                token: { bsonType: "string" }
              }
            }
          }
        }
      },
      {
        name: 'failed_login_attempts',
        indexes: [
          { key: { user_id: 1 } },
          { key: { ip_address: 1 } },
          { key: { attempt_time: 1 } }
        ]
      },
      {
        name: 'user_settings',
        indexes: [
          { key: { user_id: 1 }, unique: true }
        ]
      },
      
      // Tabelle per documenti e contenuti
      {
        name: 'documents',
        indexes: [
          { key: { user_id: 1 } },
          { key: { title: 1 } }
        ]
      },
      {
        name: 'document_versions',
        indexes: [
          { key: { document_id: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      
      // Tabelle per corsi e video
      {
        name: 'courses',
        indexes: [
          { key: { title: 1 } },
          { key: { created_by: 1 } },
          { key: { category: 1 } }
        ]
      },
      {
        name: 'course_modules',
        indexes: [
          { key: { course_id: 1 } },
          { key: { order: 1 } }
        ]
      },
      {
        name: 'videos',
        indexes: [
          { key: { module_id: 1 } },
          { key: { title: 1 } }
        ]
      },
      {
        name: 'user_progress',
        indexes: [
          { key: { user_id: 1 } },
          { key: { course_id: 1 } },
          { key: { video_id: 1 } }
        ]
      },
      
      // Tabelle per certificati
      {
        name: 'certificates',
        indexes: [
          { key: { user_id: 1 } },
          { key: { course_id: 1 } },
          { key: { issued_at: 1 } }
        ]
      },
      
      // Tabelle per notifiche e attività
      {
        name: 'notifications',
        indexes: [
          { key: { user_id: 1 } },
          { key: { created_at: 1 } },
          { key: { read: 1 } }
        ]
      },
      {
        name: 'activity_log',
        indexes: [
          { key: { user_id: 1 } },
          { key: { created_at: 1 } },
          { key: { activity_type: 1 } }
        ]
      },
      
      // Tabelle per AI e assistenza
      {
        name: 'ai_prompts',
        indexes: [
          { key: { category: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      {
        name: 'ai_conversations',
        indexes: [
          { key: { user_id: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      {
        name: 'ai_messages',
        indexes: [
          { key: { conversation_id: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      
      // Tabelle per media
      {
        name: 'media_items',
        indexes: [
          { key: { user_id: 1 } },
          { key: { media_type: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      
      // Tabelle per casi pratici
      {
        name: 'case_studies',
        indexes: [
          { key: { title: 1 } },
          { key: { category: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      
      // Tabelle per aggiornamenti normativi
      {
        name: 'regulatory_updates',
        indexes: [
          { key: { title: 1 } },
          { key: { effective_date: 1 } },
          { key: { created_at: 1 } }
        ]
      },
      
      // Tabelle amministrative
      {
        name: 'admin_content_uploads',
        indexes: [
          { key: { uploaded_by: 1 } },
          { key: { content_type: 1 } },
          { key: { created_at: 1 } }
        ]
      }
    ];
    
    console.log(`Verranno migrate ${tables.length} tabelle da Supabase a MongoDB.`);
    
    // Verifica e crea ogni tabella
    for (const table of tables) {
      console.log(`\nMigrazione della tabella: ${table.name}`);
      
      // Verifica se la collection esiste
      const collections = await db.listCollections({ name: table.name }).toArray();
      
      if (collections.length === 0) {
        console.log(`Creazione collection '${table.name}'...`);
        
        // Crea collection con schema validation se fornito
        if (table.schema) {
          await db.createCollection(table.name, table.schema);
          console.log(`✓ Collection '${table.name}' creata con validazione schema`);
        } else {
          await db.createCollection(table.name);
          console.log(`✓ Collection '${table.name}' creata`);
        }
      } else {
        console.log(`Collection '${table.name}' esiste già`);
      }
      
      // Crea indici se specificati
      if (table.indexes && table.indexes.length > 0) {
        for (const indexSpec of table.indexes) {
          const indexName = Object.keys(indexSpec.key).join('_');
          console.log(`Creazione indice su '${indexName}'...`);
          
          try {
            // Prepara le opzioni dell'indice, omettendo expireAfterSeconds se non è presente
            const indexOptions = {
              unique: indexSpec.unique || false,
              name: `idx_${table.name}_${indexName}`
            };
            
            // Aggiungi expireAfterSeconds solo se è definito
            if (indexSpec.expireAfterSeconds !== undefined) {
              indexOptions.expireAfterSeconds = indexSpec.expireAfterSeconds;
            }
            
            await db.collection(table.name).createIndex(
              indexSpec.key,
              indexOptions
            );
            console.log(`✓ Indice creato su '${indexName}'`);
          } catch (error) {
            // Se l'indice esiste già, ignora l'errore
            if (error.code === 85) { // Codice per indice già esistente
              console.log(`Indice su '${indexName}' esiste già`);
            } else {
              throw error;
            }
          }
        }
      }
    }
    
    console.log("\n=====================================================");
    console.log("✓ Migrazione completata con successo!");
    console.log("=====================================================");
    
  } catch (error) {
    console.error("\n❌ Errore durante la migrazione:", error);
    console.error("Stack trace:", error.stack);
  } finally {
    // Chiudi la connessione
    if (client) {
      await client.close();
      console.log("Connessione a MongoDB chiusa");
    }
  }
}

// Esecuzione della funzione principale
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateSupabaseTables().catch(console.error);
}

export default migrateSupabaseTables;
