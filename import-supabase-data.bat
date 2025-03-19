@echo off
REM Script per importare dati in Supabase utilizzando comandi CLI
REM Supporta diversi metodi di importazione (CSV, SQL, JSON)

echo ======================================
echo IMPORTAZIONE DATI SUPABASE VIA CLI
echo ======================================
echo.

REM Imposta le variabili di ambiente da .env se presente
if exist .env (
    echo Caricamento credenziali da .env...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="VITE_SUPABASE_URL" set SUPABASE_URL=%%b
        if "%%a"=="VITE_SUPABASE_ANON_KEY" set SUPABASE_ANON_KEY=%%b
        if "%%a"=="VITE_SUPABASE_SERVICE_ROLE_KEY" set SUPABASE_SERVICE_KEY=%%b
    )
) else (
    echo File .env non trovato, utilizzo credenziali hardcoded
    set SUPABASE_URL=https://twusehwykpemphqtxlrx.supabase.co
    set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNjE1NTAsImV4cCI6MjA1NjgzNzU1MH0.iku26hL5irHYwIxOPKNjUlTrTvlvw0a-ZU-uPgepoNk
    set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg
    set SUPABASE_PROJECT_REF=twusehwykpemphqtxlrx
)

echo URL Supabase: %SUPABASE_URL%
echo Project Ref: %SUPABASE_PROJECT_REF%
echo.

echo ======================================
echo COMANDI DI IMPORTAZIONE DATI
echo ======================================
echo.

echo 1. IMPORTAZIONE DA CSV
echo --------------------
echo.
echo # Importazione CSV tramite PSQL
echo set PGPASSWORD=password-del-database
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY nome_tabella FROM 'percorso/file.csv' WITH DELIMITER ',' CSV HEADER"
echo.
echo # Importazione CSV con opzioni aggiuntive
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY nome_tabella (colonna1, colonna2) FROM 'percorso/file.csv' WITH DELIMITER ',' CSV HEADER ENCODING 'UTF8'"
echo.

echo 2. ESECUZIONE SCRIPT SQL
echo ---------------------
echo.
echo # Esecuzione file SQL tramite PSQL
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -f script_importazione.sql
echo.
echo # Esecuzione SQL con migrazioni Supabase
echo supabase db push
echo.
echo # Esecuzione SQL diretto
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "INSERT INTO tabella (colonna1, colonna2) VALUES ('valore1', 'valore2')"
echo.

echo 3. IMPORTAZIONE DA JSON
echo --------------------
echo.
echo # Importazione JSON tramite API REST
echo curl -X POST "%SUPABASE_URL%/rest/v1/nome_tabella" ^
echo      -H "apikey: %SUPABASE_SERVICE_KEY%" ^
echo      -H "Authorization: Bearer %SUPABASE_SERVICE_KEY%" ^
echo      -H "Content-Type: application/json" ^
echo      -H "Prefer: return=minimal" ^
echo      -d @dati.json
echo.
echo # Importazione JSON tramite API con upsert
echo curl -X POST "%SUPABASE_URL%/rest/v1/nome_tabella" ^
echo      -H "apikey: %SUPABASE_SERVICE_KEY%" ^
echo      -H "Authorization: Bearer %SUPABASE_SERVICE_KEY%" ^
echo      -H "Content-Type: application/json" ^
echo      -H "Prefer: resolution=merge-duplicates" ^
echo      -d @dati.json
echo.

echo 4. IMPORTAZIONE CON PGLOADER
echo ------------------------
echo.
echo # Preparazione file di configurazione pgloader
echo echo "LOAD DATABASE" > pgloader.load
echo echo "FROM mysql://user:password@host/dbname" >> pgloader.load
echo echo "INTO postgresql://postgres.%SUPABASE_PROJECT_REF%:password@%SUPABASE_PROJECT_REF%.supabase.co:5432/postgres" >> pgloader.load
echo.
echo # Esecuzione pgloader
echo pgloader pgloader.load
echo.

echo ======================================
echo ESEMPI PRATICI DI IMPORTAZIONE
echo ======================================
echo.

echo 1. PREPARAZIONE DATI CSV DI ESEMPIO
echo ---------------------------------
echo.
echo # Creazione file CSV di esempio per utenti
echo echo id,email,nome,cognome > users_import.csv
echo echo 1,mario.rossi@example.com,Mario,Rossi >> users_import.csv
echo echo 2,anna.bianchi@example.com,Anna,Bianchi >> users_import.csv
echo.

echo 2. CREAZIONE TABELLA SE NON ESISTE
echo --------------------------------
echo.
echo # Comando SQL per creare tabella
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "CREATE TABLE IF NOT EXISTS users_import (id SERIAL PRIMARY KEY, email TEXT UNIQUE, nome TEXT, cognome TEXT);"
echo.

echo 3. IMPORT CSV NELLA TABELLA
echo ------------------------
echo.
echo # Comando per importare il CSV creato
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY users_import FROM 'users_import.csv' WITH DELIMITER ',' CSV HEADER"
echo.

echo 4. VERIFICA IMPORTAZIONE
echo ---------------------
echo.
echo # Comando per verificare i dati importati
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "SELECT * FROM users_import;"
echo.

echo ======================================
echo IMPORTAZIONE DATI CON SQL DUMP SCRIPT
echo ======================================
echo.

echo 1. CREAZIONE FILE SQL DI ESEMPIO
echo -----------------------------
echo.
echo # Creazione file SQL di esempio
echo echo "-- SQL per importazione dati" > import_data.sql
echo echo "BEGIN;" >> import_data.sql
echo echo "CREATE TABLE IF NOT EXISTS courses (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT);" >> import_data.sql
echo echo "INSERT INTO courses (title, description) VALUES ('Corso 1', 'Descrizione corso 1');" >> import_data.sql
echo echo "INSERT INTO courses (title, description) VALUES ('Corso 2', 'Descrizione corso 2');" >> import_data.sql
echo echo "COMMIT;" >> import_data.sql
echo.

echo 2. ESECUZIONE SQL SCRIPT
echo ---------------------
echo.
echo # Esecuzione script SQL creato
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -f import_data.sql
echo.

echo ======================================
echo IMPORTAZIONE BULK CON API REST
echo ======================================
echo.

echo 1. CREAZIONE FILE JSON DI ESEMPIO
echo -----------------------------
echo.
echo # Creazione file JSON di esempio per progetti
echo echo "[" > projects.json
echo echo "  {\"name\": \"Progetto 1\", \"status\": \"active\", \"completion\": 75}," >> projects.json
echo echo "  {\"name\": \"Progetto 2\", \"status\": \"pending\", \"completion\": 30}," >> projects.json
echo echo "  {\"name\": \"Progetto 3\", \"status\": \"completed\", \"completion\": 100}" >> projects.json
echo echo "]" >> projects.json
echo.

echo 2. CREAZIONE TABELLA PROGETTI
echo --------------------------
echo.
echo # Comando SQL per creare tabella progetti
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, name TEXT, status TEXT, completion INT);"
echo.

echo 3. IMPORTAZIONE DATI CON API REST
echo -----------------------------
echo.
echo # Comando curl per importare dati JSON
echo curl -X POST "%SUPABASE_URL%/rest/v1/projects" ^
echo      -H "apikey: %SUPABASE_SERVICE_KEY%" ^
echo      -H "Authorization: Bearer %SUPABASE_SERVICE_KEY%" ^
echo      -H "Content-Type: application/json" ^
echo      -H "Prefer: return=minimal" ^
echo      -d @projects.json
echo.

echo ======================================
echo UTILITÀ DI SUPPORTO
echo ======================================
echo.

echo # Elimina tabella (ATTENZIONE: operazione distruttiva)
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "DROP TABLE IF EXISTS nome_tabella CASCADE;"
echo.
echo # Backup di una tabella
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY nome_tabella TO 'nome_tabella_backup.csv' WITH CSV HEADER"
echo.
echo # Rinominare tabella
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "ALTER TABLE nome_tabella RENAME TO nuovo_nome_tabella;"
echo.
echo # Convertire JSON in CSV con jq (richiede jq installato)
echo type dati.json | jq -r ".[] | [.campo1, .campo2] | @csv" > output.csv
echo.

echo ======================================
echo FINE LISTA COMANDI
echo ======================================
echo.
echo Per eseguire uno di questi comandi, copialo e incollalo nel terminale.
echo.
echo Per maggiori informazioni su Supabase CLI, vedi: https://supabase.com/docs/reference/cli
echo Per psql, vedi: https://www.postgresql.org/docs/current/app-psql.html
echo.

pause
