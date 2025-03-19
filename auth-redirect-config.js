import fetch from 'node-fetch';

// Uso il token di servizio di Supabase già disponibile
const SUPABASE_PAT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Queste informazioni sono già corrette
const PROJECT_REF = 'twusehwykpemphqtxlrx';
const NETLIFY_DOMAIN = 'extraordinary-strudel-696753.netlify.app';

async function configureRedirectURLs() {
  try {
    console.log('Configurazione degli URL di reindirizzamento per autenticazione...');
    
    const response = await fetch(`https://api.supabase.io/v1/projects/${PROJECT_REF}/auth-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PAT}`
      },
      body: JSON.stringify({
        redirect_urls: [
          `https://${NETLIFY_DOMAIN}/**`,
          `https://*.${NETLIFY_DOMAIN}/**`,
          'http://localhost:5173/**',
          'http://localhost:3000/**'
        ]
      })
    });
    
    if (response.ok) {
      console.log('✅ URL di reindirizzamento configurati con successo!');
      console.log('Le operazioni di autenticazione reindizzeranno correttamente al dominio Netlify e localhost.');
    } else {
      console.error('❌ Errore nella configurazione degli URL di reindirizzamento:', await response.text());
    }
  } catch (error) {
    console.error('❌ Errore nella richiesta API:', error);
  }
}

// Esecuzione della funzione
configureRedirectURLs();
