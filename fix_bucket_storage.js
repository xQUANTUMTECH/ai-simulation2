/**
 * Script migliorato per la configurazione dei bucket di storage
 * Questo script corregge i problemi di permessi ed è compatibile con le API più recenti
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Logger per output formattato
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[AVVISO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Recupera credenziali Supabase
function getSupabaseCredentials() {
  try {
    // Tenta di leggere da SUPABASE_CREDENTIALS.md
    if (fs.existsSync('./SUPABASE_CREDENTIALS.md')) {
      const content = fs.readFileSync('./SUPABASE_CREDENTIALS.md', 'utf8');
      const urlMatch = content.match(/URL[^:]*:\s*([^\s]+)/i);
      const serviceKeyMatch = content.match(/SERVICE[^:]*:\s*([^\s]+)/i);
      
      if (urlMatch && serviceKeyMatch) {
        return {
          url: urlMatch[1],
          serviceKey: serviceKeyMatch[1]
        };
      }
    }
    
    // Fallback a valori hardcoded (per test)
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    logger.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Configura politiche di accesso tramite SQL
async function configureBucketPolicy(supabase, bucketName) {
  try {
    // Crea una funzione SQL per impostare le policy
    const createPolicyFunction = `
      CREATE OR REPLACE FUNCTION set_bucket_policy(bucket_name text)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Imposta policy per lettura autenticata
        EXECUTE FORMAT('
          CREATE POLICY IF NOT EXISTS "Allow authenticated read access" 
          ON storage.objects 
          FOR SELECT 
          TO authenticated 
          USING (bucket_id = %L);
        ', bucket_name);
        
        -- Imposta policy per upload autenticato
        EXECUTE FORMAT('
          CREATE POLICY IF NOT EXISTS "Allow authenticated insert access" 
          ON storage.objects 
          FOR INSERT 
          TO authenticated 
          WITH CHECK (bucket_id = %L);
        ', bucket_name);
        
        -- Imposta policy per aggiornamento autenticato
        EXECUTE FORMAT('
          CREATE POLICY IF NOT EXISTS "Allow authenticated update access" 
          ON storage.objects 
          FOR UPDATE 
          TO authenticated 
          USING (bucket_id = %L);
        ', bucket_name);
        
        -- Imposta policy per eliminazione autenticata
        EXECUTE FORMAT('
          CREATE POLICY IF NOT EXISTS "Allow authenticated delete access" 
          ON storage.objects 
          FOR DELETE 
          TO authenticated 
          USING (bucket_id = %L);
        ', bucket_name);
        
        RETURN true;
      END;
      $$;
    `;
    
    // Esegui la funzione SQL per creare la funzione
    const { error: funcError } = await supabase.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': createPolicyFunction
      }
    });
    
    if (funcError && !funcError.message.includes('already exists')) {
      logger.error(`Errore nella creazione della funzione policy: ${funcError.message}`);
      return false;
    }
    
    // Chiama la funzione SQL per impostare le policy
    const { data, error } = await supabase.rpc('set_bucket_policy', { bucket_name: bucketName });
    
    if (error) {
      logger.error(`Errore nell'impostazione delle policy per ${bucketName}: ${error.message}`);
      return false;
    }
    
    logger.success(`Policy create con successo per ${bucketName}`);
    return true;
  } catch (error) {
    logger.error(`Errore imprevisto nella configurazione delle policy: ${error.message}`);
    return false;
  }
}

// Funzione principale di configurazione bucket
async function setupBuckets() {
  logger.section('Configurazione bucket Supabase');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  logger.info(`URL Supabase: ${credentials.url}`);
  
  try {
    // Crea client con ruolo di servizio
    const supabase = createClient(credentials.url, credentials.serviceKey);
    
    // Lista dei bucket necessari
    const requiredBuckets = [
      { name: 'documents', description: 'Storage per documenti formativi' },
      { name: 'videos', description: 'Storage per file video' },
      { name: 'uploads', description: 'Storage per file generici caricati dagli utenti' },
      { name: 'storage', description: 'Storage alternativo per file generici' },
      { name: 'simulations', description: 'Storage per scenari di simulazione' },
      { name: 'training', description: 'Storage per materiali di formazione' }
    ];
    
    // Verifica bucket esistenti
    logger.info('Recupero bucket esistenti...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Errore nel recupero dei bucket: ${listError.message}`);
    }
    
    const existingBuckets = buckets?.map(b => b.name) || [];
    logger.info(`Bucket esistenti: ${existingBuckets.join(', ') || 'nessuno'}`);
    
    // Crea o aggiorna ogni bucket
    for (const bucket of requiredBuckets) {
      if (!existingBuckets.includes(bucket.name)) {
        logger.info(`Creazione bucket '${bucket.name}'...`);
        
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: false,
          file_size_limit: 52428800, // 50MB
          allowed_mime_types: [
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
          if (error.message.includes('already exists')) {
            logger.info(`Il bucket '${bucket.name}' esiste già`);
          } else {
            logger.error(`Errore nella creazione del bucket '${bucket.name}': ${error.message}`);
            continue;
          }
        } else {
          logger.success(`Bucket '${bucket.name}' creato con successo`);
        }
      } else {
        logger.info(`Il bucket '${bucket.name}' esiste già`);
      }
      
      // Configura policy tramite SQL per ogni bucket
      await configureBucketPolicy(supabase, bucket.name);
    }
    
    logger.success('Configurazione bucket completata con successo');
    
    // Verifica la configurazione dei bucket
    const { data: updatedBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      logger.error(`Errore nella verifica finale dei bucket: ${verifyError.message}`);
      return;
    }
    
    const configuredBuckets = updatedBuckets?.map(b => b.name) || [];
    logger.section('Riepilogo bucket configurati');
    logger.info(`Bucket configurati: ${configuredBuckets.join(', ')}`);
    
    // Verifica se tutti i bucket sono stati configurati
    const missingBuckets = requiredBuckets
      .map(b => b.name)
      .filter(name => !configuredBuckets.includes(name));
    
    if (missingBuckets.length > 0) {
      logger.warn(`I seguenti bucket non sono stati configurati: ${missingBuckets.join(', ')}`);
    } else {
      logger.success('Tutti i bucket necessari sono stati configurati correttamente');
    }
  } catch (error) {
    logger.error(`Errore durante la configurazione dei bucket: ${error.message}`);
  }
}

// Esegui la configurazione
setupBuckets().catch(err => {
  logger.error(`Errore imprevisto: ${err.message}`);
  process.exit(1);
});
