# Aggiornamento delle istruzioni di utilizzo

## Problemi riscontrati durante l'avvio

Durante il tentativo di avvio del sistema sono stati riscontrati i seguenti problemi:

1. **MongoDB non è installato**: Il sistema richiede l'installazione del server MongoDB per funzionare correttamente.

2. **Dipendenze Node.js mancanti**: Alcune dipendenze come `bcrypt` non erano installate.

## Soluzioni e requisiti

### 1. Installazione di MongoDB

Per utilizzare il sistema è necessario installare MongoDB:

#### Windows:
1. Scaricare MongoDB Community Server da: https://www.mongodb.com/try/download/community
2. Eseguire l'installer e seguire le istruzioni
3. Aggiungere il percorso bin di MongoDB al PATH di sistema (tipicamente `C:\Program Files\MongoDB\Server\[version]\bin`)
4. Creare la directory per i dati: `C:\data\db`

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
```

#### Linux (Ubuntu):
```bash
sudo apt update
sudo apt install -y mongodb
```

### 2. Installazione delle dipendenze Node.js

```bash
npm install bcrypt mongodb jsonwebtoken express cors nodemailer
```

## Procedura di avvio corretta

1. Assicurarsi che MongoDB sia installato e funzionante
2. Chiudere eventuali processi in esecuzione con `chiudi-tutto.bat`
3. Avviare manualmente MongoDB:
   ```
   mongod --dbpath="./mongodb_data"
   ```
4. In un altro terminale, creare l'utente admin:
   ```
   node crea-utente-admin.js
   ```
5. Avviare il server Express:
   ```
   node server-express.mjs
   ```
6. Avviare il frontend React:
   ```
   npm run dev
   ```

In alternativa, dopo aver installato MongoDB, provare nuovamente `riavvia-tutto.bat`.

## Architettura alternativa senza MongoDB locale

Se l'installazione di MongoDB locale risulta problematica, esistono alcune alternative:

### Opzione 1: MongoDB Atlas (cloud)

1. Creare un account su MongoDB Atlas: https://www.mongodb.com/cloud/atlas
2. Creare un cluster gratuito
3. Ottenere la stringa di connessione
4. Aggiornare il file `.env` con:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cafasso_academy
   ```

### Opzione 2: MongoDB Docker

Se Docker è installato:

```bash
docker run --name mongodb -p 27017:27017 -v ./mongodb_data:/data/db -d mongo
```

## Credenziali amministratore

Utilizzare queste credenziali per accedere al sistema:

- Username: `admin`
- Password: `Cafasso@admin2025!`

## Nota sulle modifiche necessarie

Se si sta utilizzando MongoDB Atlas o qualsiasi soluzione cloud, sarà necessario modificare:

1. I file di connessione per utilizzare la stringa di connessione corretta
2. Configurare le regole firewall e networking appropriate
3. Aggiornare script e comandi batch per non tentare di avviare MongoDB locale

## Verifica dell'installazione MongoDB

Per verificare che MongoDB sia correttamente installato e funzionante:

```bash
mongod --version
```

Questo comando dovrebbe mostrare la versione di MongoDB installata.
