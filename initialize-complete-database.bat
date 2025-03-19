@echo off
echo ====================================================
echo Inizializzazione completa del database SQLite per Cafasso AI Academy
echo ====================================================
echo Questo script crea un database SQLite completo con tutte le tabelle
echo individuate nelle migrazioni Supabase, incluse:
echo  - Tabelle di autenticazione e utente
echo  - Tabelle di contenuto (documenti, video, corsi, ecc.)
echo  - Tabelle per attività e avvisi
echo  - Tabelle per AI e simulazioni
echo  - Tabelle di storage
echo Oltre 40 tabelle totali con indici per ottimizzare le prestazioni
echo ====================================================

echo 1. Installazione delle dipendenze necessarie...
call npm install sqlite3 fs dotenv

echo 2. Creazione dello schema completo del database SQLite...
echo    (Include tutte le tabelle identificate nelle migrazioni Supabase)
call node --experimental-modules src/database/create-complete-schema.js

echo 3. Verifica delle tabelle create...
echo    (Utilizzo sqlite3 per controllare le tabelle)
call node --eval "const sqlite3=require('sqlite3');const db=new sqlite3.Database('./database.sqlite');db.all('SELECT name FROM sqlite_master WHERE type=\"table\"',(err,tables)=>{if(err){console.error(err)}else{console.log('\nTabelle create nel database:');tables.forEach(t=>console.log(' - '+t.name))}})"

echo ====================================================
echo Operazione completata! Il database SQLite è stato configurato con schema completo.
echo Puoi trovare il file database.sqlite nella directory principale del progetto.
echo Il database contiene tutte le tabelle necessarie per l'applicazione Cafasso AI Academy.
echo ====================================================

pause
