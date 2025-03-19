@echo off
echo ======================================================
echo Avvio sistema Cafasso AI Academy con MongoDB Atlas
echo ======================================================
echo.

REM Chiusura di processi esistenti
echo Chiusura di eventuali processi esistenti...
echo ------------------------------------------------------

taskkill /f /im node.exe >nul 2>&1
echo Processi Node.js chiusi.

taskkill /f /im npm.cmd >nul 2>&1
echo Processi npm chiusi.

echo.
echo Tutti i processi sono stati chiusi.
echo.

REM Creazione file .env se non esiste
echo Impostazione variabili d'ambiente per MongoDB Atlas...
if not exist .env (
    echo MONGODB_URI=mongodb+srv://cafasso:password123@cluster0.mongodb.net/cafasso_academy > .env
    echo JWT_SECRET=cafasso-ai-academy-secret-key >> .env
    echo HOST=http://localhost:3000 >> .env
    echo PORT=3000 >> .env
    echo Creato file .env con impostazioni predefinite per MongoDB Atlas.
    echo.
    echo IMPORTANTE: Modificare il file .env con le credenziali corrette di MongoDB Atlas!
    echo Premere un tasto per continuare...
    pause > nul
)

REM Installazione delle dipendenze necessarie se mancanti
echo Verifica e installazione delle dipendenze mancanti...
echo (Questo potrebbe richiedere alcuni minuti la prima volta)

REM Verifica presenza di bcrypt
echo Verifica bcrypt...
node -e "try{require('bcrypt');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di bcrypt...
    call npm install bcrypt
)

REM Verifica presenza di jsonwebtoken
node -e "try{require('jsonwebtoken');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di jsonwebtoken...
    call npm install jsonwebtoken
)

REM Verifica altre dipendenze essenziali
node -e "try{require('mongodb');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di mongodb...
    call npm install mongodb
)

node -e "try{require('express');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di express...
    call npm install express
)

node -e "try{require('cors');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di cors...
    call npm install cors
)

node -e "try{require('nodemailer');console.log('OK')}catch(e){process.exit(1)}" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installazione di nodemailer...
    call npm install nodemailer
)

echo Tutte le dipendenze sono state verificate e installate.
echo.

REM Verifica se il file .env è stato configurato correttamente
echo Verifica configurazione MongoDB Atlas...
findstr /C:"mongodb+srv://" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ATTENZIONE: Il file .env non sembra contenere una stringa di connessione MongoDB Atlas valida.
    echo.
    echo Per utilizzare MongoDB Atlas:
    echo 1. Creare un account su https://www.mongodb.com/cloud/atlas
    echo 2. Creare un cluster gratuito
    echo 3. Ottenere la stringa di connessione
    echo 4. Modificare il file .env con:
    echo    MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cafasso_academy
    echo.
    echo Premere un tasto per continuare comunque, o CTRL+C per annullare...
    pause >nul
)

REM Creazione utente amministratore
echo Creazione/verifica dell'utente amministratore...
node crea-utente-admin.js
if %errorlevel% neq 0 (
    echo Errore nella creazione dell'utente amministratore.
    echo Verificare che la stringa di connessione MongoDB Atlas sia corretta nel file .env
    echo e che il cluster sia accessibile.
    echo.
    echo Continuazione con l'avvio del server...
)

REM Avvio del server Express
echo Avvio del server Express...
start "Express Server" cmd /c "node server-express.mjs"
echo Attendi 3 secondi per l'avvio del server Express...
timeout /t 3 /nobreak > nul
echo Server Express avviato.
echo.

REM Avvio del frontend React
echo Avvio del frontend React...
echo.
echo ======================================================
echo Sistema avviato con MongoDB Atlas!
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
echo Password: Cafasso@admin2025!
echo.
echo MongoDB in esecuzione su Atlas (cloud)
echo.
echo Per chiudere tutto, eseguire "chiudi-tutto.bat"
echo.

REM Avvio del frontend
call npm run dev
