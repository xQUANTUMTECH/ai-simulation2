/**
 * Script per verificare la disponibilità dei bucket di storage
 * Questo script è più semplice e serve solo per verificare se i bucket sono stati creati
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Recupera credenziali Supabase
function getSupabaseCredentials() {
  try {
    // Tenta di leggere da SUPABASE_CREDENTIALS.md
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const content = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      const urlMatch = content.match(/URL[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = content.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      const anonKeyMatch = content.match(/KEY[^:]*:\s*([^\s]+)/i);
      
      const url = urlMatch ? urlMatch[1] : null;
      const serviceKey = serviceKeyMatch ? serviceKeyMatch[1] : null;
      const anonKey = anonKeyMatch ? anonKeyMatch[1] : null;
      
      if (url && (serviceKey || anonKey)) {
        return {
          url,
          serviceKey,
          anonKey
        };
      }
    }
    
    // Fallback a valori hardcoded
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk'
    };
  } catch (error) {
    console.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

async function verifyBuckets() {
  console.log('Verifica dei bucket di storage Supabase...');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  console.log(`URL Supabase: ${credentials.url}`);
  
  // Elenco bucket che dovrebbero esistere
  const expectedBuckets = [
    'documents',
    'videos',
    'uploads',
    'storage',
    'simulations',
    'training'
  ];
  
  try {
    // Prima prova con il service role key
    let supabase;
    if (credentials.serviceKey) {
      console.log('Tentativo con service role key...');
      supabase = createClient(credentials.url, credentials.serviceKey);
    } else if (credentials.anonKey) {
      console.log('Tentativo con anon key...');
      supabase = createClient(credentials.url, credentials.anonKey);
    } else {
      throw new Error('Nessuna chiave disponibile per la connessione');
    }
    
    // Prova a recuperare i bucket
    console.log('Recupero lista bucket...');
    
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(`Errore nel recupero dei bucket: ${error.message}`);
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('Nessun bucket trovato! Questo potrebbe indicare un problema di permessi.');
    } else {
      console.log(`Trovati ${buckets.length} bucket:`);
      
      const bucketNames = buckets.map(b => b.name);
      console.log('Bucket esistenti:', JSON.stringify(bucketNames, null, 2));
      
      // Verifica presenza bucket attesi
      console.log('\nVerifica bucket attesi:');
      let allPresent = true;
      
      for (const bucketName of expectedBuckets) {
        const exists = bucketNames.includes(bucketName);
        console.log(`- ${bucketName}: ${exists ? '✅ Presente' : '❌ Mancante'}`);
        
        if (!exists) {
          allPresent = false;
        }
      }
      
      if (allPresent) {
        console.log('\n✅ Tutti i bucket necessari sono presenti e configurati!');
      } else {
        console.log('\n❌ Alcuni bucket necessari sono mancanti.');
      }
      
      // Dettagli per ogni bucket
      console.log('\nDettagli dei bucket:');
      for (const bucket of buckets) {
        console.log(`\nBucket: ${bucket.name}`);
        console.log(`- ID: ${bucket.id}`);
        console.log(`- Pubblico: ${bucket.public ? 'Sì' : 'No'}`);
        console.log(`- Creato: ${bucket.created_at}`);
        
        try {
          // Ottieni dettagli su policy e altro
          const { data: files, error: listError } = await supabase.storage.from(bucket.name).list();
          
          if (listError) {
            console.log(`- Errore nel recupero dei file: ${listError.message}`);
          } else {
            console.log(`- Numero di file: ${files.length}`);
          }
        } catch (err) {
          console.log(`- Errore nell'accesso al bucket: ${err.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`Errore durante la verifica: ${error.message}`);
  }
}

// Esegui la verifica
verifyBuckets();
