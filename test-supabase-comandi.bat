@echo off
REM Script per testare la connessione a Supabase e interagire con il database tramite CLI
REM Raccolta di comandi eseguibili direttamente dal terminale

echo ======================================
echo TEST CONNESSIONE SUPABASE VIA CLI
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
echo COMANDI DISPONIBILI
echo ======================================
echo.

echo 1. COMANDI SUPABASE CLI
echo ----------------------
echo.
echo # Versione Supabase CLI
echo supabase --version
echo.
echo # Login a Supabase (richiede PAT)
echo supabase login
echo.
echo # Visualizza progetti
echo supabase projects list
echo.
echo # Link al progetto remoto
echo supabase link --project-ref %SUPABASE_PROJECT_REF%
echo.
echo # Pull schema dal database
echo supabase db pull
echo.
echo # Esegui test sul database
echo supabase test db
echo.
echo # Esecuzione di migrazioni
echo supabase db push
echo.
echo # Dump dello schema
echo supabase db dump -f schema.sql
echo.

echo 2. COMANDI POSTGRESQL (PSQL)
echo ---------------------------
echo.
echo # Connessione via PSQL
echo set PGPASSWORD=password-del-database
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres
echo.
echo # Esecuzione di query
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "SELECT version();"
echo.
echo # Export CSV
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY (SELECT * FROM tabella) TO 'output.csv' WITH CSV HEADER"
echo.
echo # Import CSV
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY tabella FROM 'input.csv' WITH CSV HEADER"
echo.

echo 3. CURL (API REST)
echo ----------------
echo.
echo # Richiesta GET
echo curl -X GET "%SUPABASE_URL%/rest/v1/tabella?select=*" ^
echo      -H "apikey: %SUPABASE_ANON_KEY%" ^
echo      -H "Authorization: Bearer %SUPABASE_ANON_KEY%"
echo.
echo # Richiesta POST (inserimento dati)
echo curl -X POST "%SUPABASE_URL%/rest/v1/tabella" ^
echo      -H "apikey: %SUPABASE_ANON_KEY%" ^
echo      -H "Authorization: Bearer %SUPABASE_ANON_KEY%" ^
echo      -H "Content-Type: application/json" ^
echo      -H "Prefer: return=minimal" ^
echo      -d "{\"campo1\": \"valore1\", \"campo2\": \"valore2\"}"
echo.

echo 4. COMANDI NPM/NODE
echo -----------------
echo.
echo # Installazione Supabase JS Client
echo npm install @supabase/supabase-js
echo.
echo # Installazione Supabase CLI
echo npm install -g supabase
echo.
echo # Esecuzione script di test
echo node test-supabase-connection.js
echo.
echo # Esecuzione script di importazione
echo node import-data-to-supabase.js
echo.

echo ======================================
echo ESEMPI PRATICI
echo ======================================
echo.

echo # Test connessione rapido
echo node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient('%SUPABASE_URL%', '%SUPABASE_ANON_KEY%'); supabase.from('users').select('count').then(console.log).catch(console.error);"
echo.
echo # Esecuzione script di migrazione
echo supabase db push --db-url postgresql://postgres:password@%SUPABASE_URL:https://=%.pooler.supabase.co:6543/postgres
echo.
echo # Backup tabella specifica
echo psql -h %SUPABASE_URL:https://=% -p 5432 -d postgres -U postgres -c "\\COPY users TO 'users_backup.csv' WITH CSV HEADER"
echo.

echo ======================================
echo FINE LISTA COMANDI
echo ======================================
echo.
echo Per eseguire uno di questi comandi, copialo e incollalo nel terminale.
echo.

pause
