import { createClient } from '@supabase/supabase-js';

// Credenziali Supabase
const supabaseUrl = 'https://twusehwykpemphqtxlrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea client Supabase con il token di servizio
const supabase = createClient(supabaseUrl, supabaseKey);

// Credenziali admin
const adminEmail = 'direttore@cafasso.edu';

async function verifyAdminUser() {
  try {
    console.log(`Verifica ruolo admin per l'utente: ${adminEmail}`);
    
    // Recupera l'utente dalla tabella auth.users per verificare i metadati
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Errore nel recupero degli utenti dal sistema di autenticazione:', authError);
      return;
    }
    
    // Trova l'utente admin
    const admin = authUser.users.find(user => user.email === adminEmail);
    if (!admin) {
      console.error(`Utente con email ${adminEmail} non trovato nel sistema di autenticazione.`);
      return;
    }
    
    // Verifica i metadati
    console.log('1. Verifica metadati autenticazione:');
    console.log('   ID Utente:', admin.id);
    console.log('   Email:', admin.email);
    console.log('   Confermato:', admin.email_confirmed_at ? 'Sì' : 'No');
    console.log('   Metadati utente:', JSON.stringify(admin.user_metadata, null, 2));
    console.log('   Metadati raw:', JSON.stringify(admin.raw_user_meta_data, null, 2));
    
    // Verifica se il ruolo ADMIN è presente nei metadati
    const hasAdminRoleInMeta = 
      (admin.user_metadata && admin.user_metadata.role === 'ADMIN') || 
      (admin.raw_user_meta_data && admin.raw_user_meta_data.role === 'ADMIN');
    
    console.log('   Ruolo ADMIN nei metadati:', hasAdminRoleInMeta ? 'Sì ✓' : 'No ✗');
    
    // Recupera i dati dalla tabella 'users'
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', adminEmail)
      .single();
    
    if (publicError) {
      console.error('Errore nel recupero dei dati dalla tabella users:', publicError);
      // Verifica se la tabella esiste
      if (publicError.code === '42P01') {
        console.error('La tabella users non esiste!');
      }
      
      // Verifica se esistono altre tabelle con informazioni sugli utenti
      const { data: tables } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      console.log('Tabelle disponibili:', tables);
      return;
    }
    
    console.log('\n2. Verifica tabella users:');
    console.log('   Dati utente:', publicUser);
    console.log('   Ruolo in tabella users:', publicUser?.role === 'ADMIN' ? 'ADMIN ✓' : (publicUser?.role || 'Non impostato ✗'));

    // Verifica se l'utente è admin e aggiorna se necessario
    if (!hasAdminRoleInMeta || publicUser?.role !== 'ADMIN') {
      console.log('\n3. Correzione ruolo admin richiesta!');
      
      // Aggiorna metadati se necessario
      if (!hasAdminRoleInMeta) {
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
          admin.id,
          { user_metadata: { ...admin.user_metadata, role: 'ADMIN' } }
        );
        
        if (updateAuthError) {
          console.error('   Errore nell\'aggiornamento dei metadati:', updateAuthError);
        } else {
          console.log('   Metadati aggiornati con successo ✓');
        }
      }
      
      // Aggiorna record nella tabella users se necessario
      if (publicUser && publicUser.role !== 'ADMIN') {
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ role: 'ADMIN' })
          .eq('id', publicUser.id);
          
        if (updateUserError) {
          console.error('   Errore nell\'aggiornamento del ruolo nella tabella users:', updateUserError);
        } else {
          console.log('   Ruolo aggiornato nella tabella users ✓');
        }
      }
      
      // Verifica dopo l'aggiornamento
      console.log('\n4. Verifica dopo aggiornamento:');
      const { data: updatedUser } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', adminEmail)
        .single();
        
      console.log('   Ruolo aggiornato:', updatedUser?.role || 'Non disponibile');
    } else {
      console.log('\n✅ L\'utente admin ha già il ruolo ADMIN correttamente configurato!');
    }
  } catch (error) {
    console.error('Errore generale:', error);
  }
}

// Esegui la verifica
verifyAdminUser()
  .then(() => {
    console.log('\nVerifica completata.');
  });
