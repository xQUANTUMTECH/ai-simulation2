# Gestione del Database SQLite per il Deploy

## Introduzione

Questo documento descrive le opzioni e le best practice per gestire il database SQLite nel contesto di deployment dell'applicazione Cafasso AI Academy. A differenza di Supabase, che è un servizio cloud, SQLite è un database file-based che richiede un approccio differente per il deployment.

## Opzioni di Deployment

### 1. Deploy Locale (Desktop/Server)

**Descrizione:** Il database SQLite viene installato direttamente sul computer o server dove viene eseguita l'applicazione.

**Vantaggi:**
- Nessuna dipendenza da servizi esterni
- Semplicità di configurazione
- Performance ottimali (accesso diretto al file)
- Funzionamento offline completo

**Svantaggi:**
- Limitato a una singola macchina
- Difficoltà nella condivisione dei dati tra più utenti

**Come implementare:**
- Eseguire lo script `initialize-complete-database.bat` sul server/computer
- Configurare l'applicazione per utilizzare il file database.sqlite locale
- Implementare backup regolari del file database

### 2. Deploy con Server Express

**Descrizione:** Il database SQLite viene gestito da un server Node.js che espone REST API per l'accesso ai dati.

**Vantaggi:**
- Consente l'accesso al database da client multipli
- Mantiene la semplicità di SQLite
- Centralizza la logica di accesso ai dati

**Svantaggi:**
- Richiede un server Node.js in esecuzione
- Introduce latenza di rete rispetto all'accesso diretto

**Come implementare:**
```javascript
// server.js
import express from 'express';
import cors from 'cors';
import DatabaseOperations from './src/database/db-operations.js';

const app = express();
const PORT = process.env.PORT || 3000;
const db = new DatabaseOperations();

app.use(cors());
app.use(express.json());

// Esempio endpoint per ottenere utenti
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Altri endpoint per CRUD operations

app.listen(PORT, () => {
  console.log(`Server SQLite in esecuzione sulla porta ${PORT}`);
});
```

### 3. Deploy Serverless con SQLite Embedded

**Descrizione:** Utilizzo di SQLite in modalità embedded all'interno di funzioni serverless (come Netlify Functions o Vercel Functions).

**Vantaggi:**
- Deployment serverless senza gestione di infrastruttura
- Paghi solo per l'utilizzo effettivo
- Possibilità di scalare automaticamente

**Svantaggi:**
- Il database viene ricreato ad ogni chiamata di funzione (cold start)
- Problemi di concorrenza nelle scritture
- Storage limitato

**Come implementare:**
```javascript
// netlify/functions/api.js
import { SQLiteESMLoader } from 'sqlite-esm-loader';
import path from 'path';

export async function handler(event, context) {
  const dbPath = path.join(__dirname, 'database.sqlite');
  const db = await SQLiteESMLoader.load(dbPath);
  
  try {
    // Query al database
    const result = await db.all('SELECT * FROM users');
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    await db.close();
  }
}
```

### 4. Deploy Ibrido con SQLite + API Web

**Descrizione:** SQLite è installato sul client per operazioni locali, ma si sincronizza con un'API web per funzionalità condivise.

**Vantaggi:**
- Funzionamento offline
- Sincronizzazione dati tra dispositivi
- Performance ottimale per operazioni locali

**Svantaggi:**
- Complessità nella gestione della sincronizzazione
- Possibili conflitti di dati

**Come implementare:**
- Utilizzare SQLite per storage locale
- Implementare un sistema di sincronizzazione con timestamp
- Utilizzare un server API per lo storage condiviso

## Considerazioni Importanti

### Gestione dei File Storage

Poiché abbiamo implementato un sistema di storage che emula i bucket Supabase:

1. **Opzione locale:** Mantieni i file nella directory `storage/` locale
2. **Opzione cloud:** Sincronizza la directory `storage/` con un servizio come S3 o equivalenti
3. **Opzione ibrida:** Mantieni i file piccoli/temporanei localmente, archivia i file permanenti su cloud storage

### Backup e Sicurezza

1. **Backup regolari:**
   ```bash
   # Script di backup
   mkdir -p backups
   sqlite3 database.sqlite ".backup backups/database_$(date +%Y%m%d%H%M%S).sqlite"
   ```

2. **Crittografia:**
   Per progetti con dati sensibili, considerare la crittografia del file SQLite:
   ```javascript
   const cipher = require('sqlite-cipher');
   cipher.encryptDatabase('database.sqlite', 'database.enc.sqlite', 'password');
   ```

3. **Controllo degli accessi:**
   Implementare un sistema di autenticazione e autorizzazione nell'applicazione

## Raccomandazione per Cafasso AI Academy

Per l'applicazione Cafasso AI Academy, consigliamo il deployment con **Server Express** per i seguenti motivi:

1. Consente di centralizzare i dati tra più utenti
2. Mantiene la semplicità di SQLite
3. Permette di implementare logica di accesso ai dati a livello server
4. Facilita la gestione dei file di storage in modo centralizzato
5. Può essere facilmente deployato su servizi PaaS come Heroku, Render o Railway

### Passi per il Deploy:

1. Creare un server Express come descritto sopra
2. Configurare le API necessarie per tutte le operazioni CRUD
3. Deployare il server su un servizio PaaS (Heroku, Render, Railway, ecc.)
4. Configurare il client per utilizzare queste API invece dell'adattatore SQLite locale
5. Implementare un sistema di backup automatico

## Conclusioni

SQLite offre grande flessibilità nel deployment, dalle soluzioni completamente locali a quelle cloud-based. La scelta dipende dalle specifiche esigenze del progetto Cafasso AI Academy, inclusi requisiti di concorrenza, disponibilità online e necessità di condivisione dati.

Per progetti più piccoli o per testing, l'opzione locale è ottimale. Per progetti con più utenti che necessitano di accesso condiviso, l'opzione con server Express è consigliata.
