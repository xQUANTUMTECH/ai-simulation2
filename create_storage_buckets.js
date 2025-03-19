import { createClient } from '@supabase/supabase-js';

// Credenziali Supabase
const supabaseUrl = 'https://twusehwykpemphqtxlrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Funzione principale
async function createBuckets() {
  console.log('Creazione bucket in Supabase...');
  
  try {
    // Crea bucket videos
    const { data: videosData, error: videosError } = await supabase.storage.createBucket(
      'videos',
      { 
        public: false,
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      }
    );
    
    if (videosError) {
      if (videosError.message.includes('already exists')) {
        console.log("Il bucket 'videos' esiste già");
      } else {
        console.error("Errore nella creazione del bucket 'videos':", videosError);
      }
    } else {
      console.log("Bucket 'videos' creato con successo!");
    }
    
    // Crea bucket documents
    const { data: docsData, error: docsError } = await supabase.storage.createBucket(
      'documents',
      { 
        public: false,
        fileSizeLimit: 20 * 1024 * 1024 // 20MB
      }
    );
    
    if (docsError) {
      if (docsError.message.includes('already exists')) {
        console.log("Il bucket 'documents' esiste già");
      } else {
        console.error("Errore nella creazione del bucket 'documents':", docsError);
      }
    } else {
      console.log("Bucket 'documents' creato con successo!");
    }
    
    console.log("Creazione bucket completata!");
    
  } catch (error) {
    console.error('Errore imprevisto:', error);
  }
}

// Esegui la funzione
createBuckets();
