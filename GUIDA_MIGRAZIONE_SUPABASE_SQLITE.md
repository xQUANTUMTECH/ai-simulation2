# Guida alla Migrazione da Supabase a SQLite

## Introduzione

Questo documento fornisce istruzioni dettagliate su come migrare l'applicazione Cafasso AI Academy da Supabase a SQLite. La migrazione consente di eseguire l'applicazione completamente in locale, senza dipendenza da servizi cloud esterni, semplificando lo sviluppo e la distribuzione.

## Vantaggi della Migrazione

1. **Sviluppo semplificato**: Nessuna necessità di connessione a Supabase durante lo sviluppo
2. **Nessuna configurazione complessa**: Eliminazione delle policy RLS e altre configurazioni complesse
3. **Performance migliorate**: Accesso diretto ai dati senza latenza di rete
4. **Backup semplificati**: Un singolo file per tutto il database
5. **Funzionamento offline**: L'applicazione può funzionare completamente offline
6. **Risoluzione dei problemi di sincronizzazione**: Eliminazione dei problemi di sincronizzazione tra locale e remoto

## Passaggi per la Migrazione

### 1. Installazione delle Dipendenze

```bash
npm install sqlite3 uuid fs path --save
```

### 2. Inizializzazione del Database SQLite

Eseguire lo script `initialize-complete-database.bat` per creare il database SQLite con tutte le tabelle e i dati di esempio:

```bash
.\initialize-complete-database.bat
```

### 3. Integrazione dell'Adattatore SQLite

La soluzione di migrazione include un adattatore SQLite che implementa l'API di Supabase. Per utilizzarlo, basta sostituire gli import di Supabase con l'adattatore SQLite.

#### Esempio di Modifica di un File:

**Prima (con Supabase):**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Esempio di query
async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Errore:', error);
    return [];
  }
  
  return data;
}

// Esempio di upload file
async function uploadDocument(file, userId) {
  const filename = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(`${userId}/${filename}`, file);
  
  if (error) {
    console.error('Errore upload:', error);
    return null;
  }
  
  return data;
}
```

**Dopo (con SQLite):**

```javascript
import { supabase } from '../services/sqlite-adapter.js';

// Esempio di query (sintassi identica)
async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Errore:', error);
    return [];
  }
  
  return data;
}

// Esempio di upload file (sintassi identica)
async function uploadDocument(file, userId) {
  const filename = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(`${userId}/${filename}`, file);
  
  if (error) {
    console.error('Errore upload:', error);
    return null;
  }
  
  return data;
}
```

### 4. File da Modificare

I seguenti file dell'applicazione utilizzano Supabase e devono essere modificati per utilizzare l'adattatore SQLite:

1. `src/services/auth-service.ts` - Servizio di autenticazione
2. `src/services/document-service.ts` - Servizio documenti
3. `src/services/course-service.ts` - Servizio corsi
4. `src/components/FileUpload.tsx` - Componente di upload file
5. `src/components/VideoUploader.tsx` - Componente di upload video

### 5. Esempio di Modifica di `document-service.ts`

**Prima:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const getDocuments = async (userId) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};

export const uploadDocument = async (file, userId) => {
  // Upload file
  const { data: fileData, error: fileError } = await supabase.storage
    .from('documents')
    .upload(`${userId}/${file.name}`, file);
  
  if (fileError) throw fileError;
  
  // Insert record
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      user_id: userId,
      title: file.name,
      content: fileData.path,
      document_type: 'upload'
    }]);
  
  if (error) throw error;
  return data[0];
};
```

**Dopo:**

```typescript
import { supabase } from '../services/sqlite-adapter.js';

export const getDocuments = async (userId) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
};

export const uploadDocument = async (file, userId) => {
  // Upload file
  const { data: fileData, error: fileError } = await supabase.storage
    .from('documents')
    .upload(`${userId}/${file.name}`, file);
  
  if (fileError) throw fileError;
  
  // Insert record
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      user_id: userId,
      title: file.name,
      content: fileData.path,
      document_type: 'upload'
    }]);
  
  if (error) throw error;
  return data[0];
};
```

### 6. Storage dei File

Il nuovo adattatore SQLite simula anche il sistema di storage di Supabase. I file vengono memorizzati nella cartella `storage` nella directory principale del progetto, organizzati in sottocartelle per ogni bucket.

L'API è identica a quella di Supabase:

```javascript
// Upload di un file
const { data, error } = await supabase.storage
  .from('documents')
  .upload('path/to/file.pdf', fileContent);

// Download di un file
const { data, error } = await supabase.storage
  .from('documents')
  .download('path/to/file.pdf');

// URL pubblico di un file
const { publicURL } = supabase.storage
  .from('images')
  .getPublicUrl('path/to/image.jpg');
```

## Considerazioni sulla Sicurezza

Poiché SQLite non ha un sistema di autenticazione integrato come Supabase, l'autenticazione viene simulata nel livello applicativo. Tuttavia, in un ambiente di produzione, dovresti considerare:

1. La crittografia del file database SQLite
2. L'implementazione di un sistema di autenticazione più robusto
3. Il backup regolare del file database

## Conclusione

La migrazione da Supabase a SQLite semplifica notevolmente lo sviluppo e il deployment dell'applicazione Cafasso AI Academy. Con l'adattatore SQLite, puoi mantenere la stessa sintassi e funzionalità di Supabase, ma con i vantaggi di un database locale.

Per assistenza o problemi, contatta il team di sviluppo.
