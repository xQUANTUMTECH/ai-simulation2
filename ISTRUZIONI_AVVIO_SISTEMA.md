# Istruzioni per l'avvio del sistema Cafasso AI Academy

## Problema risolto

Abbiamo risolto il problema che causava errori e crash quando si accedeva all'interfaccia admin e alle funzionalità di media. I problemi erano causati da:

1. **Incompatibilità tra Supabase e MongoDB**: L'applicazione stava tentando di utilizzare Supabase per l'autenticazione quando il sistema era stato migrato a MongoDB.

2. **Problemi con i riferimenti ai servizi**: I componenti admin utilizzavano ancora riferimenti a servizi Supabase invece dei nuovi servizi MongoDB.

3. **Problemi di autenticazione**: Non c'era un meccanismo adeguato per verificare e gestire le credenziali admin con MongoDB.

## Soluzioni implementate

1. **Nuovo sistema di autenticazione**: Abbiamo creato un nuovo servizio di autenticazione basato su JWT per MongoDB e relative API.

2. **Aggiornamento del server Express**: Abbiamo integrato le nuove API di autenticazione nel server Express principale, con protezione delle rotte admin.

3. **Aggiornamento dei componenti admin**: Abbiamo corretto i riferimenti nei componenti admin, sostituendo i servizi Supabase con i nuovi servizi MongoDB.

4. **Tool di amministrazione**: Abbiamo creato uno script che genera automaticamente un utente amministratore nel database MongoDB.

5. **Script di gestione del sistema**: Abbiamo creato una serie di script per facilitare l'avvio, il riavvio e la chiusura del sistema.

## Script disponibili

Abbiamo creato i seguenti script batch per semplificare la gestione del sistema:

1. **riavvia-tutto.bat** - Script principale raccomandato, esegue:
   - Chiusura di tutti i processi in esecuzione
   - Avvio di MongoDB
   - Creazione/verifica dell'utente amministratore
   - Avvio del server Express
   - Avvio del frontend React

2. **chiudi-tutto.bat** - Chiude tutti i processi relativi al sistema:
   - MongoDB
   - Node.js
   - npm

3. **avvia-mongodb-express.bat** - Avvia solo MongoDB e Express con opzione per creare l'utente admin.

## Istruzioni passo-passo

### Per un avvio completo del sistema:

1. Chiudi tutte le istanze esistenti del sistema (se ce ne sono)
2. Esegui **riavvia-tutto.bat**
3. Attendi che tutti i servizi vengano avviati
4. Accedi con le credenziali di amministratore:
   - Username: `admin`
   - Password: `Cafasso@admin2025!`
5. Ora potrai accedere al pannello amministrativo e alla gestione media senza problemi

### In caso di problemi:

1. Esegui **chiudi-tutto.bat** per assicurarti che tutti i processi siano terminati
2. Riavvia il sistema con **riavvia-tutto.bat**

## Credenziali amministratore

- **Username**: admin
- **Email**: admin@cafasso-academy.it
- **Password**: Cafasso@admin2025!

Le credenziali sono anche salvate nel file `admin-credentials.txt` generato durante la creazione dell'utente amministratore.

## URL del sistema

- **Frontend React**: http://localhost:5173/
- **Server Express**: http://localhost:3000/
- **API**: http://localhost:3000/api
- **API Auth**: http://localhost:3000/api/auth
- **API Media**: http://localhost:3000/api/media

---

## Note tecniche per gli sviluppatori

### Modifiche principali

1. **Auth Service**: Il nuovo servizio di autenticazione si trova in `src/services/auth-service.js`
2. **API Auth**: Le API di autenticazione sono in `server/api-auth.js`
3. **Server Express**: Il server principale ora utilizza JWT per autenticazione e MongoDB per memorizzazione
4. **Admin Layout**: Il layout amministrativo è stato aggiornato per utilizzare il nuovo sistema di autenticazione
5. **Media Service**: Il servizio per gestire i media è stato aggiornato per utilizzare MongoDB

### Aggiungere un nuovo amministratore

Per aggiungere un nuovo amministratore, puoi modificare il file `crea-utente-admin.js` cambiando i dettagli dell'utente admin e poi eseguirlo:

```bash
node crea-utente-admin.js
```

In alternativa, puoi cambiare il ruolo di un utente esistente a "ADMIN" direttamente nel database MongoDB.
