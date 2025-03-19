# Istruzioni per Setup Repository GitHub

Il repository remoto precedente non è più accessibile. Segui questi passaggi per configurare un nuovo repository GitHub e pushare il codice:

## 1. Creare un nuovo repository su GitHub

1. Vai su [GitHub](https://github.com/) e accedi al tuo account
2. Clicca sul pulsante "+" in alto a destra e seleziona "New repository"
3. Inserisci un nome per il repository (ad esempio "cafasso-ai-academy")
4. Aggiungi una descrizione opzionale (es. "Piattaforma AI Academy per Cafasso")
5. Scegli se il repository deve essere pubblico o privato
6. **NON** inizializzare il repository con README, .gitignore o licenza
7. Clicca su "Create repository"

## 2. Collegare il repository locale al nuovo repository GitHub

Dopo aver creato il repository, GitHub mostrerà le istruzioni. Esegui i seguenti comandi dal tuo terminale nella directory del progetto:

```bash
# Aggiungi il nuovo URL del repository remoto
git remote add origin https://github.com/TUO-USERNAME/NOME-REPOSITORY.git

# Verifica che il remote sia stato aggiunto correttamente
git remote -v

# Pusha i cambiamenti sul repository remoto
git push -u origin main
```

Sostituisci `TUO-USERNAME` con il tuo nome utente GitHub e `NOME-REPOSITORY` con il nome che hai scelto durante la creazione.

## 3. Verifica che il push sia andato a buon fine

1. Visita la pagina del repository su GitHub
2. Dovresti vedere tutti i file del progetto, ad eccezione di quelli specificati nel `.gitignore`
3. Verifica che i file di grandi dimensioni (file MongoDB, video, etc.) non siano stati caricati grazie alle modifiche apportate al `.gitignore`

## 4. Impostazioni consigliate per il repository

Dopo aver pushato il codice, potresti voler configurare alcune impostazioni aggiuntive:

1. **Protezione del branch main**:
   - Vai su Settings > Branches
   - Aggiungi una regola di protezione per "main"
   - Seleziona opzioni come "Require pull request reviews before merging"

2. **Collaboratori**:
   - Settings > Collaborators
   - Aggiungi i membri del team che devono avere accesso al repository

3. **GitHub Pages** (se necessario per documentazione):
   - Settings > Pages
   - Configura per pubblicare dalla cartella /docs sul branch main

## Note importanti

- Le credenziali (come token di accesso, chiavi API, etc.) non devono essere memorizzate nel repository
- I file di configurazione per ambienti specifici dovrebbero essere esclusi da git
- Utilizzare file di esempio (.env.example) per mostrare quali variabili di ambiente sono necessarie

Con queste configurazioni, il tuo repository sarà pronto per la collaborazione e lo sviluppo, mantenendo al contempo una dimensione ragionevole grazie all'esclusione dei file grandi tramite gitignore.
