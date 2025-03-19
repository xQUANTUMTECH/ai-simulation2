# Preparazione al Deploy - Cafasso AI Academy

Questo documento contiene la checklist per preparare il sistema completo (frontend + backend) per il deploy in produzione, con tutte le funzionalità attive incluse le nuove implementazioni AI.

## 1. Verifica delle funzionalità essenziali

Prima del deploy, è necessario verificare che tutte le funzionalità essenziali siano operative:

- [x] Sostituzione di OpenRouter con DeepSeek R1 Zero come modello predefinito
- [x] Configurazione di Gemini Pro come modello secondario/fallback
- [x] Implementazione del nuovo servizio TTS basato su libreria 'say'
- [x] Test completo dei componenti AI (eseguito con test-ai-semplice.cjs)
- [ ] Test di integrazione completo (eseguire test-integrazione-completo.cjs)
- [ ] Verifica funzionamento frontend con backend MongoDB

## 2. Configurazione delle variabili d'ambiente

### 2.1 Frontend (.env)

```
# API Base URL (da modificare in produzione)
VITE_API_BASE_URL=https://YOUR_PRODUCTION_DOMAIN/api

# AI API Keys
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
VITE_GROQ_API_KEY=xxxxxxxxxxxx

# Configurazione app
VITE_APP_MODE=production
```

### 2.2 Backend (.env)

```
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=cafasso_academy

# API Keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
GROQ_API_KEY=xxxxxxxxxxxx
OPENROUTER_API_URL=https://openrouter.ai/api/v1

# Email (config produzione)
EMAIL_HOST=smtp.provider.com
EMAIL_PORT=587
EMAIL_USER=no-reply@yourdomain.com
EMAIL_PASSWORD=xxxxxxxxxxxx

# Security
JWT_SECRET=your-secure-jwt-secret-for-production
```

## 3. Setup di MongoDB in produzione

Esistono due opzioni principali:

### 3.1 MongoDB Atlas (consigliato)

1. Assicurarsi che il database MongoDB Atlas sia configurato correttamente
2. Verificare la presenza di tutti i necessari indici per ottimizzare le query
3. Assicurarsi che gli indirizzi IP del server di produzione siano nella whitelist

### 3.2 MongoDB self-hosted

1. Configurare il server MongoDB con autenticazione adeguata
2. Impostare il backup automatico
3. Configurare replica set per alta disponibilità

## 4. Deployment Backend

### 4.1 Deploy su Heroku

1. Assicurarsi che il Procfile sia aggiornato:
   ```
   web: node server-express.mjs
   ```

2. Configurare tutte le variabili d'ambiente nella dashboard Heroku

3. Comandi per il deploy:
   ```
   heroku login
   git push heroku master
   ```

### 4.2 Deploy su altro servizio cloud (alternativa)

1. Preparare Dockerfile (già presente) o docker-compose.yml (se necessario)
2. Utilizzare i comandi specifici del provider per il deploy

## 5. Deployment Frontend

### 5.1 Deploy su Netlify

1. Verificare la configurazione in netlify.toml:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. Impostare le variabili d'ambiente in Netlify:
   - VITE_API_BASE_URL con l'URL del backend
   - VITE_OPENROUTER_API_KEY
   - VITE_GROQ_API_KEY

3. Comandi per il deploy (utilizzando Netlify CLI):
   ```
   netlify deploy --prod
   ```

## 6. Test di integrazione post-deploy

Dopo il deploy, eseguire i seguenti test:

1. Test di autenticazione (login/registrazione)
2. Test di generazione contenuti AI con tutti i modelli
3. Test del servizio TTS
4. Test di upload/download media
5. Test di generazione e visualizzazione report

## 7. Monitoraggio e logging

Configurare sistemi di monitoraggio e logging:

1. Impostare log rotazione per i file di log
2. Configurare monitoraggio degli errori (es. Sentry)
3. Monitorare l'uso delle API esterne (OpenRouter, etc.)
4. Impostare allarmi per problemi critici

## 8. Piano di manutenzione

1. Pianificare backup regolari del database
2. Stabilire una procedura per gli aggiornamenti del sistema
3. Documentare le procedure di rollback in caso di problemi
4. Pianificare verifiche periodiche delle API esterne

## 9. Ottimizzazioni per produzione

1. Implementare cache lato server per le risposte AI frequenti
2. Configurare rate limiting per le API
3. Ottimizzare il bundle frontend (code splitting, lazy loading)
4. Implementare compressione gzip/brotli per il server Express

## 10. Documentazione finale

- [x] Aggiornamento del file TASK_COMPLETATE.md con tutte le modifiche fatte
- [ ] Aggiornamento del manuale utente con le nuove funzionalità
- [ ] Documentazione tecnica per futuri sviluppatori

---

## Comando di test finale

Prima del deploy definitivo, eseguire il seguente comando per verificare l'intero sistema:

```
node test-integrazione-completo.cjs
```

Questo test verificherà tutti i componenti principali del sistema, inclusi MongoDB, autenticazione, servizi AI e gestione media.
