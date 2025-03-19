// Script per la creazione dei bucket di storage in Supabase
import { createClient } from '@supabase/supabase-js';

// Credenziali Supabase dal file di configurazione
const supabaseUrl = 'https://twusehwykpemphqtxlrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea un client Supabase con il token di servizio
const supabase = createClient(supabaseUrl, supabaseKey);

// Bucket da creare
const BUCKETS = [
  {
    name: 'videos',
    isPublic: false,
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
  },
  {
    name: 'documents',
    isPublic: false,
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  }
];

// Funzione per creare un bucket
async function createBucket(bucket) {
  try {
    // Verifica se il bucket esiste già
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Errore nel listare i bucket esistenti:`, listError);
      return false;
    }
    
    const bucketExists = existingBuckets.some(b => b.name === bucket.name);
    
    if (bucketExists) {
      console.log(`Il bucket '${bucket.name}' esiste già.`);
      
      // Aggiorna le policy del bucket esistente
      return await updateBucketPolicies(bucket);
    }
    
    // Crea il nuovo bucket
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.isPublic,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: 50 * 1024 * 1024 // 50MB limite dimensione file
    });
    
    if (error) {
      console.error(`Errore nella creazione del bucket '${bucket.name}':`, error);
      return false;
    }
    
    console.log(`Bucket '${bucket.name}' creato con successo.`);
    
    // Imposta le policy per il bucket
    return await updateBucketPolicies(bucket);
    
  } catch (err) {
    console.error(`Eccezione durante la creazione del bucket '${bucket.name}':`, err);
    return false;
  }
}

// Funzione per aggiornare le policy di un bucket
async function updateBucketPolicies(bucket) {
  try {
    // Policy per gli utenti autenticati
    const { error: policyError } = await supabase.storage.from(bucket.name).createPolicy(
      'Authenticated users can upload',
      {
        role: 'authenticated',
        operation: 'INSERT'
      }
    );
    
    if (policyError) {
      console.error(`Errore nella creazione della policy di upload per '${bucket.name}':`, policyError);
      return false;
    }
    
    // Policy per vedere i propri file (per utenti autenticati)
    const { error: selectPolicyError } = await supabase.storage.from(bucket.name).createPolicy(
      'Authenticated users can read their own files',
      {
        role: 'authenticated',
        operation: 'SELECT'
      }
    );
    
    if (selectPolicyError) {
      console.error(`Errore nella creazione della policy di selezione per '${bucket.name}':`, selectPolicyError);
      return false;
    }
    
    console.log(`Policy per il bucket '${bucket.name}' configurate con successo.`);
    return true;
    
  } catch (err) {
    console.error(`Eccezione durante l'aggiornamento delle policy per '${bucket.name}':`, err);
    return false;
  }
}

// Funzione principale
async function setupBuckets() {
  console.log('Inizio configurazione bucket di storage...');
  
  for (const bucket of BUCKETS) {
    console.log(`Creazione/aggiornamento bucket '${bucket.name}'...`);
    const success = await createBucket(bucket);
    
    if (!success) {
      console.error(`Fallimento nella configurazione del bucket '${bucket.name}'. Processo interrotto.`);
      return;
    }
  }
  
  console.log('Configurazione di tutti i bucket completata con successo!');
}

// Esegui la funzione principale
setupBuckets()
  .then(() => {
    console.log('Processo completato.');
  })
  .catch(err => {
    console.error('Errore durante la configurazione dei bucket:', err);
  });
