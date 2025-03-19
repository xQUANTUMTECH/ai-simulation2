# Guida al Deploy su Netlify

Questa guida descrive il processo di deploy dell'applicazione Cafasso AI Academy su Netlify.

## Prerequisiti

1. Account Netlify (registrazione gratuita su [netlify.com](https://netlify.com))
2. Repository Git con il progetto (GitHub, GitLab, Bitbucket)

## Configurazione già completata

Nel repository è già presente il file di configurazione `netlify.toml` che specifica:
- Directory di pubblicazione: `dist`
- Comando di build: `npm run build`
- Reindirizzamenti per supportare il routing client-side
- Ottimizzazione automatica di CSS, JavaScript e immagini

## Passi per il Deploy

### 1. Preparazione del progetto

1. Verifica che l'applicazione funzioni correttamente in locale
2. Esegui `npm run build` per verificare che il processo di build non generi errori
3. Commit e push di tutte le modifiche al repository Git

### 2. Configurazione su Netlify

1. Accedi al tuo account Netlify
2. Clicca su "New site from Git"
3. Seleziona il provider Git (GitHub, GitLab, Bitbucket)
4. Autorizza Netlify ad accedere ai tuoi repository
5. Seleziona il repository del progetto Cafasso AI Academy
6. Nella pagina di configurazione del deploy:
   - Il comando di build e la directory di pubblicazione saranno automaticamente rilevati dal file `netlify.toml`
   - Espandi la sezione "Advanced build settings" per configurare le variabili d'ambiente

### 3. Variabili d'ambiente

Aggiungi le seguenti variabili d'ambiente (clicca su "New variable" per ciascuna):

| Chiave | Valore |
|--------|--------|
| `VITE_SUPABASE_URL` | `https://twusehwykpemphqtxlrx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk` |
| `VITE_APP_ENV` | `production` |

### 4. Avvio del deploy

1. Clicca su "Deploy site"
2. Netlify inizierà automaticamente il processo di build e deploy
3. Una volta completato, ti verrà assegnato un URL temporaneo (es. `random-name-123456.netlify.app`)

### 5. Configurazione del dominio personalizzato (opzionale)

Se desideri utilizzare un dominio personalizzato:

1. Dalla dashboard del sito su Netlify, vai su "Domain settings"
2. Clicca su "Add custom domain"
3. Inserisci il dominio desiderato e segui le istruzioni per la configurazione DNS

### 6. Verifica

1. Visita l'URL fornito da Netlify dopo il deploy
2. Verifica che l'applicazione funzioni correttamente:
   - Test delle funzionalità principali
   - Verifica della connessione a Supabase
   - Test del login con le credenziali create:
     - Utente: `studente@cafasso.edu` / `Cafasso2025!`
     - Admin: `direttore@cafasso.edu` / `CafassoAdmin2025!`

## Risoluzione dei problemi comuni

### Errori di build

Se il deploy fallisce, controlla i log di build su Netlify per identificare il problema:
- Dipendenze mancanti
- Errori di sintassi
- Problemi di compatibilità

### Problemi di connessione a Supabase

Se l'applicazione non riesce a connettersi a Supabase:
1. Verifica che le variabili d'ambiente siano configurate correttamente
2. Controlla che le policy RLS su Supabase permettano l'accesso dalle origini esterne
3. Assicurati che i bucket di storage abbiano le autorizzazioni corrette

### Problemi di routing

Se alcune route non funzionano correttamente:
1. Verifica che il file `netlify.toml` contenga la configurazione di reindirizzamento corretta
2. Controlla che il router client-side (React Router) sia configurato correttamente

## Continuous Deployment

Netlify è configurato per il continuous deployment. Ogni volta che effettui un push al branch principale del repository, Netlify avvierà automaticamente un nuovo deploy.
