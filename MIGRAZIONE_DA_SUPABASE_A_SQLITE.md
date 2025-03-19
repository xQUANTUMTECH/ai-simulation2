# Migrazione da Supabase a SQLite

## Motivazione della Migrazione

Abbiamo deciso di migrare da Supabase a SQLite per i seguenti motivi:

1. **Semplicità di configurazione**: SQLite è un database file-based che non richiede un server separato
2. **Facilità di gestione tramite CLI**: Più facile da gestire attraverso comandi diretti
3. **Sviluppo locale semplificato**: Perfetto per l'ambiente di sviluppo
4. **Eliminazione dei problemi di policy RLS**: Non più necessario configurare policy di Row Level Security
5. **Backup semplificati**: Il database è un singolo file facilmente copiabile
6. **Nessuna dipendenza da servizi esterni**: Funzionamento completamente offline

## Architettura Implementata

Abbiamo implementato una soluzione a tre livelli:

1. **Livello di Accesso ai Dati**: Script di inizializzazione e migrazione del database
2. **Livello di Astrazione**: Classe `DatabaseOperations` per tutte le operazioni CRUD
3. **Livello Applicativo**: Utilizzo tramite l'applicazione esistente

### Componenti Implementati

- `src/database/init-sqlite-db.js`: Inizializzazione del database SQLite e creazione delle tabelle
- `src/database/migrate-from-supabase.js`: Migrazione dei dati da Supabase a SQLite
- `src/database/db-operations.js`: Classe per operazioni CRUD sul database
- `initialize-sqlite-db.bat`: Script per l'installazione e configurazione automatica

## Come Eseguire la Migrazione

1. Assicurati che le credenziali Supabase siano presenti nel file `.env`:

```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

2. Esegui lo script `initialize-sqlite-db.bat` dalla directory principale del progetto
3. Lo script:
   - Installerà le dipendenze necessarie
   - Creerà il database SQLite con le tabelle richieste
   - Migrerà i dati esistenti da Supabase (se le credenziali sono valide)

## Utilizzo del Nuovo Database

Per utilizzare il database SQLite nella tua applicazione:

```javascript
const DatabaseOperations = require('./src/database/db-operations');

// Esempio di utilizzo
async function example() {
  const dbOps = new DatabaseOperations();
  
  try {
    // Creazione di un utente
    const userId = await dbOps.createUser('example@email.com');
    
    // Creazione di un documento
    const docId = await dbOps.createDocument(userId, 'Contenuto del documento');
    
    // Ricerca di documenti
    const results = await dbOps.searchDocuments('Contenuto');
    console.log(results);
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    // Chiusura della connessione
    await dbOps.close();
  }
}
```

## Vantaggi Rispetto a Supabase

1. **Performance migliorate**: Accesso diretto al database senza latenza di rete
2. **Nessun limite di archiviazione**: Limitato solo dallo spazio su disco
3. **Semplicità di backup**: Copia il file `database.sqlite` per un backup completo
4. **Nessun problema di autenticazione**: Gestione dell'autenticazione semplificata
5. **Nessuna configurazione complessa di policy RLS**: Sicurezza gestita a livello applicativo

## Note Importanti

- SQLite funziona bene per sviluppo e piccole applicazioni
- Per deployment in produzione con molti utenti concorrenti, potrebbe essere necessario ritornare a una soluzione basata su server (PostgreSQL)
- Il file `database.sqlite` contiene TUTTI i dati e dovrebbe essere incluso in `.gitignore`
