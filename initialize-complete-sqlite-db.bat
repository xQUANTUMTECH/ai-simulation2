@echo off
echo ====================================================
echo Inizializzazione completa del database SQLite per Cafasso AI Academy
echo ====================================================

echo 1. Installazione delle dipendenze necessarie...
call npm install sqlite3 @supabase/supabase-js dotenv fs

echo 2. Creazione dello schema completo del database SQLite...
echo    (Include tutte le tabelle identificate dalle migrazioni Supabase)
call node --experimental-modules src/database/create-full-schema.js

echo 3. Verifica delle tabelle create...
echo    (Utilizzo sqlite3 per controllare le tabelle)
call node --eval "const sqlite3=require('sqlite3');const db=new sqlite3.Database('./database.sqlite');db.all('SELECT name FROM sqlite_master WHERE type=\"table\"',(err,tables)=>{if(err){console.error(err)}else{console.log('Tabelle create:');tables.forEach(t=>console.log(' - '+t.name))}})"

echo ====================================================
echo Operazione completata! Il database SQLite è stato configurato con schema completo.
echo Puoi trovare il file database.sqlite nella directory principale del progetto.
echo ====================================================

pause
