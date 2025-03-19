import fetch from 'node-fetch';

// Uso il token di servizio di Supabase già disponibile
const SUPABASE_PAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Questa informazione è già corretta
const PROJECT_REF = 'twusehwykpemphqtxlrx';

async function enableEmailConfirmation() {
  try {
    console.log('Abilitazione della conferma email...');
    
    const response = await fetch(`https://api.supabase.io/v1/projects/${PROJECT_REF}/auth-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PAT}`
      },
      body: JSON.stringify({
        email_confirm_required: true
      })
    });
    
    if (response.ok) {
      console.log('✅ Conferma email abilitata con successo!');
      console.log('Gli utenti dovranno confermare la loro email dopo la registrazione.');
    } else {
      console.error('❌ Errore nell\'abilitazione della conferma email:', await response.text());
    }
  } catch (error) {
    console.error('❌ Errore nella richiesta API:', error);
  }
}

// Esecuzione della funzione
enableEmailConfirmation();
