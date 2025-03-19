import { createClient } from '@supabase/supabase-js';
import { dbConnection } from './db-connection';

// Esponi il client Supabase configurato attraverso il servizio centralizzato
export const supabase = (() => {
  try {
    return dbConnection.getClient();
  } catch (error) {
    console.error('Errore durante l\'inizializzazione di Supabase:', error);
    // Ritorniamo null invece di un client fasullo, così possiamo
    // rilevare facilmente quando la connessione non è disponibile
    return null;
  }
})();

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  user_id: string;
  status: 'processing' | 'ready' | 'error';
  metadata?: {
    pageCount?: number;
    author?: string;
    createdAt?: string;
    keywords?: string[];
  };
}

export async function uploadDocument(file: File, userId: string): Promise<Document> {
  // Verifica che il client Supabase sia disponibile
  if (!supabase) {
    throw new Error('Connessione al database non disponibile. Verificare le credenziali e la connettività.');
  }

  try {
    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Create document record
    const document: Partial<Document> = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: publicUrl,
      user_id: userId,
      status: 'processing'
    };

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single();

    if (docError) throw docError;

    return docData;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

export async function getDocuments(userId: string): Promise<Document[]> {
  // Verifica che il client Supabase sia disponibile
  if (!supabase) {
    throw new Error('Connessione al database non disponibile. Verificare le credenziali e la connettività.');
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  // Verifica che il client Supabase sia disponibile
  if (!supabase) {
    throw new Error('Connessione al database non disponibile. Verificare le credenziali e la connettività.');
  }

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('url')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage
  const fileName = doc.url.split('/').pop();
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([`${userId}/${fileName}`]);

  if (storageError) throw storageError;

  // Delete record
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (deleteError) throw deleteError;
}

/**
 * Verifica la connessione al database
 * Utile per controllare lo stato della connessione prima di eseguire operazioni
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  return await dbConnection.testConnection();
}
