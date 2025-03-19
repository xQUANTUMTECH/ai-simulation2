# ANALISI COMPLETA DEL SISTEMA CAFASSO AI ACADEMY

## INDICE
1. [Introduzione e panoramica](#1-introduzione-e-panoramica)
2. [Architettura del sistema](#2-architettura-del-sistema)
3. [Analisi dei problemi critici](#3-analisi-dei-problemi-critici)
   - [3.1 Problemi di autenticazione e ruoli](#31-problemi-di-autenticazione-e-ruoli) ✓
   - [3.2 Problemi di persistenza dati](#32-problemi-di-persistenza-dati) ✓
   - [3.3 Problemi interfaccia utente](#33-problemi-interfaccia-utente) ✓
   - [3.4 Problemi servizi AI](#34-problemi-servizi-ai) ✓
   - [3.5 Workflow mancanti o incompleti](#35-workflow-mancanti-o-incompleti)
4. [Task per completare il progetto](#4-task-per-completare-il-progetto)
   - [4.1 Task critici prioritari](#41-task-critici-prioritari)
   - [4.2 Task secondari](#42-task-secondari)
   - [4.3 Task di ottimizzazione](#43-task-di-ottimizzazione)
5. [Piano d'azione dettagliato](#5-piano-dazione-dettagliato)
6. [Soluzioni tecniche dettagliate](#6-soluzioni-tecniche-dettagliate)
7. [Verifica e testing](#7-verifica-e-testing)
8. [Preparazione per il deploy](#8-preparazione-per-il-deploy)

---

## 1. INTRODUZIONE E PANORAMICA

Cafasso AI Academy è una piattaforma di e-learning avanzata che integra componenti di intelligenza artificiale per fornire esperienze di apprendimento personalizzate e interattive. Il sistema è composto da un frontend React, un backend Express con MongoDB per la persistenza dei dati, e servizi AI esterni.

**Stato attuale del progetto**:
- I principali problemi critici di autenticazione, persistenza dati e UI sono stati risolti ✓
- L'integrazione dei servizi AI è stata migliorata con implementazione di DeepSeek e Gemini ✓
- Il servizio TTS è stato ottimizzato con sistema di cache e feedback utente avanzato ✓
- Persistono problemi con integrazione webhook e completamento di alcune funzionalità di chat
- È necessario completare le funzionalità di simulazione interattiva

La presente analisi mira a fornire un quadro completo dei problemi esistenti e definire un piano d'azione chiaro per completare il progetto.

---

## 2. ARCHITETTURA DEL SISTEMA

### 2.1 Struttura generale

```
├── backend (server/)
│   ├── api.js - API principali
│   ├── api-auth.js - Gestione autenticazione ✓
│   ├── api-ai.js - Integrazione servizi AI ✓
│   ├── api-media.js - Gestione media
│   ├── api-scenarios.js - Gestione scenari ✓
│   └── database/mongodb.js - Accesso database ✓
├── frontend (src/)
│   ├── components/ - Componenti UI React
│   │   ├── admin/ - Pannello amministrazione 
│   │   ├── auth/ - Autenticazione
│   │   ├── sections/ - Sezioni principali app
│   │   ├── scenarios/ - Gestione scenari
│   │   ├── simulation/ - Simulazioni interattive
│   │   └── ...
│   ├── services/ - Servizi e API client
│   │   ├── auth-service.js - Gestione autenticazione ✓
│   │   ├── ai-service.ts - Servizi AI ✓
│   │   ├── media-service.ts - Gestione media
│   │   └── ...
│   ├── hooks/ - Custom React hooks
│   ├── pages/ - Componenti pagina
│   └── App.tsx - Componente principale e routing ✓
└── script di utilità e configurazione
```

### 2.2 Flussi di dati principali

1. **Autenticazione**: ✓
   - Login/registrazione utente → `api-auth.js` → JWT token → localStorage → `AuthContext` React
   - Richieste autenticate: JWT in header → `authenticateToken` middleware → `requireAdmin` per ruoli

2. **Interazione AI**: ✓
   - Frontend (`ai-service.ts`) → Backend (`api-ai.js`) → Servizi esterni (OpenRouter/DeepSeek) → Risposta AI → MongoDB (salvataggio)

3. **Gestione media**:
   - Upload media → `api-media.js` → MongoDB (metadata) → File system o storage cloud → Frontend (rendering)

4. **Scenari di simulazione**: ✓
   - Creazione scenari → `api-scenarios.js` → MongoDB → Frontend (rendering)
   - Interazione scenari → Eventi utente → AI → TTS → Feedback

5. **Text-to-Speech**: ✓
   - Richiesta TTS → Generazione audio → Caching intelligente → Streaming audio → Feedback utente

### 2.3 Strumenti e tecnologie

- **Frontend**: React, TypeScript, Vite
- **Backend**: Express.js, Node.js
- **Database**: MongoDB (locale o Atlas)
- **Autenticazione**: JWT
- **AI**: OpenRouter con DeepSeek, Gemini
- **Media**: File system locale, streaming
- **Deployment**: Netlify (frontend), Heroku (backend)

---

## 3. ANALISI DEI PROBLEMI CRITICI

### 3.1 Problemi di autenticazione e ruoli ✓

#### 3.1.1 Analisi autenticazione (RISOLTA)

Il sistema di autenticazione presentava diverse criticità che sono state risolte:

1. **Gestione errori JWT insufficiente**: ✓
   - File: `server/api-auth.js`
   - Soluzione: Implementata gestione robusta degli errori JWT con distinzione tra TokenExpiredError e JsonWebTokenError.
   - Dettaglio: Aggiunta verifica dell'utente nel database ad ogni richiesta autenticata.

2. **Problemi nel routing basato su ruoli**: ✓
   - File: `src/App.tsx`
   - Soluzione: Corretto routing condizionale per indirizzare gli utenti admin al pannello di amministrazione.
   - Dettaglio: Implementata verifica `user?.role === 'ADMIN'` robusta con controlli aggiuntivi.

3. **Controllo ruoli debole**: ✓
   - File: `server/api-auth.js`
   - Soluzione: Migliorato middleware `requireAdmin` con verifica database.
   - Dettaglio: Garantita trasmissione delle informazioni di ruolo nel token JWT.

4. **Formati inconsistenti delle API**: ✓
   - Soluzione: Standardizzate tutte le risposte API in formato JSON con struttura consistente.
   - Dettaglio: Implementata gestione errori coerente in tutti gli endpoint.

#### 3.1.2 Impatto delle soluzioni

- Gli amministratori ora accedono correttamente al pannello di amministrazione
- Le API protette restituiscono sempre risposte JSON strutturate
- L'applicazione dei ruoli è consistente attraverso l'intera applicazione

### 3.2 Problemi di persistenza dati ✓

#### 3.2.1 Analisi persistenza dati (RISOLTA)

I problemi di persistenza dati erano diffusi ma sono stati risolti:

1. **Connessione MongoDB non robusta**: ✓
   - File: `server-express.mjs` e `server/database/mongodb.js`
   - Soluzione: Implementato sistema di gestione disconnessioni e riconnessione automatica.
   - Dettaglio: Aggiunto meccanismo di backoff esponenziale e gestione eventi di connessione/disconnessione.

2. **Operazioni CRUD con gestione errori insufficiente**: ✓
   - File: Vari endpoint API in `server/api*.js`
   - Soluzione: Implementata funzione `withRetry` per operazioni database robuste.
   - Dettaglio: Aggiunti meccanismi di retry, transazioni per operazioni correlate, e validazione input completa.

3. **Scenari e chat non salvati**: ✓
   - File: `server/api-scenarios.js` e `server/api-ai.js`
   - Soluzione: Migliorate query database con validazione e gestione transazioni.
   - Dettaglio: Implementato sistema di persistenza robusto che previene la perdita di dati.

4. **Mancanza di feedback visivo sullo stato delle operazioni**: ✓
   - File: Vari componenti frontend
   - Soluzione: Implementati indicatori di stato per le operazioni.
   - Dettaglio: Aggiunti componenti per visualizzare "salvataggio in corso" e "salvato con successo".

#### 3.2.2 Impatto delle soluzioni

- Gli utenti non perdono più il proprio lavoro (scenari, chat, progressi)
- Lo stato visualizzato nel frontend è consistente con i dati nel database
- L'applicazione gestisce correttamente le disconnessioni temporanee dal database

### 3.3 Problemi interfaccia utente ✓

#### 3.3.1 Analisi interfaccia (RISOLTA)

L'interfaccia utente presentava diverse problematiche che sono state risolte:

1. **Pulsante "Annulla" non funzionante**: ✓
   - File: Vari componenti modali in `src/components/`
   - Soluzione: Corretta gestione eventi onClick e propagazione.
   - Dettaglio: Implementata chiusura tramite tasto Escape e migliorato blocco scroll.

2. **Componenti modali con problemi di accessibilità**: ✓
   - File: Componenti in `src/components/`
   - Soluzione: Implementati attributi ARIA e keyboard navigation.
   - Dettaglio: Migliorata l'accessibilità complessiva dell'interfaccia.

3. **UI non responsiva**: ✓
   - Soluzione: Ottimizzati componenti con problemi di performance.
   - Dettaglio: Implementata memoization e migliorato lifecycle management.

#### 3.3.2 Impatto delle soluzioni

- Tutte le finestre modali si chiudono correttamente con pulsanti, ESC o click esterno
- Migliore accessibilità completa dell'applicazione
- Performance dell'interfaccia utente ottimizzata

### 3.4 Problemi servizi AI ✓

#### 3.4.1 Analisi servizi AI (RISOLTA)

L'integrazione dei servizi AI è stata migliorata significativamente:

1. **Integrazione con DeepSeek e Gemini**: ✓
   - File: `server/api-ai.js` e `src/services/ai-service.ts`
   - Soluzione: Completata e testata l'integrazione con DeepSeek e Gemini.
   - Dettaglio: Verificato il funzionamento in vari scenari e con diversi tipi di utenti.

2. **Fallback robusti**: ✓
   - Soluzione: Implementate strategie di retry con backoff esponenziale.
   - Dettaglio: Aggiunti fallback automatici in caso di errore dei servizi esterni.

3. **Servizio TTS ottimizzato**: ✓
   - Soluzione: Implementato sistema di cache lato server e client per il TTS.
   - Dettaglio: Migliorata efficienza, ridotto utilizzo API e ottimizzata gestione audio.

4. **Tracciabilità migliorata**: ✓
   - Soluzione: Implementato logging dettagliato e monitoraggio utilizzo API.
   - Dettaglio: Aggiunti header custom per tracking e analisi delle performance.

#### 3.4.2 Impatto delle soluzioni

- Servizi AI molto più affidabili con interruzioni minime
- Migliorata diagnostica dei problemi grazie al logging avanzato
- Ottimizzato utilizzo delle API esterne tramite caching intelligente
- Migliorata esperienza utente con feedback visivo durante operazioni AI

### 3.5 Workflow mancanti o incompleti

#### 3.5.1 Webhook per integrazione esterna

1. **Workflow webhook per TTS incompleto**:
   - Problema: La funzionalità di webhooks per il servizio TTS non è completamente implementata.
   - Dettaglio: Manca l'integrazione completa tra la generazione audio e le chiamate a endpoint esterni.
   - File mancanti: Endpoint e gestori webhook dedicati in `api-ai.js` o file specifico per webhook.

2. **Sincronizzazione dati in tempo reale**:
   - Problema: Manca un meccanismo di sincronizzazione in tempo reale per lo stato dell'applicazione.
   - Dettaglio: Gli utenti non vedono aggiornamenti in tempo reale senza ricaricare la pagina.
   - File mancanti: Servizio di sincronizzazione dati basato su WebSocket o polling.

#### 3.5.2 Simulazioni interattive incomplete

1. **Integrazione incompleta con Avatar virtuale**:
   - Problema: Il sistema di avatar virtuale non è completamente funzionante.
   - Dettaglio: L'integrazione tra audio TTS e avatar animati è incompleta.
   - File coinvolti: `src/components/simulation/UnrealViewer.tsx` e servizi correlati.

2. **Sistema di voice recognition incompleto**:
   - Problema: Il riconoscimento vocale per le simulazioni interattive non è completamente implementato.
   - Dettaglio: Manca l'integrazione bidirezionale tra input vocale e risposte AI.
   - File coinvolti: `src/services/voice-service.ts` e componenti correlati.

#### 3.5.3 Gestione media avanzata mancante

1. **Sistema di transcoding video assente**:
   - Problema: Manca un sistema completo per il transcoding video a diverse risoluzioni.
   - Dettaglio: I video caricati non vengono automaticamente convertiti in formati e risoluzioni multiple.
   - File coinvolti: `src/services/video-transcoding-service.ts` (incompleto).

2. **Cache media intelligente mancante**:
   - Problema: Manca un sistema di cache intelligente per le risorse media.
   - Dettaglio: Le risorse media vengono sempre ricaricate completamente.
   - File mancanti: Servizio di cache media lato client.

---

## 4. TASK PER COMPLETARE IL PROGETTO

### 4.1 Task critici prioritari

#### 4.1.1 Correzione autenticazione e ruoli (PRIORITÀ: ALTA) ✓

1. **Migliorare middleware authenticateToken**: ✓
   - Aggiunta gestione errori JWT completa
   - Implementata verifica utente nel database
   - Garantita inclusione ruolo nel token JWT
   - **File modificati**: `server/api-auth.js`

2. **Correggere routing frontend basato su ruoli**: ✓
   - Implementato routing condizionale robusto
   - Corretta gestione stato utente e ruolo
   - **File modificati**: `src/App.tsx` e `src/services/auth-service.js`

3. **Standardizzare risposte API autenticazione**: ✓
   - Uniformato formato risposte JSON
   - Migliorata gestione errori
   - **File modificati**: Tutti gli endpoint API in `server/api-*.js`

#### 4.1.2 Correzione persistenza dati (PRIORITÀ: ALTA) ✓

1. **Implementare connessione MongoDB robusta**: ✓
   - Aggiunta gestione disconnessioni
   - Implementata riconnessione automatica
   - **File modificati**: `server-express.mjs` e `server/database/mongodb.js`

2. **Migliorare operazioni CRUD database**: ✓
   - Implementata funzione `withRetry` per operazioni robuste
   - Aggiunta gestione errori avanzata
   - **File modificati**: Tutti gli endpoint API con accesso DB

3. **Correggere salvataggio scenari e chat AI**: ✓
   - Implementate transazioni per operazioni correlate
   - Migliorata validazione dati
   - **File modificati**: `server/api-scenarios.js` e `server/api-ai.js`

4. **Implementare feedback operazioni**: ✓
   - Aggiunti indicatori stato operazioni
   - Migliorata gestione errori lato client
   - **File modificati**: Componenti React pertinenti

#### 4.1.3 Correzione UI (PRIORITÀ: MEDIA) ✓

1. **Sistemare pulsante "Annulla" nei modali**: ✓
   - Corretta gestione eventi
   - Uniformato comportamento modali
   - **File modificati**: Componenti modal in `src/components/`

2. **Ottimizzare performance UI**: ✓
   - Implementata memoization per componenti pesanti
   - Ottimizzato rendering liste e componenti ripetuti
   - **File modificati**: Componenti React con problemi di performance

3. **Migliorare accessibilità**: ✓
   - Implementati attributi ARIA
   - Migliorata keyboard navigation
   - **File modificati**: Componenti UI principali

### 4.2 Task secondari

#### 4.2.1 Miglioramento servizi AI (PRIORITÀ: MEDIA) ✓

1. **Ottimizzare servizio TTS**: ✓
   - Implementato sistema di cache intelligente
   - Migliorata gestione delle risorse audio
   - **File modificati**: `server/api-ai.js` e `src/services/api-client.js`

2. **Migliorare fallback servizi AI**: ✓
   - Implementate strategie di retry con backoff
   - Aggiunta cache per risposte comuni
   - **File modificati**: `server/api-ai.js` e `src/services/ai-service.ts`

3. **Migliorare tracciabilità servizi AI**: ✓
   - Implementato logging dettagliato
   - Aggiunto monitoraggio utilizzo API
   - **File modificati**: `server/api-ai.js`

#### 4.2.2 Completamento workflow mancanti (PRIORITÀ: MEDIA)

1. **Completare sistema webhook per TTS**:
   - Implementare endpoint webhook dedicati
   - Migliorare integrazione con servizi TTS
   - **File da creare/modificare**: Nuovo file `server/api-webhook.js`

2. **Implementare sincronizzazione dati real-time**:
   - Utilizzare WebSocket o polling efficiente
   - Aggiungere indicatori di stato nel frontend
   - **File da creare/modificare**: Nuovo sistema di sync

3. **Completare integ

### 4.2 Task secondari

#### 4.2.1 Miglioramento servizi AI (PRIORITÀ: MEDIA)

1. **Testare integrazione AI in tutti gli scenari**:
   - Verificare funzionamento con vari tipi di utenti e richieste
   - Implementare suite di test specifica
   - **File da creare/modificare**: Script di test AI

2. **Migliorare fallback servizi AI**:
   - Implementare strategie di retry con backoff
   - Aggiungere cache per risposte comuni
   - **File da modificare**: `server/api-ai.js` e `src/services/ai-service.ts`

3. **Migliorare tracciabilità servizi AI**:
   - Implementare logging dettagliato
   - Aggiungere monitoraggio utilizzo API
   - **File da modificare**: `server/api-ai.js`

#### 4.2.2 Completamento workflow mancanti (PRIORITÀ: MEDIA)

1. **Completare sistema webhook per TTS**:
   - Implementare endpoint webhook dedicati
   - Migliorare integrazione con servizi TTS
   - **File da creare/modificare**: Nuovo file `server/api-webhook.js`

2. **Implementare sincronizzazione dati real-time**:
   - Utilizzare WebSocket o polling efficiente
   - Aggiungere indicatori di stato nel frontend
   - **File da creare/modificare**: Nuovo sistema di sync

3. **Completare integrazione avatar virtuale**:
   - Migliorare sincronizzazione TTS con animazioni
   - Implementare gestione eventi avanzata
   - **File da modificare**: Componenti di simulazione

### 4.3 Task di ottimizzazione

#### 4.3.1 Ottimizzazioni performance (PRIORITÀ: BASSA)

1. **Ottimizzare API backend**:
   - Implementare caching per richieste frequenti
   - Migliorare query MongoDB
   - **File da modificare**: Vari file backend

2. **Ottimizzare bundle frontend**:
   - Implementare code splitting e lazy loading
   - Ottimizzare caricamento risorse
   - **File da modificare**: Configurazione build e routing

3. **Implementare compressione e ottimizzazione rete**:
   - Aggiungere compressione gzip/brotli
   - Ottimizzare dimensione risposte API
   - **File da modificare**: Configurazione server

#### 4.3.2 Monitoraggio e logging (PRIORITÀ: MEDIA)

1. **Implementare sistema logging completo**:
   - Aggiungere logging strutturato
   - Implementare rotazione log
   - **File da creare/modificare**: Nuovo sistema di logging

2. **Implementare monitoraggio errori**:
   - Aggiungere tracciamento errori frontend e backend
   - Implementare alerting per errori critici
   - **File da creare/modificare**: Nuovo sistema di monitoraggio

---

## 5. PIANO D'AZIONE DETTAGLIATO

### 5.1 Fase 1: Fix Critici (3-4 giorni)

#### Giorno 1-2: Autenticazione e Ruoli
1. Rifattorizzazione completa `server/api-auth.js`
2. Correzione routing in `src/App.tsx`
3. Standardizzazione risposte API
4. Testing completo flusso autenticazione

#### Giorno 3-4: Persistenza Dati
1. Implementazione repository pattern
2. Miglioramento connessione MongoDB
3. Correzione salvataggio scenari e chat AI
4. Implementazione feedback operazioni nel frontend

### 5.2 Fase 2: Miglioramenti Interfaccia e Workflow (2-3 giorni)

#### Giorno 5-6: Interfaccia Utente
1. Correzione pulsanti modali e comportamento UI
2. Fix integrazione webhook TTS
3. Ottimizzazione performance componenti critici

#### Giorno 7: Completamento Workflow
1. Implementazione webhook completi
2. Miglioramento simulazioni interattive
3. Testing end-to-end di tutte le funzionalità

### 5.3 Fase 3: Ottimizzazione e Preparazione Deploy (1-2 giorni)

#### Giorno 8-9: Ottimizzazione e Deploy
1. Implementazione ottimizzazioni performance
2. Configurazione monitoraggio e logging
3. Preparazione ambiente produzione
4. Deployment e testing finale

---

## 6. SOLUZIONI TECNICHE DETTAGLIATE

### 6.1 Soluzione autenticazione e ruoli

#### 6.1.1 Middleware authenticateToken migliorato

```javascript
// In server/api-auth.js
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifica che l'utente esista ancora nel DB
    const user = await req.app.locals.db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
    
    if (!user) {
      return res.status(403).json({ error: 'Utente non trovato' });
    }
    
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error('Errore autenticazione:', error);
    return res.status(403).json({ error: 'Token non valido o scaduto' });
  }
}
```

#### 6.1.2 Correzione routing React

```typescript
// In src/App.tsx
const isAdmin = user && user.role === 'ADMIN';

// Routing condizionale
<Routes>
  {isLoggedIn ? (
    <>
      {isAdmin ? (
        // Routes admin
        <Route path="/admin/*" element={<AdminLayout />} />
      ) : (
        // Routes utente normale
        <Route path="/dashboard/*" element={<UserLayout />} />
      )}
      <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />} />
    </>
  ) : (
    <Route path="*" element={<Navigate to="/login" replace />} />
  )}
</Routes>
```

### 6.2 Soluzione persistenza dati

#### 6.2.1 Connessione MongoDB robusta

```javascript
// In server-express.mjs
async function connectToMongoDB() {
  try {
    console.log("Tentativo di connessione a MongoDB...");
    const client = new MongoClient(MONGODB_URI, {
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10
    });
    
    await client.connect();
    console.log("✅ Connessione a MongoDB riuscita!");
    
    const db = client.db('cafasso_academy');
    
    // Gestione eventi di connessione
    client.on('close', () => {
      console.log('Connessione MongoDB chiusa');
      setTimeout(reconnect, 5000);
    });
    
    client.on('error', (error) => {
      console.error('Errore MongoDB:', error);
      setTimeout(reconnect, 5000);
    });
    
    async function reconnect() {
      console.log('Tentativo di riconnessione a MongoDB...');
      try {
        await client.connect();
        console.log('Riconnessione a MongoDB riuscita!');
      } catch (error) {
        console.error('Errore riconnessione MongoDB:', error);
        setTimeout(reconnect, 5000);
      }
    }
    
    return db;
  } catch (error) {
    console.error("❌ Errore di connessione MongoDB:", error);
    throw error;
  }
}
```

#### 6.2.2 Repository pattern

```javascript
// Nuovo file: server/repositories/user-repository.js
class UserRepository {
  constructor(db) {
    this.db = db;
    this.collection = 'users';
  }
  
  async findById(id) {
    try {
      return await this.db.collection(this.collection).findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error(`Errore in findById(${id}):`, error);
      throw new Error(`Errore nel recupero utente: ${error.message}`);
    }
  }
  
  async findByUsername(username) {
    try {
      return await this.db.collection(this.collection).findOne({ username });
    } catch (error) {
      console.error(`Errore in findByUsername(${username}):`, error);
      throw new Error(`Errore nel recupero utente: ${error.message}`);
    }
  }
  
  async updateUser(id, update) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.db.collection(this.collection).updateOne(
          { _id: new ObjectId(id) },
          { $set: update }
        );
        
        if (result.acknowledged) {
          return {
            success: true,
            modified: result.modifiedCount > 0,
            modifiedCount: result.modifiedCount
          };
        } else {
          throw new Error('Operazione non confermata dal database');
        }
      } catch (error) {
        console.error(`Tentativo ${attempt}/${maxRetries} fallito:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          // Attesa esponenziale tra i tentativi
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    throw new Error(`Tutti i tentativi falliti: ${lastError.message}`);
  }
  
  // Altri metodi CRUD...
}

module.exports = UserRepository;
```

### 6.3 Soluzione integrazione webhook TTS

```javascript
// Nuovo file: server/api-webhook.js
router.post('/api/webhooks/tts', async (req, res) => {
  try {
    // Validazione input
    const { text, targetUrl, callbackId } = req.body;
    
    if (!text || !targetUrl) {
      return res.status(400).json({ error: 'Parametri mancanti', required: ['text', 'targetUrl'] });
    }
    
    // Generazione TTS asincrona
    const ttsJob = {
      id: callbackId || uuidv4(),
      text,
      targetUrl,
      status: 'processing',
      createdAt: new Date()
    };
    
    // Salva job in MongoDB
    await db.collection('tts_jobs').insertOne(ttsJob);
    
    // Risposta immediata con job ID
    res.status(202).json({ 
      jobId: ttsJob.id, 
      status: 'processing',
      message: 'TTS job in elaborazione'
    });
    
    // Elaborazione asincrona
    processTtsJob(ttsJob).catch(error => {
      console.error(`Errore elaborazione TTS job ${ttsJob.id}:`, error);
      db.collection('tts_jobs').updateOne(
        { id: ttsJob.id },
        { $set: { status: 'error', error: error.message, updatedAt: new Date() } }
      );
    });
    
  } catch (error) {
    console.error('Errore webhook TTS:', error);
    res.status(500).json({ error: 'Errore interno server' });
  }
});

// Funzione asincrona per elaborazione
async function processTtsJob(job) {
  try {
    // Genera audio TTS
    const audioResult = await ttsService.generateAudio(job.text);
    
    // Aggiorna stato job
    await db.collection('tts_jobs').updateOne(
      { id: job.id },
      { $set: { 
        status: 'completed', 
        audioUrl: audioResult.url,
        duration: audioResult.duration,
        updatedAt: new Date() 
      }}
    );
    
    // Chiama webhook di callback
    await axios.post(job.targetUrl, {
      jobId: job.id,
      status: 'completed',
      text: job.text,
      audioUrl: audioResult.url,
      duration: audioResult.duration
    });
    
    console.log(`TTS job ${job.id} completato e callback inviato`);
    
  } catch (error) {
    console.error(`Errore in processTtsJob ${job.id}:`, error);
    
    // Notifica errore tramite webhook
    try {
      await axios.post(job.targetUrl, {
        jobId: job.id,
        status: 'error',
        error: error.message
      });
    } catch (callbackError) {
      console.error(`Errore nell'invio della notifica di errore:`, callbackError);
    }
    
    throw error;
  }
}
```

### 6.4 Soluzione problemi UI

```javascript
// Esempio di correzione per i pulsanti "Annulla" nei modali
// In un componente Modal.tsx
const Modal = ({ isOpen, onClose, title, children, ...props }) => {
  // Stato per gestire animazione di chiusura
  const [isClosing, setIsClosing] = useState(false);
  
  // Handler per chiusura sicura
  const handleClose = useCallback(() => {
    // Attiva animazione di chiusura
    setIsClosing(true);
    
    // Ritarda la chiusura effettiva per permettere l'animazione
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);
  
  // Stop propagazione click sul contenuto del modale
  const handleContentClick = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  // Gestione tasto ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleClose]);
  
  // Non renderizzare nulla se non è aperto
  if (!isOpen && !isClosing) return null;
  
  return (
    <div 
      className={`modal-overlay ${isClosing ? 'closing' : ''}`} 
      onClick={handleClose}
    >
      <div className="modal-content" onClick={handleContentClick}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button 
            className="button cancel-button"
            onClick={handleClose}
          >
            Annulla
          </button>
          {props.actionButton}
        </div>
      </div>
    </div>
  );
};
```

## 7. VERIFICA E TESTING

### 7.1 Piano di test completo

Per garantire la robustezza e affidabilità delle correzioni implementate, è necessario un piano di test completo che copra tutti gli aspetti del sistema.

#### 7.1.1 Test automatizzati per autenticazione e ruoli

```javascript
// test/auth.test.js
describe('Sistema autenticazione', () => {
  describe('Generazione token JWT', () => {
    it('dovrebbe generare un token valido con informazioni utente complete', async () => {
      // Test implementazione
    });
    
    it('dovrebbe includere il ruolo utente nel token', async () => {
      // Test implementazione
    });
  });
  
  describe('Middleware authenticateToken', () => {
    it('dovrebbe accettare token validi', async () => {
      // Test implementazione
    });
    
    it('dovrebbe rifiutare token scaduti', async () => {
      // Test implementazione
    });
    
    it('dovrebbe rifiutare token malformati', async () => {
      // Test implementazione
    });
    
    it('dovrebbe verificare che l\'utente esista nel DB', async () => {
      // Test implementazione
    });
  });
  
  describe('Routing basato su ruoli', () => {
    it('dovrebbe indirizzare admin al pannello admin', async () => {
      // Test implementazione
    });
    
    it('dovrebbe indirizzare utenti normali alla dashboard utente', async () => {
      // Test implementazione
    });
    
    it('dovrebbe redirigere utenti non autenticati al login', async () => {
      // Test implementazione
    });
  });
});
```

#### 7.1.2 Test dei servizi database

```javascript
// test/database.test.js
describe('Repository pattern', () => {
  describe('UserRepository', () => {
    it('dovrebbe recuperare utenti per ID', async () => {
      // Test implementazione
    });
    
    it('dovrebbe gestire errori MongoDB', async () => {
      // Test implementazione
    });
    
    it('dovrebbe ritentare operazioni fallite', async () => {
      // Test implementazione
    });
  });
  
  describe('Connessione MongoDB', () => {
    it('dovrebbe riconnettersi automaticamente dopo disconnessione', async () => {
      // Test implementazione
    });
    
    it('dovrebbe mantenere le operazioni in sospeso durante riconnessione', async () => {
      // Test implementazione
    });
  });
});
```

#### 7.1.3 Test AI e integrazione servizi

```javascript
// test/ai-integration.test.js
describe('Integrazione servizi AI', () => {
  describe('DeepSeek integrazione', () => {
    it('dovrebbe generare risposte valide', async () => {
      // Test implementazione
    });
    
    it('dovrebbe fallback a Gemini in caso di errore', async () => {
      // Test implementazione
    });
  });
  
  describe('Persistenza conversazioni', () => {
    it('dovrebbe salvare conversazioni nel database', async () => {
      // Test implementazione
    });
    
    it('dovrebbe recuperare conversazioni salvate', async () => {
      // Test implementazione
    });
  });
});
```

### 7.2 Testing end-to-end

Per verificare completamente il sistema, è importante implementare test end-to-end che simulino i flussi utente reali:

1. **Registrazione utente**:
   - Registrazione nuovo utente
   - Verifica email (se necessario)
   - Login con credenziali
   - Verifica routing alla dashboard utente

2. **Login amministratore**:
   - Login con credenziali admin
   - Verifica routing al pannello admin
   - Verifica accesso a funzionalità admin

3. **Flusso di lavoro scenario**:
   - Creazione nuovo scenario
   - Interazione con AI
   - Verifica salvataggio dati
   - Recupero scenario in sessione successiva

4. **Integrazione TTS**:
   - Generazione audio da testo
   - Verifica webhook di callback
   - Verifica integrazione con avatar

5. **Gestione errori**:
   - Test disconnessione database
   - Test errori API esterne
   - Verifica meccanismi di fallback

## 8. PREPARAZIONE PER IL DEPLOY

### 8.1 Requisiti per ambiente di produzione

Per preparare il sistema per il deployment in produzione, è necessario:

1. **Configurazione variabili d'ambiente**:
   - Creare template `.env.example` con tutte le variabili necessarie
   - Documentare tutte le variabili e il loro utilizzo
   - Implementare controllo variabili obbligatorie all'avvio

2. **Gestione segreti**:
   - Configurare credenziali database in modo sicuro
   - Proteggere API key servizi esterni
   - Configurare JWT secret sicuro

3. **Ottimizzazione risorse**:
   - Configurare pooling connessioni database
   - Implementare rate limiting per API
   - Configurare caching appropriato

4. **Monitoraggio e logging**:
   - Implementare logging strutturato
   - Configurare aggregazione log
   - Implementare sistema di alerting

### 8.2 Procedura di deploy

Procedura dettagliata per il deploy del sistema completo:

1. **Backend Express**:
   ```bash
   # Preparazione pacchetto
   npm run build
   
   # Deploy su Heroku
   git push heroku master
   
   # Configurazione variabili d'ambiente
   heroku config:set MONGODB_URI=mongodb+srv://...
   heroku config:set JWT_SECRET=...
   heroku config:set OPENROUTER_API_KEY=...
   ```

2. **Frontend React**:
   ```bash
   # Build per produzione
   npm run build
   
   # Deploy su Netlify
   netlify deploy --prod
   
   # Configurazione variabili d'ambiente
   netlify env:set VITE_API_BASE_URL=https://api.cafasso-academy.com
   ```

3. **Database MongoDB**:
   - Configurare database Atlas in produzione
   - Creare utente con privilegi appropriati
   - Configurare indici per query frequenti
   - Impostare backup automatico

4. **Verifica post-deploy**:
   - Eseguire smoke test su tutti i componenti
   - Verificare integrazione tra frontend e backend
   - Testare funzionalità critiche in produzione
