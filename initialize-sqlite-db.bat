@echo off
echo ====================================================
echo Inizializzazione del database SQLite per Cafasso AI Academy
echo ====================================================

echo 1. Installazione delle dipendenze necessarie...
call npm install sqlite3 @supabase/supabase-js dotenv

echo 2. Creazione del database SQLite e delle tabelle...
call node --experimental-modules src/database/init-sqlite-db.js

echo 3. Migrazione dei dati da Supabase (se presenti)...
call node --experimental-modules src/database/migrate-from-supabase.js

echo ====================================================
echo Operazione completata! Il database SQLite è stato configurato.
echo Puoi trovare il file database.sqlite nella directory principale del progetto.
echo ====================================================

pause
