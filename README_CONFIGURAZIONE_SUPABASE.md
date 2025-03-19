# Configurazione Supabase via API

Questo pacchetto contiene script per configurare automaticamente Supabase tramite la sua API Management senza dover utilizzare l'interfaccia web. Gli script sono progettati per configurare:

1. **Impostazioni CORS** - Per permettere richieste dal dominio Netlify
2. **Disabilitare la conferma email** - Per permettere agli utenti di registrarsi senza dover confermare l'email
3. **URL di reindirizzamento per autenticazione** - Per configurare i redirect dopo il login/registro

## Prerequisiti

- Node.js installato
- Un Personal Access Token (PAT) di Supabase

## Come ottenere un Personal Access Token (PAT) di Supabase

1. Accedi alla [dashboard di Supabase](https://app.supabase.io)
2. Clicca sul tuo profilo in basso a sinistra
3. Seleziona "Account"
4. Vai alla sezione "Access Tokens"
5. Crea un nuovo token con descrizione appropriata (es. "Config API Token")
6. Copia il token generato (sarà mostrato solo una volta)

## Istruzioni per l'uso

### 1. Installare le dipendenze

Prima di tutto, installa le dipendenze necessarie:

```bash
npm install --save node-fetch
```

Oppure usa lo script nel package.json:

```bash
npm run install-deps
```

### 2. Configurare il token negli script

Modifica ciascuno dei seguenti file e sostituisci `YOUR_PERSONAL_ACCESS_TOKEN_HERE` con il tuo PAT di Supabase:

- `cors-config.js`
- `disable-email-confirm.js`
- `auth-redirect-config.js`

### 3. Eseguire gli script

Puoi eseguire gli script individualmente:

```bash
# Configurare CORS
node cors-config.js

# Disabilitare la conferma email
node disable-email-confirm.js

# Configurare gli URL di reindirizzamento
node auth-redirect-config.js
```

Oppure esegui tutti gli script in sequenza:

```bash
npm run configure-all
```

## Descrizione degli script

### cors-config.js

Questo script configura le impostazioni CORS di Supabase per permettere richieste dal dominio Netlify. Aggiunge i seguenti domini alla lista dei domini consentiti:

- `https://extraordinary-strudel-696753.netlify.app`
- `https://*.extraordinary-strudel-696753.netlify.app`
- `http://localhost:5173` (per lo sviluppo locale con Vite)
- `http://localhost:3000` (come fallback per altri server di sviluppo)

### disable-email-confirm.js

Questo script disabilita la necessità di confermare l'email durante la registrazione. Questo è utile per ambienti di sviluppo o quando si preferisce gestire la verifica in altro modo.

**Nota**: Gli utenti che abbiamo creato manualmente (`studente@cafasso.edu` e `direttore@cafasso.edu`) sono già configurati con email confermata (`email_confirm: true`), quindi possono già accedere senza problemi.

### auth-redirect-config.js

Questo script configura gli URL di reindirizzamento per l'autenticazione. Dopo che un utente effettua il login, la registrazione o altre operazioni di autenticazione, sarà reindirizzato a questi URL. Configura:

- `https://extraordinary-strudel-696753.netlify.app/**`
- `https://*.extraordinary-strudel-696753.netlify.app/**`
- `http://localhost:5173/**` (per lo sviluppo locale)
- `http://localhost:3000/**` (come fallback)

## Verifica della configurazione

Dopo aver eseguito gli script, puoi verificare che le configurazioni siano state applicate correttamente:

1. Accedi al sito Netlify: [https://extraordinary-strudel-696753.netlify.app](https://extraordinary-strudel-696753.netlify.app)
2. Prova a registrare un nuovo utente (non dovrebbe richiedere la conferma email)
3. Prova a effettuare il login con le credenziali create precedentemente:
   - Utente: `studente@cafasso.edu` / `Cafasso2025!`
   - Admin: `direttore@cafasso.edu` / `CafassoAdmin2025!`

## Risoluzione dei problemi

Se incontri errori durante l'esecuzione degli script:

1. Verifica che il token PAT sia valido e abbia i permessi necessari
2. Controlla che il progetto esista e che l'ID del progetto sia corretto
3. Verifica che le richieste API non siano bloccate da firewall o altre restrizioni di rete
4. Se gli script funzionano ma l'applicazione continua ad avere problemi, potrebbe essere necessario configurare manualmente altre impostazioni tramite l'interfaccia web di Supabase

## Limitazioni

Questi script utilizzano l'API Management di Supabase, che ha alcune limitazioni:

- Non tutte le configurazioni sono esposte tramite l'API
- La configurazione SMTP per le email richiede l'interfaccia utente web
- Gli endpoint potrebbero cambiare in futuro con aggiornamenti di Supabase
