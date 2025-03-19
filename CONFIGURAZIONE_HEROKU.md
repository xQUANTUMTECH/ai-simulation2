# Configurazione di Heroku per Cafasso AI Academy

## Configurazione OAuth per Heroku

Quando configuri un'applicazione su Heroku e ti viene chiesto di inserire un "OAuth callback URL", stai configurando l'URL a cui Heroku reindirizza dopo che un utente si è autenticato tramite OAuth. 

### Cos'è l'OAuth callback URL?

L'OAuth callback URL è l'endpoint a cui Heroku reindirizza dopo che un utente concede l'autorizzazione all'app. In questo contesto, non si tratta dell'autenticazione degli utenti della tua applicazione, ma dell'autorizzazione tra Heroku e la tua applicazione o altri servizi.

### Quale URL inserire?

Per la nostra applicazione Cafasso AI Academy:

1. **Per lo sviluppo locale**:
   ```
   http://localhost:3000/auth/heroku/callback
   ```

2. **Per il frontend in produzione** (quando sarà deployato su Netlify):
   ```
   https://cafasso-academy.netlify.app/auth/heroku/callback
   ```

3. **Se non utilizzi OAuth nella tua applicazione**:
   Se non stai implementando un login tramite Heroku nella tua applicazione, puoi inserire l'URL di base della tua applicazione:
   ```
   https://cafasso-academy.netlify.app
   ```
   o
   ```
   https://cafasso1.herokuapp.com
   ```

### Quando è necessario l'OAuth callback URL?

L'OAuth callback URL è necessario quando:

1. Stai utilizzando Heroku come provider di identità OAuth per la tua applicazione
2. Stai collegando Heroku ad altri servizi che utilizzano OAuth
3. Stai utilizzando add-on Heroku che richiedono autorizzazioni OAuth

### Nel nostro caso specifico

Poiché stiamo utilizzando Heroku solo per ospitare il nostro server Express e non abbiamo implementato l'autenticazione tramite Heroku OAuth, puoi inserire l'URL di base della tua applicazione o del backend:

```
https://cafasso1.herokuapp.com
```

Se in futuro vorrai implementare un flusso di autenticazione che utilizza Heroku come provider, dovrai aggiornare questo URL con l'endpoint specifico che gestisce il callback OAuth nella tua applicazione.

## Passaggi per il deployment su Heroku

1. **Crea un account Heroku**
   - Accedi o registrati su heroku.com

2. **Installa Heroku CLI**
   ```
   npm install -g heroku
   ```

3. **Login da CLI**
   ```
   heroku login
   ```

4. **Crea una nuova app Heroku**
   ```
   heroku create cafasso1
   ```

5. **Configura le variabili d'ambiente**
   ```
   heroku config:set MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/cafasso_academy
   heroku config:set JWT_SECRET=il_tuo_secret_sicuro
   heroku config:set NODE_ENV=production
   ```

6. **Prepara l'app per il deployment**
   - Crea un file `Procfile` nella radice del progetto con il contenuto:
     ```
     web: node server-express.mjs
     ```
   - Assicurati che nel `package.json` sia specificato il motore Node.js:
     ```json
     "engines": {
       "node": "16.x"
     }
     ```

7. **Effettua il deployment**
   ```
   git add .
   git commit -m "Preparazione per deploy su Heroku"
   git push heroku main
   ```
   
8. **Verifica il deployment**
   ```
   heroku open
   ```

## Domande frequenti

### D: Ho bisogno di un token di autorizzazione?

**R:** Il token di autorizzazione mostrato nel dashboard Heroku (`HRKU-8b13837d-f28d-4cff-ad28-6d5db484e0f5`) è usato per autorizzare le richieste API a Heroku. Non è necessario per l'applicazione stessa, ma solo se vuoi interagire con le API di Heroku programmaticamente.

### D: Come posso verificare i log dell'applicazione?

**R:** Usa il comando:
```
heroku logs --tail
```

### D: Come posso riavviare l'applicazione?

**R:** Usa il comando:
```
heroku restart
