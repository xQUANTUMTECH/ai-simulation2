import { supabase } from './supabase';

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  created_by: string;
  status: 'processing' | 'ready' | 'error';
  metadata?: {
    pageCount?: number;
    author?: string;
    createdAt?: string;
    keywords?: string[];
    error?: string;
  };
  associations?: {
    avatars?: string[];
    scenarios?: string[];
    courses?: string[];
  };
}

class DocumentService {
  // Array di nomi di bucket, in ordine di priorità
  private readonly STORAGE_BUCKETS = ['documents', 'uploads', 'storage'];

  async uploadDocument(file: File, userId: string): Promise<Document> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Servizio database non disponibile');
    }

    try {
      console.log(`Iniziato upload documento: ${file.name} (${file.size} bytes)`);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      // Verifica quali bucket sono disponibili
      let availableBucket = null;
      
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.warn('Errore nel recupero dei bucket:', error);
          throw error;
        }
        
        if (buckets && buckets.length > 0) {
          // Cerca il primo bucket disponibile dalla lista di priorità
          for (const bucketName of this.STORAGE_BUCKETS) {
            if (buckets.some(b => b.name === bucketName)) {
              availableBucket = bucketName;
              console.log(`Utilizzo bucket trovato: ${availableBucket}`);
              break;
            }
          }
          
          // Se nessuno dei bucket nella lista di priorità esiste, usa il primo disponibile
          if (!availableBucket && buckets.length > 0) {
            availableBucket = buckets[0].name;
            console.log(`Nessun bucket prioritario trovato, utilizzo: ${availableBucket}`);
          }
        }
        
        if (!availableBucket) {
          console.error('Nessun bucket di storage disponibile');
          throw new Error('Nessun bucket di storage disponibile');
        }
      } catch (err) {
        console.error('Errore nel verificare i bucket disponibili:', err);
        throw new Error('Impossibile accedere ai bucket di storage');
      }
      
      // Tentativo di upload con gestione errori migliorata
      console.log(`Caricamento in corso nel bucket ${availableBucket}: ${fileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(availableBucket)
        .upload(fileName, file, {
          upsert: true, // Sovrascrivi se esiste già
          cacheControl: '3600' // Cache di 1 ora
        });

      if (uploadError) {
        console.error('Errore durante l\'upload:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(availableBucket)
        .getPublicUrl(fileName);

      console.log(`File caricato con successo. URL pubblico: ${publicUrl}`);

      // Create document record (con verifica tabella)
      let tableName = 'documents';
      
      // Prima verifichiamo se la tabella esiste
      try {
        // Tenta una query sulla tabella per verificare se esiste
        const { error: tableCheckError } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        // Se la tabella non esiste, usa un documento "virtuale" locale
        if (tableCheckError && tableCheckError.code === '42P01') { // tabella inesistente
          console.warn(`Tabella ${tableName} non esiste. Creando documento virtuale locale.`);
          return {
            id: `local-${crypto.randomUUID()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrl,
            created_at: new Date().toISOString(),
            created_by: userId,
            status: 'ready',
            metadata: {
              pageCount: 0,
              author: '',
              createdAt: new Date().toISOString(),
              keywords: []
            }
          } as Document;
        }
      } catch (err) {
        console.warn(`Errore nel verificare l'esistenza della tabella:`, err);
        // Continuiamo comunque per tentare l'inserimento
      }
      
      const document: Partial<Document> = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        created_by: userId,
        status: 'processing',
        metadata: {
          pageCount: 0, // Sarà aggiornato dopo l'elaborazione
          author: '', // Sarà estratto durante il processing
          createdAt: new Date().toISOString(),
          keywords: [] // Saranno estratti durante il processing
        }
      };

      console.log('Salvataggio record documento nel database...');
      
      // Tentativo di salvataggio record con gestione errori migliorata
      let retries = 3;
      let docData = null;
      
      while (retries > 0 && !docData) {
        try {
          const { data, error } = await supabase
            .from('documents')
            .insert(document)
            .select()
            .single();
            
          if (error) throw error;
          docData = data;
        } catch (err) {
          console.error(`Tentativo ${4 - retries}/3 fallito:`, err);
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi 1s prima di riprovare
        }
      }

      console.log(`Documento registrato con successo. ID: ${docData.id}`);
      return docData;
    } catch (error) {
      console.error('Errore completo nel processo di upload documento:', error);
      // Creiamo un documento "errore" per non bloccare il flusso dell'applicazione
      return {
        id: `error-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        created_at: new Date().toISOString(),
        created_by: userId,
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Errore sconosciuto durante l\'upload'
        }
      } as Document;
    }
  }

  async getDocuments(userId: string): Promise<Document[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Get the authenticated user's ID from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Get the authenticated user's ID from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('User not authenticated');

    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('url')
      .eq('id', documentId)
      .eq('created_by', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const fileName = doc.url.split('/').pop();
    
    // Determina il bucket da cui eliminare il file
    let bucketName = null;
    try {
      // Estrai il bucket dal URL
      const urlParts = doc.url.split('/');
      // L'URL segue generalmente lo schema: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
      // Cerchiamo di estrarre il nome del bucket
      const publicIndex = urlParts.indexOf('public');
      if (publicIndex !== -1 && publicIndex + 1 < urlParts.length) {
        bucketName = urlParts[publicIndex + 1];
        console.log(`Bucket estratto da URL: ${bucketName}`);
      }
    } catch (err) {
      console.warn('Impossibile estrarre il bucket name dall\'URL, utilizzo il primo bucket disponibile');
    }
    
    // Se non riusciamo a estrarre il bucket dall'URL, prova con il primo nella lista
    if (!bucketName) {
      bucketName = this.STORAGE_BUCKETS[0];
      console.log(`Utilizzo bucket predefinito: ${bucketName}`);
    }
    
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([`${userId}/${fileName}`]);

    if (storageError) throw storageError;

    // Delete record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('created_by', user.id);

    if (deleteError) throw deleteError;
  }

  async updateDocumentStatus(documentId: string, status: Document['status']): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId);

    if (error) throw error;
  }

  async updateDocumentMetadata(documentId: string, metadata: Document['metadata']): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('documents')
      .update({ metadata })
      .eq('id', documentId);

    if (error) throw error;
  }
  
  // Verifica se l'utente è admin
  async isAdmin(userId: string): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.warn('Errore nel verificare il ruolo dell\'utente:', error);
        return false;
      }
      
      return data && data.role === 'ADMIN';
    } catch (err) {
      console.error('Errore nella verifica admin:', err);
      return false;
    }
  }
  
  // Separiamo i documenti in simulazione e formazione
  async getSimulationDocuments(userId: string): Promise<Document[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('created_by', userId)
        .eq('type', 'simulation')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Errore nel recupero documenti simulazione:', err);
      return [];
    }
  }
  
  async getTrainingDocuments(): Promise<Document[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('type', 'training')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Errore nel recupero documenti formazione:', err);
      return [];
    }
  }
  
  // Upload specifico per documenti di simulazione o formazione
  async uploadSimulationDocument(file: File, userId: string): Promise<Document> {
    return this.uploadDocumentWithType(file, userId, 'simulation');
  }
  
  async uploadTrainingDocument(file: File, userId: string): Promise<Document> {
    // Verifica che l'utente sia admin
    const isAdmin = await this.isAdmin(userId);
    if (!isAdmin) {
      throw new Error('Solo gli amministratori possono caricare documenti di formazione');
    }
    
    return this.uploadDocumentWithType(file, userId, 'training');
  }
  
  // Metodo privato per il caricamento con tipo specifico
  private async uploadDocumentWithType(file: File, userId: string, docType: 'simulation' | 'training'): Promise<Document> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      throw new Error('Servizio database non disponibile');
    }

    try {
      console.log(`Iniziato upload documento ${docType}: ${file.name} (${file.size} bytes)`);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const bucket = docType === 'simulation' ? 'simulations' : 'training';
      const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      // Verifica quali bucket sono disponibili
      let availableBucket = null;
      
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.warn('Errore nel recupero dei bucket:', error);
          throw error;
        }
        
        // Cerca prima il bucket specifico per il tipo di documento
        if (buckets && buckets.some(b => b.name === bucket)) {
          availableBucket = bucket;
        } else {
          // Fallback sui bucket generici in ordine di priorità
          for (const bucketName of this.STORAGE_BUCKETS) {
            if (buckets.some(b => b.name === bucketName)) {
              availableBucket = bucketName;
              console.log(`Bucket specifico non trovato, utilizzo: ${availableBucket}`);
              break;
            }
          }
        }
        
        if (!availableBucket && buckets && buckets.length > 0) {
          availableBucket = buckets[0].name;
          console.log(`Nessun bucket prioritario trovato, utilizzo: ${availableBucket}`);
        }
        
        if (!availableBucket) {
          console.error('Nessun bucket di storage disponibile');
          throw new Error('Nessun bucket di storage disponibile');
        }
      } catch (err) {
        console.error('Errore nel verificare i bucket disponibili:', err);
        throw new Error('Impossibile accedere ai bucket di storage');
      }
      
      // Tentativo di upload con gestione errori migliorata
      console.log(`Caricamento in corso nel bucket ${availableBucket}: ${fileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(availableBucket)
        .upload(fileName, file, {
          upsert: true, // Sovrascrivi se esiste già
          cacheControl: '3600' // Cache di 1 ora
        });

      if (uploadError) {
        console.error('Errore durante l\'upload:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(availableBucket)
        .getPublicUrl(fileName);

      console.log(`File caricato con successo. URL pubblico: ${publicUrl}`);
      
      // Create document record (con verifica tabella)
      const document: Partial<Document> = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        created_by: userId,
        status: 'processing',
        document_type: docType, // Aggiungiamo il tipo di documento esplicito
        metadata: {
          pageCount: 0,
          author: '',
          createdAt: new Date().toISOString(),
          keywords: []
        }
      };

      console.log('Salvataggio record documento nel database...');
      
      // Tentativo di salvataggio record con gestione errori migliorata
      let retries = 3;
      let docData = null;
      
      while (retries > 0 && !docData) {
        try {
          const { data, error } = await supabase
            .from('documents')
            .insert(document)
            .select()
            .single();
            
          if (error) throw error;
          docData = data;
        } catch (err) {
          console.error(`Tentativo ${4 - retries}/3 fallito:`, err);
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi 1s prima di riprovare
        }
      }

      console.log(`Documento registrato con successo. ID: ${docData.id}`);
      return docData;
    } catch (error) {
      console.error('Errore completo nel processo di upload documento:', error);
      // Creiamo un documento "errore" per non bloccare il flusso dell'applicazione
      return {
        id: `error-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        created_at: new Date().toISOString(),
        created_by: userId,
        status: 'error',
        document_type: docType,
        metadata: {
          error: error instanceof Error ? error.message : 'Errore sconosciuto durante l\'upload'
        }
      } as Document;
    }
  }
}

// Aggiorniamo l'interfaccia per includere il tipo di documento
export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  created_by: string;
  status: 'processing' | 'ready' | 'error';
  document_type?: 'simulation' | 'training'; // Il tipo di documento (simulazione o formazione)
  metadata?: {
    pageCount?: number;
    author?: string;
    createdAt?: string;
    keywords?: string[];
    error?: string;
  };
  associations?: {
    avatars?: string[];
    scenarios?: string[];
    courses?: string[];
  };
}

export const documentService = new DocumentService();
