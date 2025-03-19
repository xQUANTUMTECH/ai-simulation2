# Gestione dei File di Grandi Dimensioni con Git e GitHub

## Problema
GitHub ha un limite di 100MB per singolo file e limiti complessivi sulla dimensione dei repository. I file che abbiamo identificato come troppo grandi includono:

- File del database MongoDB (`WiredTiger`, `*.wt`, etc.)
- File video (`*.mp4`, `*.mov`, etc.)
- File di metriche e log

## Soluzioni Implementate

1. **Aggiornamento del file `.gitignore`**

   Abbiamo aggiornato il file `.gitignore` per escludere automaticamente:
   - Cartella `mongodb_data/` e tutti i file di database
   - File video e multimediali di grandi dimensioni (mp4, mov, avi, etc.)
   - File di metriche e log

## Opzioni Alternative per Gestire File Grandi

Se hai comunque bisogno di condividere file di grandi dimensioni nel tuo progetto, considera queste alternative:

### 1. Git LFS (Large File Storage)

Git LFS è un'estensione di Git progettata specificatamente per gestire file di grandi dimensioni:

```bash
# Installazione di Git LFS
git lfs install

# Configurazione di quali estensioni tracciare con LFS
git lfs track "*.mp4"
git lfs track "*.psd"

# Aggiungere il file .gitattributes generato
git add .gitattributes

# Usa Git normalmente dopo questo
git add file.mp4
git commit -m "Aggiungi file video grande"
git push
```

Vantaggi:
- Permette di gestire file fino a 2GB su GitHub
- Mantiene la cronologia completa dei file
- Integrazione completa con Git

Svantaggi:
- GitHub ha un limite di banda mensile per Git LFS
- Potrebbe richiedere un piano a pagamento per file molto grandi o molto numerosi

### 2. Servizi di Archiviazione Esterni

Per dati e media:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

Per database:
- MongoDB Atlas (già menzionato in `CONFIGURAZIONE_AWS_S3_MONGODB_ATLAS.md`)
- Supabase Storage (già in uso per alcune parti del progetto)

### 3. Tool di Data Version Control (DVC)

Per progetti che richiedono controllo di versione per dataset e modelli di ML:
- [DVC](https://dvc.org/) permette di tracciare file di grandi dimensioni mantenendoli fuori da Git

## Migliori Pratiche

1. **Separare Dati da Codice**:
   - Mantenere i dati in storage dedicato (S3, MongoDB Atlas)
   - Mantenere solo il codice in Git

2. **Strategie per i file multimediali**:
   - Usare versioni a bassa risoluzione/compresse per test
   - Automatizzare il download di asset necessari in fase di setup

3. **Per i database**:
   - Usare script di inizializzazione anziché commit di dump database 
   - Fornire campioni di dati più piccoli per sviluppo
