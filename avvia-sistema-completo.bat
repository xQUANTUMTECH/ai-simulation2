@echo off
echo ======================================================
echo Avvio completo sistema Cafasso AI Academy con MongoDB
echo ======================================================
echo.

REM Chiusura di tutti i processi esistenti
echo Fase 1: Chiusura di tutti i processi esistenti...
echo ------------------------------------------------------

echo Chiusura di MongoDB...
taskkill /f /im mongod.exe 2>nul
if %errorlevel% == 0 (
    echo MongoDB è stato chiuso.
) else (
    echo MongoDB non era in esecuzione.
)

echo Chiusura dei server Node.js...
taskkill /f /im node.exe 2>nul
if %errorlevel% == 0 (
    echo I processi Node.js sono stati chiusi.
) else (
    echo Nessun processo Node.js era in esecuzione.
)

echo Chiusura dei processi npm...
taskkill /f /im npm.cmd 2>nul
if %errorlevel% == 0 (
    echo I processi npm sono stati chiusi.
) else (
    echo Nessun processo npm era in esecuzione.
)

echo.
echo Tutti i processi sono stati chiusi.
echo.

REM Verifica e installazione delle dipendenze necessarie
echo Fase 2: Verifica e installazione delle dipendenze...
echo ------------------------------------------------------
echo Verifico esistenza e installo le dipendenze mancanti...

REM Verifica presenza di bcrypt e installa se necessario
node -e "try{require('bcrypt');console.log('Bcrypt OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di bcrypt...
    call npm install bcrypt --save
    echo.
)

REM Verifica presenza di jsonwebtoken e installa se necessario
node -e "try{require('jsonwebtoken');console.log('JWT OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di jsonwebtoken...
    call npm install jsonwebtoken --save
    echo.
)

REM Verifica presenza di mongodb e installa se necessario
node -e "try{require('mongodb');console.log('MongoDB OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione del driver mongodb...
    call npm install mongodb --save
    echo.
)

REM Verifica presenza di express e installa se necessario
node -e "try{require('express');console.log('Express OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di express...
    call npm install express cors nodemailer --save
    echo.
)

echo Tutte le dipendenze sono state verificate e installate.
echo.

REM Avvia MongoDB (locale) o verifica connessione (Atlas)
echo Fase 3: Avvio e verifica MongoDB...
echo ------------------------------------------------------

REM Verifica se MongoDB è installato localmente
where mongod.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo MongoDB è installato localmente. Avvio in corso...
    
    if not exist "mongodb_data" (
        echo Creazione directory per i dati...
        mkdir "mongodb_data"
    )
    
    start "MongoDB" cmd /c "mongod --dbpath=./mongodb_data"
    echo Attendi 5 secondi per l'avvio di MongoDB...
    timeout /t 5 /nobreak > nul
    echo MongoDB avviato localmente.
) else (
    echo MongoDB non è installato localmente o non è nel PATH.
    echo Provo a connettermi utilizzando l'URL predefinito...
    
    REM Verifica connessione al database
    node -e "const { MongoClient } = require('mongodb'); async function test() { try { const client = new MongoClient('mongodb://localhost:27017'); await client.connect(); console.log('Connessione riuscita'); await client.close(); } catch (e) { console.error('Errore connessione'); process.exit(1); } } test();" >nul 2>&1
    
    if %errorlevel% equ 0 (
        echo Connessione al database MongoDB riuscita.
    ) else (
        echo Impossibile connettersi a MongoDB.
        echo.
        echo Scegli un'opzione:
        echo 1. Riprova con configurazione base locale (localhost)
        echo 2. Utilizza MongoDB Atlas (cloud)
        echo 3. Esci senza avviare
        choice /c 123 /n
        
        if %errorlevel% equ 1 (
            echo Continuo con configurazione di base...
        ) else if %errorlevel% equ 2 (
            echo Avvio con MongoDB Atlas...
            call .\avvia-con-atlas.bat
            exit /b
        ) else (
            echo Operazione annullata.
            exit /b 1
        )
    )
)

REM Migrazione delle tabelle e creazione utente admin
echo Fase 4: Migrazione tabelle e creazione utente admin...
echo ------------------------------------------------------
echo Esecuzione migrazione delle tabelle Supabase...
node migrazione-supabase-tabelle.js

echo Creazione dell'utente amministratore...
node crea-utente-admin.js
echo.

REM Avvio del server Express
echo Fase 5: Avvio del server Express...
echo ------------------------------------------------------
start "Express Server" cmd /c "node server-express.mjs"
echo Attendi 3 secondi per l'avvio del server Express...
timeout /t 3 /nobreak > nul
echo Server Express avviato.
echo.

REM Avvio del frontend React
echo Fase 6: Avvio del frontend React...
echo ------------------------------------------------------
echo Avvio dell'applicazione React in modalità di sviluppo...
echo.
echo ======================================================
echo Sistema completamente avviato!
echo.
echo Server Express disponibile su: http://localhost:3000/
echo API disponibili su: http://localhost:3000/api
echo API Auth disponibili su: http://localhost:3000/api/auth
echo API Media disponibili su: http://localhost:3000/api/media
echo Frontend React disponibile su: http://localhost:5173/
echo ======================================================
echo.
echo Credenziali amministratore:
echo Username: admin
echo Email: admin@cafasso-academy.it
echo Password: Cafasso@admin2025!
echo.
echo Per chiudere tutto, eseguire "chiudi-tutto.bat"
echo.

REM Avvio del frontend
npm run dev
