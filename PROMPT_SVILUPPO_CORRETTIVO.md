# PROMPT PER SVILUPPO CORRETTIVO CAFASSO AI ACADEMY

Sto lavorando su un progetto complesso chiamato "Cafasso AI Academy", una piattaforma e-learning che integra servizi AI per fornire esperienze didattiche interattive. Il progetto è funzionante ma presenta diversi problemi critici che necessitano di correzione immediata.

## Documentazione disponibile nella repository

Ho creato diversi file di documentazione che troverai nella root del progetto:

1. `ANALISI_COMPLETA_SISTEMA.md` - Documento principale con indice navigabile che contiene l'analisi completa
2. `REPORT_PROBLEMI_CRITICI.md` - Riassunto dei problemi principali organizzati per area
3. `ANALISI_DETTAGLIATA_AUTENTICAZIONE_DATI.md` - Focus sui problemi di autenticazione e dati
4. `PIANO_AZIONE_IMMEDIATO.md` - Piano d'azione giorno per giorno con task specifici
5. `TASK_COMPLETATE.md` - Elenco delle attività già completate
6. `TASK_SOSTITUZIONE_OPENROUTER.md` - Task completata sulla sostituzione di OpenRouter
7. `TASK_SOSTITUZIONE_TTS.md` - Task completata sulla sostituzione del servizio TTS

Questi documenti sono collegati tra loro: il file principale `ANALISI_COMPLETA_SISTEMA.md` contiene l'indice generale e i link alle sezioni dettagliate. Da lì puoi navigare alle specifiche analisi nei file correlati. Il `PIANO_AZIONE_IMMEDIATO.md` traduce l'analisi in task specifiche con priorità e tempistiche.

## Architettura del sistema

- **Frontend**: React/TypeScript con Vite 
- **Backend**: Node.js/Express
- **Database**: MongoDB (locale o Atlas)
- **Servizi AI**: OpenRouter con DeepSeek e Gemini
- **Autenticazione**: JWT

Il sistema comprende diversi moduli: autenticazione utenti, gestione corsi, dashboard admin, simulazioni interattive, generazione quiz con AI, TTS per audio, e integrazione webhook.

## Problemi critici da risolvere

Ho completato un'analisi approfondita e ho identificato i seguenti problemi critici:

### 1. Problemi di autenticazione e ruoli (PRIORITÀ ALTA)
- Gli utenti admin vengono autenticati ma reindirizzati all'interfaccia utente normale anziché alla dashboard admin
- Il middleware `authenticateToken` in `server/api-auth.js` non gestisce correttamente errori JWT
- La verifica del ruolo admin non funziona correttamente
- Il routing condizionale in `src/App.tsx` non indirizza correttamente in base al ruolo

### 2. Problemi di persistenza dati (PRIORITÀ ALTA)
- Gli scenari e le chat AI creati dagli utenti non vengono salvati correttamente
- La connessione MongoDB in `server-express.mjs` non gestisce disconnessioni e riconnessioni
- Le operazioni CRUD hanno gestione errori insufficiente e mancano retry automatici
- Non c'è feedback all'utente durante il salvataggio/caricamento dei dati

### 3. Problemi UI (PRIORITÀ MEDIA)
- I pulsanti "Annulla" nei modali non chiudono correttamente le finestre
- L'integrazione webhook con TTS non funziona correttamente
- Alcuni componenti UI presentano problemi di performance

### 4. Problemi integrazione AI (PRIORITÀ MEDIA)
- L'integrazione con DeepSeek e Gemini è stata implementata ma non completamente testata
- Mancano fallback robusti in caso di errore dei servizi AI

## Primi file da esaminare

Ecco i primi file da esaminare per iniziare il lavoro:

1. `server/api-auth.js` - Contiene il middleware di autenticazione da correggere
2. `src/App.tsx` - Contiene il routing condizionale da migliorare
3. `server-express.mjs` - Contiene la connessione MongoDB da rendere più robusta
4. `server/database/mongodb.js` - Contiene le operazioni database da migliorare
5. `server/api-scenarios.js` - Problemi con il salvataggio degli scenari
6. `server/api-ai.js` - Integrazione servizi AI da migliorare

## Primi interventi da effettuare

Dovresti iniziare con le seguenti modifiche:

1. **Correggere il middleware authenticateToken**:
   - Implementare gestione errori JWT completa
   - Verificare l'utente nel database ad ogni richiesta autenticata
   - Garantire che il ruolo utente sia incluso nel token e nel req.user

2. **Correggere il routing frontend**:
   - Implementare un controllo più robusto del ruolo utente
   - Verificare che la verifica `user?.role === 'ADMIN'` funzioni correttamente
   - Aggiungere redirect automatico alla dashboard corretta

3. **Migliorare la connessione MongoDB**:
   - Implementare gestione eventi disconnessione/riconnessione
   - Aggiungere retry automatici con backoff esponenziale
   - Migliorare logging per problemi di connessione

4. **Implementare pattern repository**:
   - Creare layer di astrazione per operazioni CRUD
   - Centralizzare gestione errori e retry
   - Implementare transazioni per operazioni correlate

## Come utilizzare la documentazione

Per iniziare il lavoro di correzione:

1. Leggi prima `ANALISI_COMPLETA_SISTEMA.md` per avere una visione d'insieme
2. Consulta `REPORT_PROBLEMI_CRITICI.md` per capire i problemi principali e le priorità
3. Per problemi specifici di autenticazione e persistenza dati, approfondisci con `ANALISI_DETTAGLIATA_AUTENTICAZIONE_DATI.md`
4. Segui il piano d'azione in `PIANO_AZIONE_IMMEDIATO.md` per implementare le soluzioni in ordine
5. Verifica le task già completate in `TASK_COMPLETATE.md` per non duplicare lavoro già fatto

La struttura della documentazione è progettata per facilitare sia la comprensione generale che l'implementazione pratica delle soluzioni. Ogni file di analisi rimanda a file specifici del codice con indicazioni precise su cosa modificare.

## Approccio metodologico consigliato

1. Inizia con i problemi di autenticazione e persistenza dati (priorità ALTA)
2. Procedi con un approccio incrementale: implementa una soluzione, testa, passa alla successiva
3. Usa il pattern repository per migliorare l'accesso al database
4. Aggiungi logging dettagliato per facilitare la diagnosi dei problemi
5. Implementa test unitari e di integrazione per verificare le correzioni

## Sistema di avvio e test

Per testare le modifiche implementate, puoi utilizzare:

- `.\avvia-sistema-completo.bat` - Avvia tutti i servizi incluso MongoDB locale
- `.\avvia-con-atlas.bat` - Avvia il sistema con MongoDB Atlas (cloud)
- `.\test-ai-semplice.cjs` - Test rapido dei servizi AI
- `.\test-integrazione-completo.cjs` - Test completo di integrazione

Consulta `ISTRUZIONI_AVVIO_SISTEMA.md` per maggiori dettagli sui comandi disponibili e sulle procedure di avvio.

## Sistema di tracking delle attività

Per mantenere traccia del progresso e dei problemi riscontrati, segui questa procedura:

1. **Aggiornamento TASK_IN_CORSO.md**:
   - Crea un file `TASK_IN_CORSO.md` se non esiste
   - All'inizio di una nuova task, aggiungila con stato "IN CORSO"
   - Quando completi una task, aggiorna lo stato a "COMPLETATA"
   - Se incontri problemi, aggiorna lo stato a "BLOCCATA" con descrizione del problema

2. **Formato consigliato**:
   ```
   # TASK IN CORSO E TRACKING PROBLEMI

   ## Task: Correzione middleware authenticateToken
   - **Stato**: COMPLETATA
   - **File modificati**: server/api-auth.js
   - **Data**: 2025-03-17
   - **Note**: Implementata verifica utente DB e gestione errori JWT

   ## Task: Miglioramento connessione MongoDB
   - **Stato**: IN CORSO
   - **File**: server-express.mjs
   - **Problemi riscontrati**: N/A

   ## Task: Correzione salvataggio scenari
   - **Stato**: BLOCCATA
   - **Problema**: Errore in transazione MongoDB
   - **Dettagli**: Problema con la versione del driver che non supporta transazioni
   ```

3. **Aggiornamento TASK_COMPLETATE.md**:
   - Al termine di una serie di task correlate, aggiorna questo file
   - Descrivi in dettaglio le modifiche apportate e i risultati dei test
   - Includi esempi di codice chiave se utili alla comprensione

4. **Segnalazione problemi bloccanti**:
   - Crea un file `PROBLEMI_BLOCCANTI.md` per documentare problemi che richiedono attenzione particolare
   - Descrivi in dettaglio il problema, i test effettuati e possibili soluzioni

Questo sistema permette di tenere traccia dello stato di avanzamento, documentare i problemi riscontrati e facilitare la collaborazione tra diversi sviluppatori.

Ti chiedo di iniziare ad analizzare i file indicati e proporre implementazioni concrete per risolvere i problemi identificati, partendo dalle priorità ALTA. Fammi sapere se hai bisogno di chiarimenti su specifici aspetti del codice o dell'architettura.
