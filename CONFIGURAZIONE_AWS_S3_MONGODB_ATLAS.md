# Configurazione AWS S3 per MongoDB Atlas

Questo documento contiene le istruzioni per configurare l'integrazione tra MongoDB Atlas e un bucket AWS S3. Questa integrazione consente di utilizzare Amazon S3 per backup, esportazioni di dati e altre funzionalità di storage.

## Prerequisiti

- Un account AWS attivo
- Un account MongoDB Atlas
- Accesso amministrativo all'account AWS per creare e gestire IAM roles
- AWS CLI configurato sul sistema locale (opzionale)

## Passaggi per la Configurazione

### 1. Creare una Policy di Trust per il Ruolo IAM

Crea un file chiamato `role-trust-policy.json` con il seguente contenuto:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::536727724300:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "be23d65b-ff4c-4517-a37c-fec92d640025"
        }
      }
    }
  ]
}
```

### 2. Creare un Nuovo Ruolo IAM con AWS CLI

```bash
aws iam create-role \
 --role-name MongoDB_Atlas_S3_Role \
 --assume-role-policy-document file://role-trust-policy.json \
 --max-session-duration 43200
```

### 3. Aggiungere la Policy di Accesso a S3

Crea un file chiamato `s3-access-policy.json` con il seguente contenuto:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:ListBucketMultipartUploads"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

Poi attacca questa policy al ruolo:

```bash
aws iam put-role-policy \
 --role-name MongoDB_Atlas_S3_Role \
 --policy-name S3_Access_For_Atlas \
 --policy-document file://s3-access-policy.json
```

### 4. Configurare il Ruolo IAM in MongoDB Atlas

1. Accedi alla dashboard di MongoDB Atlas
2. Vai a "Backup" > "Configure CloudProvider Access"
3. Seleziona "AWS" come provider cloud
4. Inserisci l'ARN del ruolo creato:
   ```
   arn:aws:iam::<your-aws-account-id>:role/MongoDB_Atlas_S3_Role
   ```
5. Clicca su "Validate" per verificare la configurazione
6. Salva le impostazioni

### 5. Configurare il Bucket S3 per MongoDB Atlas

1. Nella dashboard di MongoDB Atlas, vai a "Backup" > "Configure S3 Bucket"
2. Seleziona la regione AWS dove si trova il tuo bucket
3. Inserisci il nome del bucket S3
4. Clicca su "Next" e poi su "Save" per completare la configurazione

## Note Importanti

- L'ARN dell'account AWS Atlas da usare è: `arn:aws:iam::536727724300:root`
- L'ID esterno univoco fornito è: `be23d65b-ff4c-4517-a37c-fec92d640025`
- Sostituisci `your-bucket-name` nella policy con il nome effettivo del tuo bucket S3
- Sostituisci `<your-aws-account-id>` con il tuo ID account AWS (12 cifre)

## Configurazione da Console AWS (Alternativa)

Se preferisci usare la console AWS invece della CLI:

1. Accedi alla Console AWS
2. Vai a IAM > Ruoli > Crea Ruolo
3. Seleziona "Un altro account AWS"
4. Inserisci `536727724300` come ID account
5. Seleziona "Richiedi ID esterno" e inserisci `be23d65b-ff4c-4517-a37c-fec92d640025`
6. Allega le policy necessarie per l'accesso a S3
7. Assegna un nome al ruolo e crealo
8. Copia l'ARN del ruolo da usare in MongoDB Atlas

## Verifica della Configurazione

Dopo aver completato tutti i passaggi:

1. In MongoDB Atlas, vai alla sezione Backup
2. Prova a eseguire un backup manuale selezionando il bucket S3 configurato
3. Verifica che il backup venga completato senza errori
4. Controlla il bucket S3 per confermare che i file di backup siano stati caricati correttamente

## Risoluzione Problemi

Se riscontri errori di accesso:

1. Verifica che il ruolo IAM abbia la corretta policy di trust
2. Controlla che la policy di accesso a S3 sia configurata correttamente
3. Assicurati che l'ID esterno corrisponda a quello fornito da MongoDB Atlas
4. Verifica che il bucket S3 esista e sia accessibile
5. Controlla i log di CloudTrail per eventuali errori di autorizzazione
