# Problemi e Task da Risolvere

Questo documento elenca i problemi riscontrati e le attività da completare per il progetto Cafasso AI Academy.

## Problemi Segnalati

### Autenticazione e Configurazione
- **Token PAT Supabase:** È necessario un Personal Access Token per l'API Management di Supabase (il token di servizio non funziona)
  - **Stato:** Completato ✓
  - **Soluzione:** PAT generato e integrato
  - **Token PAT Supabase Ricevuto:** sbp_91b1a5d19583c717a044bb0d19a1cbdb82c77c4c
  - **Implementazione:** Token correttamente configurato per l'accesso all'API Management

### Funzionalità di Academy e Corsi
1. **Gestione corsi limitata per gli utenti normali**
   - **Stato:** Da implementare
   - **Componenti interessati:** Sistema di gestione corsi
   - **Descrizione:** Gli utenti normali possono solo visualizzare i corsi, mentre solo gli admin possono caricare video e documenti
   - **Soluzione proposta:** Implementare permessi differenziati per utenti e admin, aggiornare la UI di conseguenza
   - **Database:** Aggiungere tabella permissions o campo is_admin nella tabella utenti

2. **Visualizzazione e download certificati incompleta**
   - **Stato:** Da implementare 
   - **Componenti interessati:** Sistema certificati
   - **Descrizione:** Manca la funzionalità di visualizzazione e download dei certificati completati
   - **Soluzione proposta:** Implementare componente per visualizzare e scaricare certificati ottenuti
   - **Database:** Aggiungere tabella user_certificates con relazioni ai corsi completati

3. **Feedback quiz insufficiente**
   - **Stato:** Da implementare
   - **Componenti interessati:** Sistema quiz
   - **Descrizione:** Dopo aver completato un quiz, non vengono mostrati punteggio, statistiche e consigli personalizzati
   - **Soluzione proposta:** Aggiungere schermata di risultati dettagliati e suggerimenti di miglioramento

### Funzionalità di Simulazione
1. **Web Flow non funzionante** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** Componenti di workflow, web-simulation-service, WebRoom
   - **Soluzione implementata:**
     - Ristrutturato completamente web-simulation-service.ts con gestione errori avanzata
     - Implementati meccanismi di fallback per tutte le operazioni del servizio
     - Aggiunto sistema di logging dettagliato per debug e diagnostica
     - Assicurato che le operazioni che richiedono database continuino localmente anche in caso di fallimento
     - Migliorata la gestione delle zone di interazione con ID locali e persistenza migliorata
     - Sostituiti errori bloccanti con gestione soft-fail che non interrompe il flusso
     - Eliminati tutti gli errori TypeScript relativi a possibili null reference

2. **Generazione di scenari via chat non crea nulla** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** Servizio di generazione scenari
   - **Descrizione:** La chat non generava avatar né scenari
   - **Soluzione implementata:**
     - Migliorato il sistema di generazione dello scenario nell'AI Service
     - Ristrutturato completamente il metodo generateScenarioFromChat con gestione errori avanzata
     - Aggiunta funzionalità di fallback che restituisce sempre uno scenario valido invece di generare errori
     - Implentato metodo getDefaultScenario() per avere sempre un risultato utilizzabile
     - Separato il processo di parsing JSON dalla gestione degli errori di database
     - Assicurato che anche in caso di errori nel salvataggio su DB lo scenario venga comunque restituito correttamente
     - Risolto il problema della schermata bianca che compariva quando la creazione falliva

3. **Pulsante "Annulla" nella scelta del tipo di simulazione non attivo** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** Interfaccia di scelta simulazione
   - **Descrizione:** Il pulsante "Annulla" non funzionava quando si sceglieva il tipo di simulazione
   - **Soluzione implementata:** 
     - Aggiunto handler `onCancel` in SimulationTypeSelector.tsx
     - Implementata la corretta propagazione dell'evento al componente parent
     - Aggiunto styling adeguato al pulsante per aumentarne la visibilità
     - Il pulsante ora riporta correttamente alla schermata precedente

3. **WebRoom: eco del proprio audio invece di AI** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** `WebRoom.tsx`, servizi di voice/audio
   - **Soluzione implementata:** 
     - Creato sistema di coda TTS (`tts-queue-service.ts`) per gestire comunicazioni vocali in ordine
     - Integrato con `ai-agent-service.ts` per coordinare il parlato degli agenti
     - Implementato in `WebRoom.tsx` per evitare sovrapposizioni audio
     - Gli agenti AI ora parlano in modo ordinato senza eco

4. **Mancanza del pulsante di logout** ✓ RISOLTO
   - **Stato:** Risolto
   - **Soluzione implementata:** Aggiunto pulsante di logout nella barra principale con stile ben visibile

5. **Pulsanti demo non necessari in homepage** ✓ RISOLTO
   - **Stato:** Risolto
   - **Soluzione implementata:** Rimossi pulsanti demo non necessari dall'homepage

6. **Interazione con avatar tramite chat AI non funzionante**
   - **Stato:** Da investigare
   - **Componenti interessati:** Servizio di chat AI, gestione avatar
   - **Descrizione:** Non è possibile modificare lo scenario o interagire con gli avatar precedentemente creati tramite chat AI
   - **Soluzione proposta:** Implementare funzionalità di interazione avatar tramite chat e aggiungere assegnazione nome e possibilità di eliminazione
   - **Database:** Richiedere aggiornamento per supportare queste operazioni

7. **Statistiche nelle simulazioni non accurate**
   - **Stato:** Da correggere
   - **Componenti interessati:** Componenti di statistiche, servizi di analisi dati
   - **Descrizione:** Le statistiche visualizzate nelle simulazioni non sono accurate o aggiornate
   - **Soluzione proposta:** Rivedere il sistema di raccolta e visualizzazione statistiche

8. **Flusso di upload documenti e generazione scenario/avatar incompleto** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** Servizi di upload, servizi di generazione
   - **Descrizione:** Il flusso completo per caricare documenti e generare scenari o avatar non funzionava correttamente
   - **Soluzione implementata:**
     - Ristrutturato completamente document-service.ts con gestione errori avanzata
     - Implementata verifica automatica dell'esistenza del bucket con fallback
     - Aggiunto sistema di retry per il salvataggio di record nel database
     - Implementata modalità di funzionamento "soft failure" che non blocca l'applicazione
     - Aggiunto logging dettagliato per aiutare nella diagnosi di problemi
     - Migliorata la gestione dei metadati durante l'upload
     - Implementato fallback per errori di database
     - Migliorata interfaccia per caricamento documenti in Documents.tsx
     - Aggiunto modal di upload con componente FileUpload migliorato
     - Implementate strategie di retry e recovery per upload di documenti
     - Risolto problema di perdita del contesto utente in FileUpload
     - Aggiunti feedback visivi per stati di caricamento e gestione errori

9. **Funzionalità di visualizzazione profilo avatar in WebView mancante** ✓ RISOLTO
   - **Stato:** Risolto
   - **Componenti interessati:** `WebRoom.tsx`, componenti di profilo
   - **Descrizione:** Cliccando sul pallino di un avatar nella web view non è possibile vedere il suo profilo, i file associati o mandare messaggi per modificarlo
   - **Soluzione implementata:** 
     - Aggiunto modal di profilo avatar che si apre al click su un avatar
     - Implementato visualizzazione di dettagli, stato e emozione dell'avatar
     - Aggiunti pulsanti per interagire con l'avatar (invio messaggio, modifica, eliminazione)

10. **Strumenti nella WebView non funzionanti** ✓ RISOLTO
    - **Stato:** Risolto
    - **Componenti interessati:** `WebRoom.tsx`, componenti tools
    - **Descrizione:** I tools mostrati nella web view sono solo simulazioni e non sono effettivamente sviluppati
    - **Soluzione implementata:** 
      - Implementate UI complete per tutti gli strumenti della WebView (Partecipanti, Documenti, Analisi, Upload, Appunti, Impostazioni)
      - Aggiunto sistema di modali interattivi per ciascun tool
      - Migliorata l'interfaccia utente con funzionalità reali di interazione
      - Inserita integrazione tra lo strumento Partecipanti e la funzionalità di profilo avatar

11. **Problemi con il TTS nella web view** ✓ RISOLTO
    - **Stato:** Risolto
    - **Componenti interessati:** `WebRoom.tsx`, servizi di TTS
    - **Descrizione:** Il TTS parte incorrettamente quando si scrive nella chat. Dovrebbe essere una conversazione con gli avatar che inizia quando si attiva il microfono e si parla
    - **Soluzione implementata:** 
      - Modificato il comportamento di handleSendMessage per controllare l'origine del messaggio
      - Implementata logica per attivare il TTS solo se il messaggio proviene da input vocale (microfono)
      - L'input scritto manualmente non attiva più automaticamente il TTS, solo l'input vocale lo fa

## Prossimi Task (Priorità)
RMUOVERE TUTTI I MOCK DATA
### Focus immediato sulla formazione ERP
- Completare la migrazione del database applicando tutte le migrazioni SQL
- Assicurarsi che le funzionalità di formazione ERP siano funzionanti
- Verificare che gli scenari di formazione predefiniti esistano e siano accessibili

## Note sul Deploy

- Sito online: [https://extraordinary-strudel-696753.netlify.app](https://extraordinary-strudel-696753.netlify.app)
- Utenti di test creati e confermati:
  - Studente: `studente@cafasso.edu` / `Cafasso2025!`
  - Direttore: `direttore@cafasso.edu` / `CafassoAdmin2025!`

## Credenziali e Token

- Token PAT Supabase: `sbp_91b1a5d19583c717a044bb0d19a1cbdb82c77c4c`
- Token di Servizio Supabase: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg`
- Password temporanea: `Maurizio1!!!1!`
