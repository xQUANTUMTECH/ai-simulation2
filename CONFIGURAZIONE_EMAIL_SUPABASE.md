# Configurazione del Servizio Email di Supabase

## Problema
Le email di conferma dell'account di Supabase non vengono recapitate agli utenti. Questo è un problema comune perché Supabase, per impostazione predefinita, non ha un servizio email configurato correttamente nei progetti nuovi.

## Opzioni di Configurazione

### Opzione 1: Disabilitare la Conferma Email (Soluzione Rapida)

Se sei in fase di sviluppo o test e non hai bisogno della verifica email:

1. Accedi alla dashboard di Supabase: [https://app.supabase.io/](https://app.supabase.io/)
2. Seleziona il progetto `twusehwykpemphqtxlrx`
3. Nel menu laterale, seleziona **Autenticazione** > **Impostazioni**
4. Nella sezione **Email**, disattiva l'opzione **Conferma Email**
5. Salva le modifiche

**Nota**: Gli utenti che abbiamo creato via API (`studente@cafasso.edu` e `direttore@cafasso.edu`) sono già stati configurati con email confermata (`email_confirm: true`), quindi possono accedere senza problemi.

### Opzione 2: Configurare un Provider SMTP (Soluzione Consigliata per Produzione)

Per un ambiente di produzione, è consigliabile configurare un provider SMTP:

1. Accedi alla dashboard di Supabase
2. Vai su **Autenticazione** > **Impostazioni Email**
3. Nella sezione **SMTP Settings**, attiva l'opzione
4. Configura i seguenti campi con un provider SMTP come Sendgrid, Mailgun, o simili:
   - **Host**: (es. `smtp.sendgrid.net`)
   - **Port**: (es. `587`)
   - **Username**: (il tuo username SMTP)
   - **Password**: (la tua password SMTP)
   - **Email mittente**: (es. `noreply@cafasso.edu`)
5. Salva le impostazioni

### Opzione 3: Utilizzare Resend con Supabase (Alternativa Moderna)

[Resend](https://resend.com) è una moderna piattaforma di email API supportata da Supabase:

1. Crea un account su [Resend](https://resend.com)
2. Verifica il tuo dominio o utilizza un dominio fornito da Resend
3. Ottieni la tua API key
4. Nella dashboard di Supabase, vai su **Autenticazione** > **Impostazioni Email**
5. Seleziona **Resend** come provider
6. Inserisci la tua API key
7. Configura l'indirizzo email mittente

## Personalizzazione dei Template Email

Puoi anche personalizzare i template delle email di conferma:

1. Nella dashboard di Supabase, vai su **Autenticazione** > **Templates**
2. Seleziona il tipo di template che vuoi modificare (es. **Conferma Registrazione**)
3. Personalizza il soggetto e il contenuto dell'email
4. Puoi utilizzare variabili come `{{ .ConfirmationURL }}` nei template

## Test delle Email

Dopo aver configurato il servizio email:

1. Crea un nuovo utente tramite la dashboard di Supabase o tramite l'applicazione
2. Verifica che l'email di conferma venga inviata
3. Controlla anche le cartelle spam/junk del destinatario

## Risoluzione Problemi

Se le email continuano a non essere recapitate:

1. Verifica che le credenziali SMTP siano corrette
2. Controlla i log nella dashboard di Supabase sotto **Logs**
3. Se usi un provider come Sendgrid o Mailgun, verifica i loro dashboard per eventuali errori di invio
4. Assicurati che il dominio del mittente sia correttamente configurato (SPF, DKIM, DMARC)

## Note per gli Utenti Già Creati

Gli utenti che abbiamo creato utilizzando il token di servizio (`studente@cafasso.edu` e `direttore@cafasso.edu`) sono stati configurati con `email_confirm: true`, quindi non richiedono la conferma dell'email. Questi utenti possono accedere direttamente all'applicazione.
