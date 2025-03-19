# Istruzioni per Applicare le Correzioni Supabase

Questo documento contiene le istruzioni per applicare le correzioni identificate nell'analisi delle connessioni tra funzioni e tabelle Supabase.

## Problemi Identificati

1. **Tabelle Mancanti**:
   - `auth_sessions` - utilizzata da AuthService ma non trovata nel database
   - `failed_login_attempts` - utilizzata da AuthService ma non trovata nel database
   - `user_settings` - utilizzata da AuthService ma non trovata nel database

2. **Campi Mancanti nella Tabella Users**:
   - `username` - utilizzato in auth-service.ts ma potrebbe mancare nella tabella
   - `account_status` - utilizzato in auth-service.ts ma potrebbe mancare nella tabella

3. **Bucket Storage Mancanti**:
   - Alcuni bucket (uploads, storage, simulations, training) sono referenziati nel codice ma potrebbero non esistere tutti

## File di Correzione

Sono stati creati due file per correggere questi problemi:

1. **fix_missing_tables.sql**: Script SQL per creare le tabelle mancanti e aggiungere i campi mancanti
2. **setup_all_buckets.js**: Script JavaScript per creare tutti i bucket di storage necessari

## Procedura di Applicazione

### 1. Correzione delle Tabelle Mancanti

Eseguire lo script SQL per creare le tabelle mancanti. Questo può essere fatto in diversi modi:

#### Opzione 1: Utilizzando la CLI di Supabase

```bash
supabase db execute --file fix_missing_tables.sql
```

#### Opzione 2: Utilizando l'interfaccia SQL dell'editor Supabase

1. Accedi al dashboard di Supabase (https://app.supabase.io)
2. Seleziona il tuo progetto
3. Vai alla sezione "SQL Editor"
4. Crea un nuovo script
5. Copia e incolla il contenuto di `fix_missing_tables.sql`
6. Esegui lo script

#### Opzione 3: Aggiungere come migrazione

1. Copia lo script SQL nella cartella delle migrazioni
```bash
cp fix_missing_tables.sql supabase/migrations/20250325000000_fix_missing_tables.sql
```

2. Applica la migrazione
```bash
supabase migration up
```

### 2. Configurazione dei Bucket di Storage

Eseguire lo script JavaScript per creare e configurare tutti i bucket necessari:

```bash
node setup_all_buckets.js
```

Questo script:
1. Controlla quali bucket esistono già
2. Crea i bucket mancanti con le configurazioni corrette
3. Imposta le policy di accesso appropriate per ogni bucket

## Verifica delle Correzioni

Dopo aver applicato le correzioni, è possibile verificare che tutto sia configurato correttamente utilizzando lo script di test unificato:

```bash
node supabase-test-unified.js --all
```

Lo script controllerà:
- Connessione al database Supabase
- Presenza di tutte le tabelle necessarie
- Presenza dei campi richiesti nelle tabelle
- Presenza di tutti i bucket di storage
- Configurazione RLS (Row Level Security)

## Note Importanti

- Gli script sono stati progettati per essere idempotenti (possono essere eseguiti più volte senza causare problemi)
- Le modifiche al database richiedono i permessi di amministratore
- Gli script utilizzano le credenziali Supabase memorizzate nel file SUPABASE_CREDENTIALS.md
- Modifiche alla struttura del database dovrebbero sempre essere testate in un ambiente di sviluppo prima di essere applicate in produzione

## Risoluzione dei Problemi

Se incontri problemi durante l'applicazione delle correzioni:

1. Verifica che le credenziali Supabase siano corrette
2. Assicurati di avere i permessi necessari (ruolo service_role)
3. Controlla i log di errore generati dagli script
4. Esegui ogni comando separatamente per individuare meglio i problemi
5. Verifica l'accesso alla rete e la connessione al database

Per ulteriori informazioni, consulta il file `SUPABASE_TABLES_FUNCTIONS_ANALYSIS.md` che contiene l'analisi completa delle dipendenze tra funzioni e tabelle.
