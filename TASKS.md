# Task completati e da fare

## Autenticazione e UI (Completati ✓)
- [x] Implementato pulsante di logout nell'header (btn rosso e anche nel menu dropdown)
- [x] Implementato FileUpload component robusto con gestione errori e retry
- [x] Aggiunto modal analisi documento con intelligenza artificiale
- [x] Connessione a OpenRouter tramite API Key e servizio centralizzato
- [x] Migliorato il flusso di upload documenti con UI feedback e gestione errori
- [x] Corretto bug nella generazione di avatar e scenari
- [x] Rimosso pulsante "Tour Guidato" dalla homepage
- [x] Configurato Token PAT Supabase per l'accesso all'API Management

## Funzionalità di Simulazione (Completati ✓)
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

## Da fare
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

## Funzionalità di Academy e Corsi (Da implementare)
- [ ] Gestione corsi limitata per gli utenti normali
  - Implementare permessi differenziati per utenti e admin
  - Aggiornare la UI di conseguenza
  - Aggiungere tabella permissions o campo is_admin nella tabella utenti
- [ ] Visualizzazione e download certificati incompleta
  - Implementare componente per visualizzare e scaricare certificati ottenuti
  - Aggiungere tabella user_certificates con relazioni ai corsi completati
- [ ] Feedback quiz insufficiente
  - Aggiungere schermata di risultati dettagliati e suggerimenti di miglioramento

## Funzionalità di Simulazione (Da implementare)
- [ ] Interazione con avatar tramite chat AI non funzionante
  - Implementare funzionalità di interazione avatar tramite chat
  - Aggiungere assegnazione nome e possibilità di eliminazione
  - Richiedere aggiornamento DB per supportare queste operazioni
- [ ] Statistiche nelle simulazioni non accurate
  - Rivedere il sistema di raccolta e visualizzazione statistiche

## API e integrazioni
- [x] Collegamento ai servizi OpenRouter per AI generativa
- [x] Integrazione con Supabase per autenticazione
- [x] Sistema di API Key centralizzato per sicurezza
- [x] Sistema di retry e gestione errori per API call
- [ ] Completare integrazione con servizi AI di generazione voce
- [ ] Sistemare il problema di comunicazione con le API AI (possibile problema di CORS o endpoint disattivati)
- [ ] Verificare le configurazioni Supabase e il corretto funzionamento con PAT token

## RISOLUZIONE PROBLEMI INTEGRAZIONE AI E FRONTEND
Problemi identificati nei collegamenti tra servizi AI backend e componenti frontend:

### Problemi Critici (Alta Priorità)
- [ ] **Mancata integrazione di aiAgentService in SimulationInterface**
  - SimulationInterface.tsx non importa aiAgentService per avatar intelligenti
  - Implementare interazione con agenti AI nelle simulazioni
  - Collegare eventi UI con il servizio di agenti AI

- [ ] **Chat con Avatar non funzionante**
  - Manca importazione e utilizzo di aiAgentService nella chat
  - Non esiste una gestione della cronologia delle conversazioni
  - Implementare modulo di chat con memoria di contesto e personalità dell'avatar

- [ ] **TTS non collegato ai componenti UI**
  - Servizi tts-service.ts e tts-queue-service.ts non utilizzati nell'interfaccia
  - Implementare integrazione vocale per avatar nelle simulazioni
  - Collegare output text-to-speech alle interazioni utente

- [ ] **webSimulationService senza integrazione AI**
  - Servizio gestisce stanze e partecipanti ma non usa aiAgentService
  - Aggiungere metodi per creare e gestire avatar AI intelligenti
  - Implementare eventi di interazione con risposte generate da AI

### Lista completa punti di integrazione AI mancanti

1. **SimulationInterface.tsx** 
   - Manca importazione di `aiAgentService` per avatar intelligenti
   - Manca importazione di `ttsService` per vocalizzazione
   - Implementare:
     ```typescript
     import { aiAgentService } from '../services/ai-agent-service';
     import { ttsService } from '../services/tts-service';
     ```
   - Aggiungere metodo per gestire le risposte degli avatar:
     ```typescript
     const handleAvatarResponse = async (message: string, avatarId: string) => {
       // Generare risposta AI tramite aiAgentService
       // Vocalizzare risposta tramite ttsService
     }
     ```

2. **Componente Chat** (mancante o incompleto)
   - Creare o completare componente di chat per interazione avatar
   - Integrare con aiAgentService per risposte intelligenti
   - Implementare memoria di contesto per conversazioni significative
   - Aggiungere metodi di sintesi vocale per l'output

3. **SimulationTypeSelector.tsx**
   - Aggiungere collegamento tra tipi di simulazione e capacità AI specifiche
   - Differenziare comportamenti AI basati sul tipo di simulazione selezionato
   - Implementare inizializzazione di avatar AI in base al tipo

4. **WebSimulationService**
   - Aggiungere metodi per creare avatar AI intelligenti:
     ```typescript
     async createAIAvatar(roomId: string, avatarData: any): Promise<string> {
       // Inizializzare avatar AI con aiAgentService
       // Collegare a stanza esistente
     }
     ```
   - Implementare gestione eventi di interazione con feedback AI

5. **Sections/Scenarios.tsx**
   - Verificare integrazione con scenarioService per modifica tramite AI
   - Aggiungere funzionalità di generazione scenari personalizzati
   - Implementare modifica di scenari esistenti con AI

6. **Sezione Interactions** (da completare)
   - Integrare chat intelligente per interazioni con avatar
   - Collegare con aiAgentService e ttsService
   - Implementare profili personalizzati e memoria delle conversazioni

## Bug specifici
- [ ] Verificare il funzionamento dei quiz con OpenRouter AI (attualmente fallisce con suggerimenti predefiniti)
- [ ] Risolvere il bug dell'importazione degli scenari selezionati nella sezione Scenari
- [ ] Correggere le interazioni di chat con avatar (non funzionanti)
- [ ] Verificare tutte le chiamate a OpenRouter (possibile problema di rate limit o token)

## File da revisionare con funzionalità AI

### Servizi AI principali
- [ ] **src/services/ai-service.ts** - Servizio principale per la comunicazione con OpenRouter
  - Verificare la gestione delle chiavi API
  - Controllare i meccanismi di retry e gestione errori
  - Testare le chiamate a OpenRouter

- [ ] **src/services/ai-agent-service.ts** - Servizio per la gestione degli agenti AI
  - Verificare l'integrazione con altri servizi AI
  - Controllare la gestione delle risposte degli agenti

- [ ] **src/services/quiz-ai-service.ts** - Servizio per la generazione e valutazione di quiz con AI
  - Verificare la generazione di quiz da documenti, video e corsi
  - Controllare la valutazione automatica delle risposte e i suggerimenti di studio

- [ ] **src/services/tts-queue-service.ts** - Servizio per la gestione delle code di text-to-speech
  - Verificare la trasformazione del testo in audio
  - Controllare la gestione della coda di riproduzione

### Componenti UI con AI
- [ ] **src/components/DocumentAnalysisModal.tsx** - Componente per l'analisi AI dei documenti
  - Verificare l'integrazione con ai-service
  - Correggere il problema di fallback ai suggerimenti predefiniti
  - Implementare l'importazione automatica degli scenari selezionati

- [ ] **src/components/simulation/WebRoom.tsx** - Componente per la simulazione interattiva
  - Verificare l'interazione con avatar AI
  - Correggere problemi con il TTS
  - Testare le interazioni attraverso chat

- [ ] **src/components/quiz/QuizResults.tsx** - Componente per i risultati dei quiz
  - Verificare l'integrazione con quiz-ai-service per i suggerimenti personalizzati
  - Implementare schermata di risultati dettagliati

- [ ] **src/components/sections/Interactions.tsx** - Componente per le interazioni con avatar
  - Correggere la funzionalità di chat non funzionante
  - Implementare interazione con avatar tramite AI

### Altri servizi collegati
- [ ] **src/services/web-simulation-service.ts** - Servizio per la simulazione web
  - Verificare l'integrazione con i servizi AI
  - Controllare la gestione delle interazioni
  - Assicurarsi che il sistema di fallback funzioni correttamente

## Note sul Deploy

- Sito online: [https://extraordinary-strudel-696753.netlify.app](https://extraordinary-strudel-696753.netlify.app)
- Utenti di test creati e confermati:
  - Studente: `studente@cafasso.edu` / `Cafasso2025!`
  - Direttore: `direttore@cafasso.edu` / `CafassoAdmin2025!`
