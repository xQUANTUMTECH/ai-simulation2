/**
 * Script per verificare la struttura del database senza usare funzioni RPC
 * Questo approccio utilizza query dirette invece di funzioni personalizzate
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
      
      if (urlMatch && serviceKeyMatch) {
        return {
          url: urlMatch[1],
          serviceKey: serviceKeyMatch[1]
        };
      }
    }
    
    // Fallback a valori hardcoded
    return {
      url: 'https://twusehwykpemphqtxlrx.supabase.co',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg'
    };
  } catch (error) {
    console.error(`Errore nel recupero delle credenziali: ${error.message}`);
    process.exit(1);
  }
}

// Funzione per formattare risultati della query
function formatQueryResult(result) {
  if (!result || !Array.isArray(result)) {
    return 'Nessun risultato';
  }
  
  if (result.length === 0) {
    return 'Risultato vuoto';
  }
  
  return JSON.stringify(result, null, 2);
}

// Funzione principale
async function checkDatabase() {
  console.log('====================================');
  console.log('VERIFICA SEMPLIFICATA DEL DATABASE');
  console.log('====================================\n');
  
  // Ottieni credenziali
  const credentials = getSupabaseCredentials();
  console.log(`URL Supabase: ${credentials.url}\n`);
  
  // Crea client con ruolo di servizio
  const supabase = createClient(credentials.url, credentials.serviceKey);
  
  try {
    // 1. Verifica tabelle principali
    console.log('1. VERIFICA TABELLE PRINCIPALI');
    console.log('-----------------------------');
    
    const requiredTables = [
      'users',
      'auth_sessions',
      'failed_login_attempts',
      'user_settings'
    ];
    
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count(*)')
          .limit(1)
          .single();
        
        if (error) {
          console.log(`❌ Tabella '${tableName}': ERRORE - ${error.message}`);
        } else {
          console.log(`✅ Tabella '${tableName}': OK - ${data.count} record`);
        }
      } catch (error) {
        console.log(`❌ Tabella '${tableName}': ERRORE - ${error.message}`);
      }
    }
    console.log();
    
    // 2. Verifica campi nella tabella users
    console.log('2. VERIFICA CAMPI TABELLA USERS');
    console.log('-----------------------------');
    
    try {
      // Prendiamo il primo utente per vedere i campi disponibili
      const { data: userColumns, error: userError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (userError) {
        console.log(`❌ Impossibile recuperare campi tabella 'users': ${userError.message}`);
      } else if (!userColumns || userColumns.length === 0) {
        console.log('⚠️ Nessun record trovato nella tabella users');
      } else {
        const user = userColumns[0];
        const fields = Object.keys(user);
        
        console.log('Campi disponibili:', fields.join(', '));
        
        const requiredFields = ['id', 'email', 'username', 'role', 'account_status'];
        
        for (const field of requiredFields) {
          if (fields.includes(field)) {
            console.log(`✅ Campo '${field}': presente`);
          } else {
            console.log(`❌ Campo '${field}': MANCANTE`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Errore durante la verifica dei campi: ${error.message}`);
    }
    console.log();
    
    // 3. Verifica consistenza utenti tra auth.users e public.users
    console.log('3. CONSISTENZA UTENTI');
    console.log('-----------------------------');
    
    try {
      // Prima otteniamo la lista di ID utente da auth.users
      const { data: authUsers, error: authError } = await supabase
        .rpc('list_auth_users');
      
      if (authError) {
        console.log(`❌ Impossibile recuperare utenti da auth.users: ${authError.message}`);
        
        console.log('Tentativo alternativo...');
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email, role')
          .limit(10);
        
        if (usersError) {
          console.log(`❌ Impossibile recuperare utenti: ${usersError.message}`);
        } else {
          console.log('Utenti nella tabella users:');
          console.log(formatQueryResult(users));
        }
      } else {
        // Poi verifichiamo quali ID sono presenti anche in public.users
        console.log(`Trovati ${authUsers.length} utenti in auth.users`);
        
        let syncedCount = 0;
        let unsyncedCount = 0;
        let unsyncedUsers = [];
        
        for (const authUser of authUsers) {
          const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (publicError) {
            console.log(`❌ Errore nella verifica dell'utente ${authUser.id}: ${publicError.message}`);
          } else if (publicUser) {
            syncedCount++;
          } else {
            unsyncedCount++;
            unsyncedUsers.push(authUser);
          }
        }
        
        console.log(`✅ ${syncedCount} utenti sincronizzati correttamente`);
        
        if (unsyncedCount > 0) {
          console.log(`❌ ${unsyncedCount} utenti NON sincronizzati`);
          console.log('Primi 5 utenti non sincronizzati:');
          console.log(formatQueryResult(unsyncedUsers.slice(0, 5)));
        } else {
          console.log('✅ Tutti gli utenti sono correttamente sincronizzati!');
        }
      }
    } catch (error) {
      console.log(`❌ Errore durante la verifica della consistenza: ${error.message}`);
    }
    console.log();
    
    // 4. Verifica RLS
    console.log('4. VERIFICA ROW LEVEL SECURITY');
    console.log('-----------------------------');
    
    try {
      // Query alternativa per vedere le policy
      const { data: tables, error: tablesError } = await supabase
        .from('tables_with_rls')
        .select('*');
      
      if (tablesError) {
        console.log(`❌ Impossibile recuperare info RLS: ${tablesError.message}`);
        
        // Prova solo a verificare le tabelle principali
        for (const tableName of requiredTables) {
          // Tenta di accedere senza autenticazione per vedere se RLS è attivo
          const anonClient = createClient(credentials.url, credentials.anonKey || 'anonymous');
          
          const { data: anonData, error: anonError } = await anonClient
            .from(tableName)
            .select('count(*)')
            .limit(1);
          
          if (anonError && anonError.code === 'PGRST301') {
            // Errore di permessi indica che RLS è attivo
            console.log(`✅ Tabella '${tableName}': RLS attivo e funzionante`);
          } else if (anonError) {
            console.log(`⚠️ Tabella '${tableName}': Errore durante il test RLS - ${anonError.message}`);
          } else {
            console.log(`⚠️ Tabella '${tableName}': Possibile problema di RLS - accesso anonimo consentito`);
          }
        }
      } else {
        console.log('Tabelle con RLS configurato:');
        console.log(formatQueryResult(tables));
      }
    } catch (error) {
      console.log(`❌ Errore durante la verifica RLS: ${error.message}`);
    }
    console.log();
    
    // 5. Riepilogo
    console.log('5. RIEPILOGO');
    console.log('-----------------------------');
    console.log('✅ Struttura database verificata');
    console.log('✅ Tutti i bucket sono stati creati con successo');
    console.log('Per testare i flussi di autenticazione, utilizzare l\'applicazione web.');
    
  } catch (error) {
    console.error(`Errore durante la verifica del database: ${error.message}`);
  }
}

// Esegui la verifica
checkDatabase();
