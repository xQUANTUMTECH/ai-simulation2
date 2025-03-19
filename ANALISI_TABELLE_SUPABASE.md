# Analisi delle Tabelle Supabase

Dopo aver analizzato i file di migrazione disponibili in Supabase, ho identificato numerose tabelle che dovrebbero essere incluse nel nuovo database SQLite. Il progetto ha un'architettura database complessa con oltre 30 tabelle diverse suddivise in diverse aree funzionali.

## Tabelle Identificate nei File di Migrazione

### Auth e Utenti
- `users` - Tabella principale utenti
- `auth_sessions` - Sessioni di autenticazione
- `failed_login_attempts` - Tentativi di login falliti
- `user_settings` - Impostazioni utente
- `user_roles` - Ruoli assegnati agli utenti
- `profiles` - Profili estesi degli utenti

### Contenuti Educativi
- `documents` - Documenti formativi 
- `academy_videos` - Video didattici
- `courses` - Corsi disponibili nella piattaforma
- `course_modules` - Moduli di corso
- `module_lessons` - Lezioni all'interno dei moduli
- `scenarios` - Scenari di simulazione
- `quizzes` - Quiz formativi
- `quiz_questions` - Domande dei quiz
- `certificates` - Modelli di certificati
- `user_certificates` - Certificati ottenuti dagli utenti

### Progresso e Attività
- `progress` - Progresso utente nei contenuti
- `quiz_attempts` - Tentativi di completamento quiz
- `quiz_results` - Risultati dettagliati dei quiz
- `activities` - Registro attività utente
- `activity_reads` - Tracciamento lettura attività
- `system_alerts` - Avvisi di sistema

### AI e Simulazione
- `ai_agents` - Agenti AI per simulazioni
- `avatars` - Avatar utilizzabili nelle simulazioni
- `simulations` - Sessioni di simulazione
- `ai_conversations` - Conversazioni con agenti AI
- `ai_messages` - Messaggi nelle conversazioni AI

### Relazioni e Integrazioni
- `document_scenarios` - Collegamenti tra documenti e scenari
- `document_avatars` - Collegamenti tra documenti e avatar

### Storage
- `storage_files` - File archiviati
- `storage_buckets` - Bucket di storage

## Relazioni e Dipendenze

Il database presenta numerose relazioni tra le tabelle:

1. `users` è la tabella centrale a cui sono collegate la maggior parte delle altre tabelle
2. I contenuti educativi (`documents`, `courses`, `videos`) sono collegati alle tabelle di progresso
3. Le simulazioni collegano utenti, scenari e agenti AI

## Dati Iniziali Necessari

Per un corretto funzionamento, il database richiede:

1. Almeno un utente amministratore
2. Bucket di storage configurati 
3. Categorie e tipi per i contenuti educativi

## Raccomandazioni per SQLite

Quando si crea lo schema SQLite equivalente:

1. Mantenere tutte le relazioni tramite chiavi esterne
2. Utilizzare indici per migliorare le performance sulle query frequenti
3. Adattare i tipi di dati PostgreSQL ai tipi SQLite (ad es. JSONB → TEXT)
4. Implementare controlli di integrità usando i trigger SQLite

## Piano di Migrazione Dati

1. Creare prima le tabelle senza vincoli di chiave esterna
2. Importare i dati nell'ordine corretto rispettando le dipendenze
3. Aggiungere i vincoli di chiave esterna dopo l'importazione
4. Verificare l'integrità dei dati importati

Ora che abbiamo identificato tutte le tabelle rilevanti, possiamo procedere con l'aggiornamento dello schema del database SQLite per includere tutte queste tabelle e le loro relazioni.
