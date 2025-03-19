# Configurazione di Netlify per Cafasso AI Academy

Questo documento fornisce istruzioni specifiche per il deploy del progetto Cafasso AI Academy su Netlify, basate sulla documentazione ufficiale.

## File di configurazione già preparati

Abbiamo già creato due file essenziali:

1. **netlify.toml** - Configurazione completa per build, redirect e ottimizzazioni
2. **DEPLOY_NETLIFY.md** - Guida passo-passo per il processo di deploy

## Passi rapidi per il deploy

### 1. Preparazione del repository

```bash
# Verifica il build locale
npm run build

# Commit dei file di configurazione
git add netlify.toml DEPLOY_NETLIFY.md
git commit -m "Aggiunta configurazione Netlify"
git push
```

### 2. Deploy su Netlify

1. Accedi a [Netlify](https://app.netlify.com/)
2. Seleziona "New site from Git"
3. Connetti il repository GitHub
4. Configura le seguenti variabili d'ambiente:
   - `VITE_SUPABASE_URL`: `https://twusehwykpemphqtxlrx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk`
   - `VITE_APP_ENV`: `production`
5. Clicca su "Deploy site"

### 3. Verifica il deploy

1. Una volta completato il deploy, Netlify fornirà un URL (es. `random-name-123456.netlify.app`)
2. Apri l'URL e verifica che:
   - L'applicazione si carichi correttamente
   - La connessione a Supabase funzioni
   - Il login sia possibile con:
     - Utente normale: `studente@cafasso.edu` / `Cafasso2025!`
     - Amministratore: `direttore@cafasso.edu` / `CafassoAdmin2025!`

## Impostazioni avanzate (opzionali)

### Configurazione del dominio personalizzato

1. Dalla dashboard Netlify, vai su "Domain settings"
2. Clicca su "Add custom domain"
3. Inserisci il dominio desiderato (es. `academy.cafasso.it`)
4. Configura i record DNS come indicato da Netlify

### Continuous Deployment

Il deploy continuo è attivato automaticamente. Ogni push al branch principale del repository avvierà un nuovo deploy su Netlify.

## Risoluzione dei problemi

### Errori di build

- Controlla i log di build su Netlify
- Verifica che il progetto funzioni localmente con `npm run build`
- Assicurati che le dipendenze siano installate correttamente

### Problemi di connessione a Supabase

- Verifica le variabili d'ambiente su Netlify
- Controlla che i bucket di storage su Supabase abbiano le corrette impostazioni CORS
- Assicurati che le policy RLS su Supabase permettano l'accesso dalle origini esterne

## Risorse

- [DEPLOY_NETLIFY.md](./DEPLOY_NETLIFY.md) - Guida dettagliata al deploy
- [NETFLY_DOCS.MD](./NETFLY_DOCS.MD) - Documentazione completa di Netlify
- [SUPABASE_SETUP_COMPLETED.md](./SUPABASE_SETUP_COMPLETED.md) - Documentazione sulla configurazione di Supabase

Per assistenza aggiuntiva, consulta la [documentazione ufficiale di Netlify](https://docs.netlify.com/).
