/**
 * Script per sincronizzare gli utenti tra auth.users e public.users
 * Verifica gli utenti esistenti e crea record in public.users se mancanti
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Logger di utilità
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERRORE] ${message}`),
  success: (message) => console.log(`[SUCCESSO] ✅ ${message}`),
  section: (title) => {
    console.log('\n' + '='.repeat(50));
    console.log(`${title}`);
    console.log('='.repeat(50));
  }
};

// Recupera credenziali
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
    
    // Fallback a valori predefiniti per test
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    logger.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Funzione per ottenere elenco degli utenti da auth.users senza profilo pubblico
async function getUnsyncedUsers(client) {
  try {
    // Prima, verifica se esiste la funzione helper
    const createGetUnsyncedUsersQuery = `
      CREATE OR REPLACE FUNCTION get_unsynced_users()
      RETURNS TABLE (
        id uuid,
        email text,
        email_confirmed_at timestamptz,
        created_at timestamptz,
        metadata jsonb
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY 
        SELECT 
          au.id,
          au.email,
          au.email_confirmed_at,
          au.created_at,
          au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL;
      END;
      $$;
    `;
    
    // Crea la funzione helper
    const { error: createFunctionError } = await client.rpc('', {}, {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'params=single-object',
        'Raw-Query': createGetUnsyncedUsersQuery
      }
    });
    
    if (createFunctionError) {
      // Se la funzione esiste già, ignora l'errore
      if (!createFunctionError.message.includes('already exists')) {
        logger.error(`Errore nella creazione della funzione helper: ${createFunctionError.message}`);
        return [];
      }
    }
    
    // Chiamata alla funzione helper
    const { data, error } = await client.rpc('get_unsynced_users');
    
    if (error) {
      logger.error(`Errore nel recupero degli utenti non sincronizzati: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return [];
  }
}

// Funzione per creare profili pubblici mancanti
async function createMissingProfiles(client, unsyncedUsers) {
  logger.section(`Creazione di ${unsyncedUsers.length} profili utente mancanti`);
  
  if (unsyncedUsers.length === 0) {
    logger.success('Nessun profilo utente da creare. Tutti gli utenti sono sincronizzati.');
    return true;
  }
  
  const profiles = unsyncedUsers.map(user => {
    const metadata = user.metadata || {};
    
    return {
      id: user.id,
      email: user.email,
      full_name: metadata.full_name || metadata.name || user.email.split('@')[0],
      role: metadata.role || 'USER',
      account_status: 'active',
      created_at: user.created_at
    };
  });
  
  try {
    // Inserisci i profili in batches per evitare limiti di dimensioni
    const BATCH_SIZE = 10;
    let successCount = 0;
    
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      logger.info(`Elaborazione batch ${i/BATCH_SIZE + 1}/${Math.ceil(profiles.length/BATCH_SIZE)} (${batch.length} profili)...`);
      
      const { data, error } = await client
        .from('users')
        .insert(batch)
        .select();
      
      if (error) {
        logger.error(`Errore nell'inserimento dei profili: ${error.message}`);
      } else {
        successCount += data.length;
        logger.success(`Inseriti ${data.length} profili con successo`);
      }
    }
    
    logger.success(`Sincronizzazione completata. Creati ${successCount}/${profiles.length} profili utente.`);
    return successCount > 0;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione per creare configurazioni utente mancanti
async function createMissingSettings(client, userIds) {
  if (userIds.length === 0) {
    return true;
  }
  
  logger.section(`Creazione impostazioni utente per ${userIds.length} utenti`);
  
  try {
    // Verifica quali utenti hanno già impostazioni
    const { data: existingSettings, error: fetchError } = await client
      .from('user_settings')
      .select('user_id')
      .in('user_id', userIds);
    
    if (fetchError) {
      logger.error(`Errore nel recupero delle impostazioni esistenti: ${fetchError.message}`);
      return false;
    }
    
    // Filtra gli ID degli utenti senza impostazioni
    const existingUserIds = (existingSettings || []).map(setting => setting.user_id);
    const userIdsWithoutSettings = userIds.filter(id => !existingUserIds.includes(id));
    
    if (userIdsWithoutSettings.length === 0) {
      logger.success('Tutti gli utenti hanno già impostazioni configurate.');
      return true;
    }
    
    // Crea le impostazioni predefinite per gli utenti mancanti
    const settingsToCreate = userIdsWithoutSettings.map(userId => ({
      user_id: userId,
      email_notifications: true,
      language: 'it',
      theme: 'light'
    }));
    
    // Inserisci le impostazioni in batches
    const BATCH_SIZE = 20;
    let successCount = 0;
    
    for (let i = 0; i < settingsToCreate.length; i += BATCH_SIZE) {
      const batch = settingsToCreate.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await client
        .from('user_settings')
        .insert(batch)
        .select();
      
      if (error) {
        logger.error(`Errore nell'inserimento delle impostazioni: ${error.message}`);
      } else {
        successCount += data.length;
      }
    }
    
    logger.success(`Create impostazioni per ${successCount}/${userIdsWithoutSettings.length} utenti.`);
    return successCount > 0;
  } catch (error) {
    logger.error(`Errore imprevisto: ${error.message}`);
    return false;
  }
}

// Funzione principale
async function main() {
  logger.section('Sincronizzazione utenti tra auth.users e public.users');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  logger.info(`URL Supabase: ${credentials.url}`);
  
  // Crea client Supabase con ruolo di servizio
  const supabase = createClient(credentials.url, credentials.serviceKey);
  
  // Ottieni elenco utenti non sincronizzati
  const unsyncedUsers = await getUnsyncedUsers(supabase);
  logger.info(`Trovati ${unsyncedUsers.length} utenti non sincronizzati`);
  
  // Crea profili pubblici mancanti
  if (unsyncedUsers.length > 0) {
    const profilesCreated = await createMissingProfiles(supabase, unsyncedUsers);
    
    if (profilesCreated) {
      // Crea impostazioni utente per i nuovi profili
      const userIds = unsyncedUsers.map(user => user.id);
      await createMissingSettings(supabase, userIds);
    }
  }
  
  logger.section('Operazione completata');
}

// Esegui lo script
main();
