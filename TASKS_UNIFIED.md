# Piano di Attività Cafasso AI Academy - Documento Unificato

Questo documento rappresenta l'unificazione di tutti i file di task presenti nel progetto (TASKS.md, ADMIN_TASKS.md, DETAILED_TASKS.md, ISSUES_E_TODO.md) per fornire una visione completa dello stato del progetto, delle attività completate e di quelle ancora da fare.

## Indice
1. [Task completati](#task-completati)
2. [Task da implementare](#task-da-implementare)
3. [File da revisionare con funzionalità AI](#file-da-revisionare-con-funzionalità-ai)
4. [Bug specifici](#bug-specifici)
5. [Attività dettagliate tecniche](#attività-dettagliate-tecniche)
6. [Attività amministrazione sistema](#attività-amministrazione-sistema)
7. [Piano di completamento](#piano-di-completamento)
8. [Note sul deploy](#note-sul-deploy)
9. [Documentazione di riferimento](#documentazione-di-riferimento)

---

## Task completati

### Autenticazione e UI
- [x] Implementato pulsante di logout nell'header (btn rosso e anche nel menu dropdown)
- [x] Implementato FileUpload component robusto con gestione errori e retry
- [x] Aggiunto modal analisi documento con intelligenza artificiale
- [x] Connessione a OpenRouter tramite API Key e servizio centralizzato
- [x] Migliorato il flusso di upload documenti con UI feedback e gestione errori
- [x] Corretto bug nella generazione di avatar e scenari
- [x] Rimosso pulsante "Tour Guidato" dalla homepage
- [x] Configurato Token PAT Supabase per l'accesso all'API Management

### Funzionalità di Simulazione
- [x] Risolto problema Web Flow non funzionante
  - Ristrutturato web-simulation-service.ts con gestione errori avanzata
  - Implementati meccanismi di fallback e logging dettagliato
- [x] Risolto problema "Generazione di scenari via chat non crea nulla"
  - Migliorato sistema di generazione scenario nell'AI Service
  - Implementato fallback che restituisce sempre uno scenario valido
- [x] Risolto problema pulsante "Annulla" nella scelta del tipo di simulazione
- [x] Risolto problema eco del proprio audio invece di AI
  - Creato sistema di coda TTS per gestire comunicazioni vocali in ordine
- [x] Risolto flusso di upload documenti e generazione scenario/avatar
- [x] Implementata visualizzazione profilo avatar in WebView
- [x] Implementati strumenti funzionanti nella WebView
- [x] Risolti problemi con il TTS nella web view
- [x] Implementata interazione con avatar tramite chat AI
  - Aggiunte funzionalità di rinomina e eliminazione degli avatar
  - Implementata gestione avatar nei database con aggiornamenti in tempo reale
  - Migliorata integrazione con il sistema di sintesi vocale

### API e integrazioni
- [x] Collegamento ai servizi OpenRouter per AI generativa
- [x] Integrazione con Supabase per autenticazione
- [x] Sistema di API Key centralizzato per sicurezza
- [x] Sistema di retry e gestione errori per API call

### Backend e Database
- [x] Correzione riferimento tabella users nelle policy - Completato 14/03/2025
- [x] Fix policy simulation (tabella users non esistente) - Completato 14/03/2025
- [x] Risoluzione errore migrazione "green_portal" - Completato 14/03/2025

## Task da implementare

### Generali
- [ ] Completare internazionalizzazione (i18n) per supportare più lingue
- [ ] Migliorare la responsività su mobile
- [ ] Ottimizzare la navigazione fra dashboard e sezioni specifiche
- [ ] Implementare dark/light mode persistente
- [ ] Aggiungere animazioni di transizione più fluide
- [ ] Correggere errore "Si è verificato un problema con l'analisi AI" (fallback ai suggerimenti predefiniti)
- [ ] Implementare l'importazione automatica degli scenari selezionati nella sezione Scenari
- [ ] Modificare "Avatar" in "Chat" nel menu di navigazione
- [ ] Correggere la funzionalità di chat non funzionante nella sezione Interazioni
- [ ] Completare la migrazione del database applicando tutte le migrazioni SQL
- [ ] Assicurarsi che le funzionalità di formazione ERP siano funzionanti
- [ ] Verificare che gli scenari di formazione predefiniti esistano e siano accessibili

### Funzionalità di Academy e Corsi
- [ ] Gestione corsi limitata per gli utenti normali
  - Implementare permessi differenziati per utenti e admin
  - Aggiornare la UI di conseguenza
  - Aggiungere tabella permissions o campo is_admin nella tabella utenti
- [ ] Visualizzazione e download certificati incompleta
  - Implementare componente per visualizzare e scaricare certificati ottenuti
  - Aggiungere tabella user_certificates con relazioni ai corsi completati
- [x] Feedback quiz insufficiente
  - Completato con l'implementazione di una schermata di risultati dettagliati in QuizResults.tsx
  - Implementata visualizzazione intuitiva delle risposte corrette/errate con spiegazioni contestuali
  - Aggiunto sistema di generazione di suggerimenti di studio basati su risposte errate tramite quiz-ai-service.ts
  - Implementata integrazione diretta con quiz-ai-service per generare analisi AI personalizzate
  - Aggiunto meccanismo di fallback per garantire sempre un feedback anche in caso di errori di connessione
  - Implementato salvataggio automatico dell'analisi AI nel database per future consultazioni
  - Migliorata l'interfaccia utente con un design responsivo e schede informative intuitive
  - Implementata gestione degli stati di caricamento per garantire un'esperienza fluida all'utente

### Funzionalità di Simulazione
- [x] Interazione con avatar tramite chat AI
  - Implementate funzionalità avanzate di gestione avatar nel servizio ai-agent-service.ts:
    * Sviluppata funzione updateAgentName() per ridenominare gli avatar con aggiornamento in tempo reale
    * Creata funzione deleteAgent() con sicurezza integrata (soft delete via flag 'inactive' nel database)
    * Sviluppate funzioni di supporto getAllAgents() e getAgent() per semplificare l'accesso ai dati
  - Migliorata integrazione con il sistema di coda TTS:
    * Gestione automatica della cancellazione della registrazione vocale quando un avatar viene eliminato
    * Re-registrazione dell'avatar quando viene rinominato per garantire coerenza
    * Ottimizzazione della gestione delle priorità nelle code vocali
  - Implementato sistema di tracciamento delle modifiche nel database:
    * Timestamp automatici per aggiornamenti e cancellazioni
    * Mantenimento dello storico delle modifiche per audit
    * Sincronizzazione in tempo reale tra stato locale e database
- [ ] Statistiche nelle simulazioni non accurate
  - Rivedere il sistema di raccolta e visualizzazione statistiche

### API e integrazioni
- [x] Migliorare il sistema di gestione documenti con distinzione tra simulazione e formazione
  - Implementata distinzione tra documenti di simulazione (caricabili da utenti normali) e documenti di formazione (solo admin)
  - Aggiunto sistema di verifica del ruolo admin per proteggere le operazioni riservate
  - Migliorato il sistema di gestione bucket per lo storage con meccanismi di fallback automatici
  - Implementata logica di resilienza per l'upload dei documenti con retry automatici e gestione errori avanzata
- [ ] Completare integrazione con servizi AI di generazione voce
- [ ] Sistemare il problema di comunicazione con le API AI (possibile problema di CORS o endpoint disattivati)
- [ ] Verificare le configurazioni Supabase e il corretto funzionamento con PAT token

## File da revisionare con funzionalità AI

### Servizi AI principali
- [ ] **src/services/ai-service.ts** - Servizio principale per la comunicazione con OpenRouter
  - Verificare la gestione delle chiavi API
  - Controllare i meccanismi di retry e gestione errori
  - Testare le chiamate a OpenRouter

- [x] **src/services/ai-agent-service.ts** - Servizio per la gestione degli agenti AI
  - Implementate nuove funzioni per rinominare e eliminare gli agenti
  - Aggiunte funzioni di supporto per listare e ottenere gli agenti
  - Migliorata l'integrazione con il sistema TTS

- [x] **src/services/quiz-ai-service.ts** - Servizio per la generazione e valutazione di quiz con AI
  - Implementata integrazione con QuizResults per l'analisi AI
  - Migliorata generazione di suggerimenti personalizzati

- [ ] **src/services/tts-queue-service.ts** - Servizio per la gestione delle code di text-to-speech
  - Verificare la trasformazione del testo in audio
  - Controllare la gestione della coda di riproduzione
  
- [x] **src/services/document-service.ts** - Servizio per la gestione dei documenti
  - Implementata distinzione tra documenti di simulazione e di formazione
  - Migliorato il sistema di gestione bucket con meccanismi di fallback
  - Aggiunta verifica dei ruoli per proteggere le operazioni admin-only
  - Ottimizzata la gestione degli errori e il recupero automatico

### Componenti UI con AI
- [ ] **src/components/DocumentAnalysisModal.tsx** - Componente per l'analisi AI dei documenti
  - Verificare l'integrazione con ai-service
  - Correggere il problema di fallback ai suggerimenti predefiniti
  - Implementare l'importazione automatica degli scenari selezionati

- [ ] **src/components/simulation/WebRoom.tsx** - Componente per la simulazione interattiva
  - Verificare l'interazione con avatar AI
  - Correggere problemi con il TTS
  - Testare le interazioni attraverso chat

- [x] **src/components/quiz/QuizResults.tsx** - Componente per i risultati dei quiz
  - Implementata integrazione con quiz-ai-service per suggerimenti personalizzati
  - Aggiunta schermata di risultati dettagliati con visualizzazione domande/risposte
  - Implementata analisi AI delle aree di miglioramento

- [ ] **src/components/sections/Interactions.tsx** - Componente per le interazioni con avatar
  - Correggere la funzionalità di chat non funzionante
  - Implementare interazione con avatar tramite AI

### Altri servizi collegati
- [ ] **src/services/web-simulation-service.ts** - Servizio per la simulazione web
  - Verificare l'integrazione con i servizi AI
  - Controllare la gestione delle interazioni
  - Assicurarsi che il sistema di fallback funzioni correttamente

## Bug specifici
- [ ] Verificare il funzionamento dei quiz con OpenRouter AI (attualmente fallisce con suggerimenti predefiniti)
- [ ] Risolvere il bug dell'importazione degli scenari selezionati nella sezione Scenari
- [ ] Correggere le interazioni di chat con avatar (non funzionanti)
- [ ] Verificare tutte le chiamate a OpenRouter (possibile problema di rate limit o token)

## Attività dettagliate tecniche

### Implementazione Sistema Gestione API Key (Completata parzialmente)

- [✅] Servizio Centralizzato per API Key
  - [✅] Creazione classe ApiKeyService
  - [✅] Implementazione gestione cache
  - [✅] Supporto per rotazione chiavi
  - [✅] Supporto per chiavi di fallback
  - [✅] Logging utilizzo
  - [✅] Gestione scadenza e limiti
  - [✅] Compatibilità con Supabase
  - [ ] Supporto crittografia avanzata
  - [ ] Interfaccia amministrativa

- [✅] Standardizzazione Gestione Errori API
  - [✅] Creazione ApiErrorService 
  - [✅] Implementazione retry automatico con backoff esponenziale
  - [✅] Categorizzazione errori per tipo
  - [✅] Logging centralizzato
  - [✅] Supporto per errori Axios, Fetch e custom
  - [ ] Implementazione metriche per monitoraggio

- [ ] Migrazione Servizi Esistenti
  - [ ] Refactoring ai-service.ts per utilizzare ApiKeyService
  - [ ] Refactoring voice-service.ts per utilizzare ApiKeyService
  - [ ] Refactoring openai.ts per utilizzare ApiKeyService
  - [ ] Implementazione gestione errori standardizzata in tutti i servizi

### Ottimizzazione Componenti Simulazione

- [✅] Correzione bug WebRoom
  - [✅] Fix errore "Cannot read properties of undefined (reading 'speaking')"
  - [✅] Implementazione controlli null/undefined
  - [✅] Completamento UI sidebar
  - [ ] Test completo con vari scenari

- [ ] Miglioramento WebRTC
  - [ ] Gestione avanzata disconnessioni
  - [ ] Riconnessione automatica
  - [ ] Ottimizzazione bandwidth
  - [ ] Implementazione ICE fallback

- [ ] Audio Spaziale
  - [ ] Ottimizzazione per dispositivi mobili
  - [ ] Strategie di fallback
  - [ ] Miglioramento algoritmo posizionamento
  - [ ] Test con multiple connessioni simultanee

### Backend e Database

- [ ] Ottimizzazione Schema Supabase
  - [ ] Revisione e ottimizzazione relazioni
  - [ ] Aggiunta indici per query critiche
  - [ ] Completamento RLS policies
  - [ ] Benchmarking query comuni

- [ ] Miglioramento Supabase Migrations
  - [ ] Creazione tabelle per nuovi servizi (api_keys, api_key_usage_logs)
  - [ ] Aggiunta funzioni DB per statistiche
  - [ ] Script SQL per manutenzione

- [ ] Sistema Storage e CDN
  - [ ] Configurazione bucket e policy accessi
  - [ ] Implementazione pulizia automatica file temporanei
  - [ ] Strategie di backup
  - [ ] Ottimizzazione upload/download

### Frontend Improvements

- [ ] Gestione Stato
  - [ ] Implementazione Context API o Redux
  - [ ] Refactoring componenti per stato centralizzato
  - [ ] Persistenza stato critico

- [ ] Responsive Design
  - [ ] Test su diverse dimensioni di schermo
  - [ ] Implementazione breakpoint aggiuntivi
  - [ ] Supporto mobile completo

- [ ] Accessibilità
  - [ ] Aggiunta attributi ARIA
  - [ ] Testing screen reader
  - [ ] Supporto navigazione da tastiera

## Attività amministrazione sistema

### Autenticazione & Controllo Accessi

#### Attività Backend
- [x] Gestione Ruoli Admin
  - [x] Ruolo admin nella tabella users
  - [x] Policy RLS per accesso admin
  - [x] Livelli di permessi admin
  - [x] API assegnazione ruoli

- [x] Autenticazione Admin
  - [x] Flusso login admin
  - [x] Gestione sessioni
  - [x] Log attività (PRIORITÀ)
  - [ ] Whitelist IP

#### Attività Frontend
- [ ] Interfaccia Login Admin
  - [ ] Form login sicuro (PRIORITÀ)
  - [ ] Integrazione 2FA (PRIORITÀ)
  - [ ] Gestione timeout sessione
  - [ ] Opzione ricorda dispositivo

### Gestione Contenuti

#### Attività Backend
- [ ] API Gestione Corsi
  - [ ] Operazioni CRUD corsi (PRIORITÀ)
  - [ ] Gestione stato corsi (PRIORITÀ)
  - [ ] Tracciamento iscrizioni
  - [ ] Analytics corsi

- [ ] Gestione Video
  - [ ] Gestione upload video (PRIORITÀ)
  - [ ] Servizio transcodifica (PRIORITÀ)
  - [ ] Ottimizzazione storage
  - [ ] Analytics video

- [ ] Gestione Documenti
  - [x] Sistema upload documenti
  - [x] Controllo versioni
  - [x] Permessi accesso
  - [x] Indicizzazione documenti

#### Attività Frontend
- [ ] Dashboard Admin
  - [x] Statistiche overview (PRIORITÀ)
  - [x] Azioni rapide (PRIORITÀ)
  - [ ] Attività recenti
  - [ ] Alert sistema

- [ ] Interfaccia Gestione Corsi
  - [ ] Creatore/editor corsi
  - [ ] Organizzatore contenuti
  - [ ] Funzionalità anteprima
  - [ ] Workflow pubblicazione

- [ ] Gestore Media
  - [ ] Interfaccia upload video
  - [ ] Gestione documenti
  - [ ] Libreria media
  - [ ] Ricerca e filtri

### Integrazione AI

#### Attività Backend
- [ ] API Configurazione AI
  - [x] Impostazioni modelli (PRIORITÀ)
  - [x] Gestione training (PRIORITÀ)
  - [ ] Monitoraggio performance
  - [ ] Analytics utilizzo

- [ ] Strumenti Contenuti AI
  - [x] Generazione contenuti
  - [x] Generazione quiz
  - [x] Analisi feedback
  - [x] Ottimizzazione performance

#### Attività Frontend
- [ ] Interfaccia Gestione AI
  - [x] Configurazione modelli (PRIORITÀ)
  - [x] Interfaccia training (PRIORITÀ)
  - [ ] Metriche performance
  - [ ] Statistiche utilizzo

## Piano di completamento

### Sprint 1: Correzioni Critiche (1 settimana)
- [✅] Implementazione sistema gestione API key
- [✅] Risoluzione bug WebRoom
- [ ] Refactoring servizi principali per utilizzare il nuovo sistema

### Sprint 2: Ottimizzazioni Core (2 settimane)
- [ ] Completamento sistema WebRTC
- [ ] Ottimizzazione audio spaziale
- [ ] Miglioramento database

### Sprint 3: Miglioramenti UX (1 settimana)
- [ ] Implementazione gestione stato
- [ ] Ottimizzazione responsive
- [ ] Miglioramento accessibilità

### Sprint 4: Finalizzazione (1 settimana)
- [ ] Testing completo
- [ ] Documentazione
- [ ] Deployment produzione

## Note sul Deploy

- Sito online: [https://extraordinary-strudel-696753.netlify.app](https://extraordinary-strudel-696753.netlify.app)
- Utenti di test creati e confermati:
  - Studente: `studente@cafasso.edu` / `Cafasso2025!`
  - Direttore: `direttore@cafasso.edu` / `CafassoAdmin2025!`

## Documentazione di riferimento

### Architettura e Struttura
- `ARCHITECTURE.md` / `ARCHITETTURA.md` - Descrizione dell'architettura generale del sistema
- `PROJECT_STRUCTURE.md` - Struttura dettagliata del progetto e organizzazione dei file
- `ANALYSIS.md` - Analisi delle funzionalità e dei requisiti
- `API_KEYS_AND_DEPENDENCIES.md` - Documentazione delle API keys e dipendenze

### Configurazione Supabase
- `SUPABASE_CREDENTIALS.md` - Credenziali e token di accesso Supabase
- `README_CONFIGURAZIONE_SUPABASE.md` - Guida alla configurazione di Supabase
- `CONFIGURAZIONE_CLI_SUPABASE.md` - Istruzioni per configurare il CLI di Supabase
- `CONFIGURAZIONE_CORS_SUPABASE.md` - Configurazione CORS per Supabase
- `CONFIGURAZIONE_EMAIL_SUPABASE.md` - Setup del servizio email con Supabase
- `SUPABASE_EMAIL_SETUP.md` - Configurazione dettagliata email
- `SUPABASE_RLS_FIXES.md` - Correzioni alle policy RLS
- `SUPABASE_SETUP_COMPLETED.md` - Checklist configurazione completata
- `SUPABASE_MIGRATION_REPORT.md` - Report sulle migrazioni database

### Deployment
- `DEPLOY_NETLIFY.md` - Istruzioni per il deploy su Netlify
- `NETLIFY_SETUP_INSTRUCTIONS.md` - Guida alla configurazione di Netlify
- `NETFLY_DOCS.MD` - Documentazione aggiuntiva Netlify
- `DEPLOYMENT_REPORT.md` - Report sul deployment
- `PASSAGGI_ESEGUITI.md` - Log dei passaggi di deployment eseguiti

### Manuali e Guide
- `MANUALE_CAFASSO_AI_ACADEMY.md` - Manuale utente completo del sistema
