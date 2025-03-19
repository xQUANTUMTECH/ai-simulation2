@echo off
echo ======================================================
echo Avvio completo sistema Cafasso AI Academy con Docker
echo ======================================================
echo.

REM Verifica se Docker è installato
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker non è installato! Installare Docker Desktop da https://www.docker.com/products/docker-desktop
    echo e riprovare.
    echo.
    echo Per un'installazione senza Docker, fare riferimento a AGGIORNAMENTO_ISTRUZIONI_UTILIZZO.md
    pause
    exit /b 1
)

REM Verifica se il container MongoDB esiste e se è in esecuzione
echo Verifica container MongoDB...
docker ps -a | findstr "mongodb-cafasso" >nul 2>&1
if %errorlevel% neq 0 (
    echo Container MongoDB non trovato. Creazione di un nuovo container...
    docker run --name mongodb-cafasso -p 27017:27017 -v %cd%\mongodb_data:/data/db -d mongo
    if %errorlevel% neq 0 (
        echo Errore nella creazione del container MongoDB! Verificare che Docker sia in esecuzione.
        pause
        exit /b 1
    )
    echo Container MongoDB creato con successo.
) else (
    docker ps | findstr "mongodb-cafasso" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Container MongoDB trovato ma non in esecuzione. Avvio...
        docker start mongodb-cafasso
        if %errorlevel% neq 0 (
            echo Errore nell'avvio del container MongoDB!
            pause
            exit /b 1
        )
    ) else (
        echo Container MongoDB già in esecuzione.
    )
)

echo Attendi 5 secondi per l'avvio completo di MongoDB...
timeout /t 5 /nobreak > nul

REM Chiudere eventuali processi Node.js in esecuzione
echo Chiusura dei server Node.js in esecuzione...
taskkill /f /im node.exe >nul 2>&1
echo Chiusura dei processi npm in esecuzione...
taskkill /f /im npm.cmd >nul 2>&1

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

REM Creazione utente amministratore
echo Creazione/verifica dell'utente amministratore...
node crea-utente-admin.js
if %errorlevel% neq 0 (
    echo Errore nella creazione dell'utente amministratore.
    echo Verificare il log per dettagli.
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
echo Password: Cafasso@admin2025!
echo.
echo MongoDB in esecuzione su Docker (mongodb-cafasso)
echo.
echo Per chiudere tutto, eseguire "chiudi-tutto.bat"
echo.

REM Avvio del frontend
call npm run dev
