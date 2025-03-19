# Configurazione Email per Supabase

## Stato Attuale
Attualmente l'applicazione è configurata per funzionare con la registrazione e login utenti, ma l'invio di email di conferma necessita di un'ulteriore configurazione nel progetto Supabase.

## Requisiti per le Email
Per configurare l'invio di email nel tuo progetto Supabase, è necessario che il progetto sia già deployato sulla piattaforma Supabase (non in locale). La configurazione dell'invio email può essere effettuata in due modi:

### 1. Attraverso la Dashboard di Supabase
1. Accedi alla [dashboard di Supabase](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Vai su "Authentication" → "Email Templates"
4. Qui puoi configurare:
   - Il provider di email (SMTP)
   - Le varie email templates (Conferma, Reset password, ecc.)
   - I domini consentiti

### 2. Attraverso la CLI di Supabase
Per configurare via CLI, devi essere autenticato e avere collegato il progetto:

```bash
# Autenticarsi con Supabase CLI
npx supabase login

# Collegare il progetto
npx supabase link --project-ref=twusehwykpemphqtxlrx

# Visualizzare le configurazioni email attuali
npx supabase config get auth.smtp --project-ref=twusehwykpemphqtxlrx
```

## Opzioni di Provider Email

### 1. SMTP Personalizzato
Puoi configurare un server SMTP come Gmail, SendGrid, MailGun, ecc. Avrai bisogno di:
- Host SMTP
- Porta
- Username
- Password
- Metodo di sicurezza (TLS/SSL)

### 2. Servizio Email di Supabase
Supabase offre un servizio email integrato per progetti a pagamento. Questo servizio è pre-configurato e facile da usare.

## Impostazioni per i Test Locali

Per lo sviluppo locale, puoi:

1. **Disabilitare temporaneamente la conferma email**:
   Nella dashboard di Supabase, vai su Authentication → Settings e disattiva "Enable email confirmations"

2. **Usare l'API Supabase per generare link di conferma**:
   ```typescript
   // Questo può essere fatto solo con chiavi admin/service_role
   const { data, error } = await supabase.auth.admin.generateLink({
     type: 'signup',
     email: 'user@example.com'
   })
   ```

3. **Configurare un server SMTP di test**: 
   Servizi come [Mailtrap](https://mailtrap.io) permettono di catturare le email in un ambiente di testing

## Aggiornamenti Necessari nell'Applicazione

L'applicazione è già predisposta per gestire la conferma email. Il processo attuale è:

1. L'utente si registra
2. Viene mostrato un messaggio che indica di verificare la propria email
3. L'utente deve cliccare sul link nell'email per confermare l'account
4. Dopo la conferma, può effettuare il login

## Note per il Deployment
Una volta che il progetto sarà deployato, assicurati di:

1. Configurare correttamente il provider di email
2. Personalizzare i template delle email per riflettere il branding dell'applicazione
3. Testare il flusso completo di registrazione e conferma
4. Configurare correttamente gli URL di redirect contenuti nelle email

Con queste impostazioni, il sistema di registrazione e login funzionerà completamente, incluse le email di conferma account e recupero password.
