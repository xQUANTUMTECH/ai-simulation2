# Configurazione CORS di Supabase per Netlify

Dopo aver deployato il sito su Netlify, è necessario configurare Supabase per permettere le richieste cross-origin dal dominio Netlify. Questo è un passaggio essenziale per garantire che l'applicazione frontend possa comunicare correttamente con il backend Supabase.

## Istruzioni per la Configurazione CORS

### 1. Accedi alla Dashboard di Supabase

1. Vai su [https://app.supabase.io/](https://app.supabase.io/)
2. Accedi al tuo account
3. Seleziona il progetto `twusehwykpemphqtxlrx`

### 2. Configura le Impostazioni CORS

1. Nel menu laterale, seleziona **Impostazioni**
2. Vai alla sezione **API**
3. Scorri fino a trovare **CORS (Cross-Origin Resource Sharing)**
4. Aggiungi i seguenti domini alla lista dei domini consentiti:
   - `https://extraordinary-strudel-696753.netlify.app`
   - `https://*.extraordinary-strudel-696753.netlify.app` (per includere tutti i sottodomini)
   - `http://localhost:5173` (per lo sviluppo locale con Vite)
   - `http://localhost:3000` (come fallback per altri server di sviluppo)

### 3. Configura le Impostazioni di Autenticazione

1. Nel menu laterale, seleziona **Autenticazione**
2. Vai alla sezione **Impostazioni URL**
3. Aggiungi il seguente URL alla lista degli URL di reindirizzamento:
   - `https://extraordinary-strudel-696753.netlify.app/**`
   - `http://localhost:5173/**` (per lo sviluppo locale)
   - `http://localhost:3000/**` (come fallback)

## Verifica della Configurazione

Dopo aver configurato le impostazioni CORS e di autenticazione, è opportuno verificare che tutto funzioni correttamente:

1. Accedi al sito deployato su Netlify: [https://extraordinary-strudel-696753.netlify.app](https://extraordinary-strudel-696753.netlify.app)
2. Prova a effettuare il login con le credenziali create:
   - Utente: `studente@cafasso.edu` / `Cafasso2025!`
   - Admin: `direttore@cafasso.edu` / `CafassoAdmin2025!`
3. Verifica che altre funzionalità che utilizzano Supabase (upload di file, query al database, ecc.) funzionino correttamente

## Risoluzione dei Problemi

Se incontri errori CORS nella console del browser, ecco alcuni passaggi da seguire:

1. Verifica che i domini siano stati aggiunti correttamente nella configurazione CORS di Supabase
2. Assicurati che gli URL di reindirizzamento per l'autenticazione siano configurati correttamente
3. Controlla che le variabili d'ambiente in Netlify (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) siano impostate correttamente

## Nota Importante su Supabase Storage

Se utilizzi Supabase Storage per caricare file, potresti dover configurare ulteriori impostazioni CORS specifiche per lo storage:

1. Nel menu laterale, seleziona **Storage**
2. Vai alla sezione **Impostazioni**
3. Aggiungi gli stessi domini nella sezione CORS delle impostazioni di storage
