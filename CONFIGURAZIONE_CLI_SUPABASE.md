# Configurazione Supabase via CLI/API

Purtroppo, alcune configurazioni come CORS e impostazioni Email non sono direttamente accessibili tramite la CLI ufficiale di Supabase. Tuttavia, è possibile utilizzare l'API Management di Supabase per eseguire alcune di queste configurazioni.

## Approccio tramite Management API

### Prerequisiti
- Token di accesso personale (PAT) di Supabase
- ID del progetto Supabase
- Strumento come `curl` o Postman per fare richieste API

## 1. Configurazione CORS

Per configurare CORS tramite l'API Management di Supabase, possiamo utilizzare il seguente script:

```javascript
// cors-config.js
const fetch = require('node-fetch');

const SUPABASE_PAT = 'tuo-personal-access-token';  // Da ottenere dalla dashboard Supabase
const PROJECT_REF = 'twusehwykpemphqtxlrx';  // Il reference del progetto
const NETLIFY_DOMAIN = 'extraordinary-strudel-696753.netlify.app';

async function configureCORS() {
  try {
    const response = await fetch(`https://api.supabase.io/v1/projects/${PROJECT_REF}/api-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PAT}`
      },
      body: JSON.stringify({
        cors_settings: {
          allowed_origins: [
            `https://${NETLIFY_DOMAIN}`,
            `https://*.${NETLIFY_DOMAIN}`,
            'http://localhost:5173',
            'http://localhost:3000'
          ]
        }
      })
    });
    
    if (response.ok) {
      console.log('Configurazione CORS completata con successo!');
    } else {
      console.error('Errore nella configurazione CORS:', await response.text());
    }
  } catch (error) {
    console.error('Errore nella richiesta API:', error);
  }
}

configureCORS();
```

## 2. Configurazione Email - Disabilitare Conferma Email

Per disabilitare la conferma email tramite API:

```javascript
// disable-email-confirm.js
const fetch = require('node-fetch');

const SUPABASE_PAT = 'tuo-personal-access-token';
const PROJECT_REF = 'twusehwykpemphqtxlrx';

async function disableEmailConfirmation() {
  try {
    const response = await fetch(`https://api.supabase.io/v1/projects/${PROJECT_REF}/auth-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PAT}`
      },
      body: JSON.stringify({
        email_confirm_required: false
      })
    });
    
    if (response.ok) {
      console.log('Conferma email disabilitata con successo!');
    } else {
      console.error('Errore nella disabilitazione della conferma email:', await response.text());
    }
  } catch (error) {
    console.error('Errore nella richiesta API:', error);
  }
}

disableEmailConfirmation();
```

## 3. Configurazione URL di Reindirizzamento per Autenticazione

```javascript
// auth-redirect-config.js
const fetch = require('node-fetch');

const SUPABASE_PAT = 'tuo-personal-access-token';
const PROJECT_REF = 'twusehwykpemphqtxlrx';
const NETLIFY_DOMAIN = 'extraordinary-strudel-696753.netlify.app';

async function configureRedirectURLs() {
  try {
    const response = await fetch(`https://api.supabase.io/v1/projects/${PROJECT_REF}/auth-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PAT}`
      },
      body: JSON.stringify({
        redirect_urls: [
          `https://${NETLIFY_DOMAIN}/**`,
          'http://localhost:5173/**',
          'http://localhost:3000/**'
        ]
      })
    });
    
    if (response.ok) {
      console.log('URL di reindirizzamento configurati con successo!');
    } else {
      console.error('Errore nella configurazione degli URL di reindirizzamento:', await response.text());
    }
  } catch (error) {
    console.error('Errore nella richiesta API:', error);
  }
}

configureRedirectURLs();
```

## Come ottenere un Personal Access Token (PAT)

Per utilizzare questi script, è necessario un token di accesso personale (PAT) di Supabase:

1. Accedi alla [dashboard di Supabase](https://app.supabase.io)
2. Clicca sul tuo profilo in basso a sinistra
3. Seleziona "Account"
4. Vai alla sezione "Access Tokens"
5. Crea un nuovo token con descrizione appropriata
6. Copia il token generato (sarà mostrato solo una volta)

## Limitazioni

- Non tutte le configurazioni sono esposte tramite API Management
- La configurazione SMTP per le email richiede ancora l'interfaccia utente web
- Alcuni endpoint potrebbero richiedere autorizzazioni specifiche
- L'API Management di Supabase è in continua evoluzione e potrebbe cambiare

## Alternativa: Script utilizzando Puppeteer

Un'alternativa più avanzata (ma più complessa) è creare uno script con Puppeteer che automatizzi le configurazioni tramite l'interfaccia web. Tuttavia, questo approccio è molto più complicato e fragile, poiché dipende dalla struttura HTML dell'interfaccia utente che potrebbe cambiare nel tempo.

## Conclusione

Per una configurazione completa e affidabile, l'approccio consigliato rimane l'utilizzo dell'interfaccia web di Supabase. Gli script API possono essere utili per automatizzare alcune configurazioni di base, ma potrebbero non coprire tutte le funzionalità disponibili tramite l'interfaccia utente.
