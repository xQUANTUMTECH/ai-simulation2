// Script per configurare tutti i bucket di storage necessari
// Identificati nell'analisi delle dipendenze tra funzioni e tabelle

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Recupera credenziali da configurazione o .env
function getSupabaseCredentials() {
  try {
    // Leggi file delle credenziali
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const credentialsContent = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      
      // Cerca pattern per credenziali
      const urlMatch = credentialsContent.match(/URL[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = credentialsContent.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      
      if (urlMatch && serviceKeyMatch) {
        return {
          supabaseUrl: urlMatch[1],
          supabaseServiceKey: serviceKeyMatch[1]
        };
      }
    }
    
    // Fallback a .env o environment
    const url = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
    
    if (url && key) {
      return { supabaseUrl: url, supabaseServiceKey: key };
    }
    
    // Fallback hardcoded per test
    return {
      supabaseUrl: 'https://twusehwykpemphqtxlrx.supabase.co',
      supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (err) {
    console.error('Errore nel recupero delle credenziali:', err);
    process.exit(1);
  }
}

// Funzione principale
async function setupAllBuckets() {
  console.log('Inizializzazione configurazione bucket Supabase...');
  
  // Ottieni credenziali
  const { supabaseUrl, supabaseServiceKey } = getSupabaseCredentials();
  
  // Crea client con ruolo admin
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Elenco di tutti i bucket necessari identificati dall'analisi
  const requiredBuckets = [
    'documents',  // Principale per documenti
    'videos',     // Per file video
    'uploads',    // Alternativo per file generici
    'storage',    // Storage alternativo
    'simulations', // Per documenti simulazione
    'training'    // Per documenti formazione
  ];
  
  // Controlla bucket esistenti
  console.log('Recupero bucket esistenti...');
  const { data: existingBuckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Errore nel recupero dei bucket:', error.message);
    process.exit(1);
  }
  
  const existingBucketNames = existingBuckets.map(b => b.name);
  console.log('Bucket esistenti:', existingBucketNames.join(', ') || 'nessuno');
  
  // Crea bucket mancanti
  for (const bucketName of requiredBuckets) {
    if (!existingBucketNames.includes(bucketName)) {
      console.log(`Creazione bucket: ${bucketName}...`);
      
      try {
        const { data, error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg', 
            'image/png',
            'image/gif',
            'video/mp4',
            'video/webm',
            'audio/mpeg'
          ]
        });
        
        if (error) {
          console.error(`Errore nella creazione del bucket ${bucketName}:`, error.message);
        } else {
          console.log(`Bucket ${bucketName} creato con successo`);
          
          // Crea policy per accesso pubblico
          await createBucketPolicies(supabase, bucketName);
        }
      } catch (err) {
        console.error(`Errore imprevisto nella creazione del bucket ${bucketName}:`, err);
      }
    } else {
      console.log(`Bucket ${bucketName} esiste già`);
      
      // Verifica policy
      await createBucketPolicies(supabase, bucketName);
    }
  }
  
  console.log('Configurazione bucket completata.');
}

// Funzione per creare policy di accesso
async function createBucketPolicies(supabase, bucketName) {
  try {
    // Policy per lettura autenticata
    await supabase.storage.from(bucketName).createPolicy('Lettura autenticata', {
      name: `auth_read_${bucketName}`,
      definition: {
        role: 'authenticated',
        permission: 'SELECT'
      }
    });
    
    // Policy per upload autenticato
    await supabase.storage.from(bucketName).createPolicy('Upload autenticato', {
      name: `auth_insert_${bucketName}`,
      definition: {
        role: 'authenticated',
        permission: 'INSERT'
      }
    });
    
    console.log(`Policy create con successo per il bucket ${bucketName}`);
  } catch (err) {
    // Ignora errori se policy esistono già
    if (!err.message.includes('already exists')) {
      console.error(`Errore nella creazione delle policy per ${bucketName}:`, err);
    } else {
      console.log(`Policy esistenti per ${bucketName}`);
    }
  }
}

// Esecuzione
setupAllBuckets()
  .then(() => {
    console.log('Setup bucket completato con successo!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Errore durante l\'esecuzione:', err);
    process.exit(1);
  });
