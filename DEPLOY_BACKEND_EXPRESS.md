# Come Deployare il Server Express in Produzione

## Cos'è un Server Express?

Nel progetto Cafasso AI Academy, utilizziamo un server Node.js con Express (`server-express.mjs`) che ha diverse funzioni:

1. Fornisce le API backend (autenticazione, gestione dati, ecc.)
2. Si connette al database MongoDB
3. Gestisce i file caricati (nella directory `uploads/`)
4. Serve i file statici

Attualmente, questo server viene eseguito localmente sulla macchina di sviluppo, ma in un ambiente di produzione dovrà essere ospitato su un servizio cloud.

## Opzioni di Deploy per il Server Express

### 1. Render.com

[Render](https://render.com/) è una piattaforma cloud moderna che semplifica il deployment di applicazioni web:

**Vantaggi**:
- Facile da configurare con GitHub
- Piano gratuito disponibile per test
- Supporto nativo per Node.js e Express
- Offre persistenza dei dati (per i file caricati)
- SSL gratuito

**Configurazione**:
1. Registrati su Render.com
2. Crea un nuovo "Web Service"
3. Collega il repository GitHub
4. Configura come:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server-express.mjs`

### 2. Heroku

[Heroku](https://www.heroku.com/) è una piattaforma consolidata per hosting di applicazioni:

**Vantaggi**:
- Ottimo per applicazioni Node.js
- Scalabilità automatica
- Add-ons per funzionalità aggiuntive
- Facile integrazione con CI/CD

**Configurazione**:
1. Crea un file `Procfile` nella radice del progetto:
   ```
   web: node server-express.mjs
   ```
2. Installa Heroku CLI
3. Esegui:
   ```
   heroku login
   heroku create cafasso-academy-backend
   git push heroku main
   ```

### 3. DigitalOcean App Platform

[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform/) è una soluzione PaaS semplice:

**Vantaggi**:
- Prezzi prevedibili
- Buona performance
- Facile da scalare
- Supporta storage persistente

**Configurazione**:
1. Crea un account DigitalOcean
2. Crea una nuova App
3. Collega il repository
4. Configura come servizio Node.js

### 4. AWS Elastic Beanstalk

Per progetti più grandi o aziendali, [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/) offre maggiore controllo:

**Vantaggi**:
- Altamente personalizzabile
- Integrazione con altri servizi AWS
- Ottimo per applicazioni enterprise
- Scalabilità avanzata

**Configurazione**:
1. Crea un file `package.json` con lo script `start`
2. Installa AWS CLI ed EB CLI
3. Esegui:
   ```
   eb init
   eb create cafasso-academy-env
   eb deploy
   ```

## Cosa significa "Server Express su servizio cloud"?

Quando parliamo di deployare il server Express su un "servizio cloud", intendiamo:

1. **Caricamento del codice**: Il codice del server (`server-express.mjs` e file correlati) viene caricato su uno dei servizi cloud menzionati sopra.

2. **Esecuzione continua**: Il servizio cloud mantiene il server in esecuzione 24/7, a differenza dello sviluppo locale dove il server viene avviato/arrestato manualmente.

3. **Indirizzo pubblico**: Il server ottiene un URL pubblico (es. `https://cafasso-api.onrender.com`) accessibile da qualsiasi dispositivo connesso a Internet.

4. **Scalabilità**: I servizi cloud possono aumentare automaticamente le risorse in base al traffico.

5. **Persistenza**: Il server rimane attivo anche quando il computer di sviluppo è spento.

## Attuali configurazioni per sviluppo vs. produzione

### Sviluppo (situazione attuale):
- Server Express in esecuzione sulla macchina locale
- MongoDB in esecuzione localmente o su Atlas
- Frontend React in esecuzione sul server di sviluppo Vite
- File memorizzati nella directory locale `uploads/`

### Produzione (configurazione proposta):
- Server Express in esecuzione su Render, Heroku o altro servizio cloud
- MongoDB Atlas come database 
- Frontend React su Netlify o servizio simile
- File memorizzati su AWS S3 o servizio simile

## Modifiche necessarie per il deploy in produzione

1. **Variabili d'ambiente**:
   ```javascript
   const PORT = process.env.PORT || 3000;
   const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cafasso_academy";
   ```

2. **CORS per il frontend**:
   ```javascript
   const corsOptions = {
     origin: process.env.FRONTEND_URL || "http://localhost:5173",
     credentials: true
   };
   app.use(cors(corsOptions));
   ```

3. **Configurazione per i file**:
   - In sviluppo: directory `uploads/` locale
   - In produzione: AWS S3 o servizio simile
