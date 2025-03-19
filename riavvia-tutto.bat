@echo off
echo ======================================================
echo Riavvio completo del sistema Cafasso AI Academy
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

REM Attendere un momento per assicurarsi che tutto sia chiuso
timeout /t 3 /nobreak > nul

REM Avvio di MongoDB
echo Fase 2: Avvio di MongoDB...
echo ------------------------------------------------------
echo Avvio di MongoDB...
start "MongoDB" mongod --dbpath=./mongodb_data
echo Attendi 5 secondi per l'avvio di MongoDB...
timeout /t 5 /nobreak > nul
echo MongoDB avviato.
echo.

REM Creazione utente amministratore
echo Fase 3: Creazione dell'utente amministratore...
echo ------------------------------------------------------
echo Creazione automatica dell'utente amministratore...
node crea-utente-admin.js
echo.

REM Avvio del server Express
echo Fase 4: Avvio del server Express...
echo ------------------------------------------------------
start "Express Server" node server-express.mjs
echo Attendi 3 secondi per l'avvio del server Express...
timeout /t 3 /nobreak > nul
echo Server Express avviato.
echo.

REM Avvio del frontend React
echo Fase 5: Avvio del frontend React...
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
echo Password: Cafasso@admin2025!
echo.
echo Per chiudere tutto, eseguire "chiudi-tutto.bat"
echo.

REM Avvio del frontend
npm run dev
