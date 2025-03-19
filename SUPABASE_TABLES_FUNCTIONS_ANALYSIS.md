# Analisi delle Tabelle e Funzioni Supabase

Questo documento contiene un'analisi dettagliata della connessione tra le funzioni dell'applicazione e le tabelle del database Supabase, insieme ai problemi identificati e le soluzioni proposte.

## 1. Struttura del Database

### 1.1 Tabelle Principali

| Tabella | Descrizione | Utilizzata da | Note |
|---------|-------------|---------------|------|
| `auth.users` | Tabella gestita da Supabase Auth | `auth-service.ts`, `admin-auth-service.ts` | Tabella di sistema |
| `public.users` | Profili utente estesi | `auth-service.ts`, `admin-auth-service.ts` | Estende auth.users |
| `public.auth_sessions` | Sessioni persistenti | `auth-service.ts` | **Mancante** |
| `public.failed_login_attempts` | Tentativi di login falliti | `auth-service.ts` | **Mancante** |
| `public.user_settings` | Impostazioni utente | `auth-service.ts` | **Mancante** |
| `public.documents` | Documenti formativi | `document-service.ts` | OK |
| `public.scenarios` | Scenari di simulazione | `scenario-service.ts` | OK |
| `public.courses` | Corsi formativi | `course-service.ts` | OK |
| `public.progress` | Progressi degli utenti | `course-progress-service.ts` | OK |

### 1.2 Campi Mancanti

| Tabella | Campo | Utilizzato da | Note |
|---------|-------|---------------|------|
| `public.users` | `username` | `auth-service.ts` | Campo usato per login alternativo |
| `public.users` | `account_status` | `auth-service.ts` | Campo usato per gestione account |

## 2. Storage Buckets

| Bucket | Utilizzato da | Stato |
|--------|---------------|-------|
| `documents` | `document-service.ts` | Esistente |
| `videos` | `VideoUploader.tsx` | Esistente |
| `uploads` | `FileUpload.tsx` | **Mancante** |
| `storage` | `document-service.ts` | **Mancante** |
| `simulations` | `scenario-service.ts` | **Mancante** |
| `training` | `learning-service.ts` | **Mancante** |

## 3. Importazione dei Dati

L'applicazione utilizza tre metodi diversi per importare dati in Supabase:

### 3.1 Importazione via API (`importDataViaApi`)

```javascript
// In import-data-to-supabase.js
async function importDataViaApi(tableName, data, useServiceRole = false) {
  // Crea un client Supabase
  const supabase = createClient(SUPABASE_URL, authToken);
  
  // Inserisce i dati in batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert(batch)
      .select();
  }
}
```

Questo metodo è usato principalmente per:
- Dati strutturati con dipendenze (es. utenti, documenti)
- Dataset di dimensioni medio-piccole (meno di 10.000 righe)
- Importazioni che richiedono validazione immediata

### 3.2 Importazione via COPY (`importViaPgCopy`)

```javascript
// In import-data-to-supabase.js
async function importViaPgCopy(tableName, data, columns) {
  // Crea file CSV temporaneo
  let csvContent = columns.join(',') + '\n';
  // Aggiungi righe dati
  for (const row of data) {
    const csvRow = columns.map(col => {...}).join(',');
    csvContent += csvRow + '\n';
  }
  
  // Esegui comando COPY
  const copyCommand = `\\COPY ${tableName} (${columns.join(',')}) FROM '${csvFilePath}' WITH DELIMITER ',' CSV HEADER`;
}
```

Questo metodo è usato per:
- Dataset di grandi dimensioni (più di 10.000 righe)
- Importazioni in bulk senza necessità di validazione immediata
- Migrazioni da sistemi legacy

### 3.3 Importazione via CLI (`importViaSupabaseCli`)

```javascript
// In import-data-to-supabase.js
async function importViaSupabaseCli(sqlFilePath) {
  // Esegui comando supabase db push
  const result = spawnSync('supabase', ['db', 'push', '--linked', '--db-url', `...`], {
    shell: true
  });
}
```

Questo metodo è usato per:
- Ripristini completi del database
- Migrazioni strutturali (schema + dati)
- Deployment in ambienti CI/CD

## 4. Problemi Identificati

### 4.1 Tabelle Mancanti

Il servizio `auth-service.ts` fa riferimento a diverse tabelle che non esistono nel database:

```typescript
// In auth-service.ts
await nullSafeSupabase
  .from('auth_sessions')  // ❌ Tabella mancante
  .insert({
    user_id: userId,
    device_info: await this.getDeviceInfo(),
    ip_address: await this.getClientIP(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

await nullSafeSupabase
  .from('failed_login_attempts')  // ❌ Tabella mancante
  .insert({
    user_id: user.id,
    ip_address: await this.getClientIP()
  });

await nullSafeSupabase
  .from('user_settings')  // ❌ Tabella mancante
  .insert({
    user_id: authData.user.id,
    email_notifications: true,
    language: 'it',
    theme: 'dark'
  });
```

### 4.2 Campi Mancanti

Il servizio utilizza campi che potrebbero non esistere nella tabella `users`:

```typescript
// In auth-service.ts
const { data: users } = await nullSafeSupabase
  .from('users')
  .select('email, account_status, locked_until, username')  // ❌ Campi potenzialmente mancanti
  .eq('username', identifier);
```

### 4.3 Problemi nei Bucket di Storage

I seguenti bucket sono referenziati nel codice ma potrebbero non esistere:

```typescript
// In document-service.ts
const { data, error } = await supabase
  .storage
  .from('storage')  // ❌ Bucket potenzialmente mancante
  .upload(`documents/${fileName}`, file);

// In scenario-service.ts
const { data, error } = await supabase
  .storage
  .from('simulations')  // ❌ Bucket potenzialmente mancante
  .upload(`scenarios/${fileName}`, file);
```

### 4.4 Problemi di Importazione Dati

Lo script di importazione dati ha questi potenziali problemi:

1. **Credenziali hardcoded** in `import-data-to-supabase.js`
2. **Password PostgreSQL mancante** nel comando COPY
3. **Path assoluti** nei file CSV che possono causare problemi cross-platform
4. **Errori non gestiti** in alcuni casi di importazione

## 5. Soluzioni Implementate

### 5.1 Fix delle Tabelle Mancanti (`fix_missing_tables.sql`)

Abbiamo creato uno script SQL che:
- Crea le tabelle mancanti (`auth_sessions`, `failed_login_attempts`, `user_settings`)
- Aggiunge i campi mancanti alla tabella `users` se necessario
- Configura le policy RLS appropriati
- Crea indici per migliorare le prestazioni

### 5.2 Configurazione Bucket di Storage (`setup_all_buckets.js`)

Abbiamo creato uno script JS che:
- Verifica i bucket esistenti
- Crea i bucket mancanti con le configurazioni appropriate
- Configura le policy di accesso per ogni bucket

### 5.3 Test Unificato (`supabase-test-unified.js`)

Abbiamo creato uno script di test unificato che:
- Verifica la connessione al database
- Controlla la presenza di tutte le tabelle necessarie
- Verifica la presenza dei campi richiesti
- Controlla la presenza dei bucket di storage
- Verifica la configurazione RLS

### 5.4 Istruzioni di Applicazione (`ISTRUZIONI_APPLICAZIONE_CORREZIONI.md`)

Abbiamo documentato dettagliatamente:
- I problemi identificati
- Le soluzioni implementate
- Come applicare le correzioni
- Come verificare che tutto funzioni correttamente

## 6. Raccomandazioni per l'Importazione dei Dati

1. **Centralizzare le credenziali**:
   - Utilizzare variabili d'ambiente o file di configurazione sicuri
   - Evitare credenziali hardcoded negli script

2. **Migliorare l'handling degli errori**:
   - Implementare retry con backoff esponenziale
   - Salvare log dettagliati delle operazioni di importazione
   - Implementare rollback in caso di errori gravi

3. **Ottimizzare le performance**:
   - Utilizzare transazioni per importazioni correlate
   - Disabilitare temporaneamente trigger e vincoli per importazioni bulk
   - Utilizzare COPY per grandi dataset invece di INSERT

4. **Migliorare la sicurezza**:
   - Utilizzare connessioni SSL per importazioni remote
   - Limitare i privilegi dell'utente di importazione
   - Validare i dati prima dell'importazione

## 7. Prossimi Passi

1. **Eseguire lo script `fix_missing_tables.sql`** per creare le tabelle mancanti
2. **Eseguire lo script `setup_all_buckets.js`** per creare i bucket di storage mancanti
3. **Eseguire lo script `supabase-test-unified.js`** per verificare che tutte le correzioni siano state applicate correttamente
4. **Aggiornare la documentazione** con le modifiche apportate
5. **Pianificare un processo di revisione periodica** della struttura del database
