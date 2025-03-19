import { createClient } from '@supabase/supabase-js';

// Credenziali Supabase
const supabaseUrl = 'https://twusehwykpemphqtxlrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea client Supabase con il token di servizio
const supabase = createClient(supabaseUrl, supabaseKey);

// Credenziali per gli utenti da creare
const normalUser = {
  email: 'studente@cafasso.edu',
  password: 'Cafasso2025!',
  userData: {
    full_name: 'Studente Test',
    role: 'USER'
  }
};

const adminUser = {
  email: 'direttore@cafasso.edu',
  password: 'CafassoAdmin2025!',
  userData: {
    full_name: 'Direttore Test',
    role: 'ADMIN'
  }
};

// Funzione per creare un utente
async function createUser(userData) {
  try {
    // Crea l'utente in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Conferma automaticamente l'email
      user_metadata: {
        full_name: userData.userData.full_name,
        role: userData.userData.role
      }
    });
    
    if (authError) {
      console.error(`Errore nella creazione dell'utente ${userData.email}:`, authError);
      return false;
    }
    
    console.log(`Utente ${userData.email} creato con successo!`);
    console.log(`ID utente: ${authData.user.id}`);
    
    // Crea il profilo utente nella tabella public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        email: userData.email,
        full_name: userData.userData.full_name,
        role: userData.userData.role
      }]);
    
    if (profileError) {
      console.error(`Errore nella creazione del profilo per ${userData.email}:`, profileError);
      
      // Non preoccuparti se il profilo non può essere creato
      // L'utente è comunque disponibile in auth.users
      console.log(`Nota: Il profilo nella tabella users non è stato creato, ma l'utente è disponibile per l'autenticazione.`);
      console.log(`Per completare la creazione del profilo, esegui le migrazioni del database nel file apply_essential_migrations.sql`);
    } else {
      console.log(`Profilo per ${userData.email} creato con successo!`);
    }
    
    return {
      email: userData.email,
      password: userData.password,
      role: userData.userData.role
    };
  } catch (error) {
    console.error('Errore imprevisto:', error);
    return false;
  }
}

// Funzione principale che crea entrambi gli utenti
async function createAllUsers() {
  console.log('Creazione utenti in Supabase...');
  
  const createdUsers = [];
  
  // Crea utente normale
  console.log('\n--- Creazione utente regolare ---');
  const userResult = await createUser(normalUser);
  if (userResult) createdUsers.push(userResult);
  
  // Crea utente amministratore
  console.log('\n--- Creazione utente amministratore ---');
  const adminResult = await createUser(adminUser);
  if (adminResult) createdUsers.push(adminResult);
  
  // Riassunto finale
  console.log('\n-----------------------------');
  console.log('RIEPILOGO CREDENZIALI UTENTI');
  console.log('-----------------------------');
  
  if (createdUsers.length > 0) {
    createdUsers.forEach(user => {
      console.log(`\nEmail: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Ruolo: ${user.role}`);
    });
    
    console.log('\nSalva queste credenziali in un luogo sicuro!');
  } else {
    console.log('Nessun utente creato con successo.');
  }
}

// Esegui la funzione principale
createAllUsers();
