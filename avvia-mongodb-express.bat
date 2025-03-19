@echo off
echo ======================================================
echo Avvio completo sistema Cafasso AI Academy con MongoDB
echo ======================================================
echo.

REM Verifica se MongoDB è in esecuzione
echo Verifica se MongoDB è in esecuzione...
tasklist /fi "imagename eq mongod.exe" | find "mongod.exe" > nul
if %errorlevel% == 0 (
    echo MongoDB è già in esecuzione.
) else (
    echo MongoDB non è in esecuzione. Avvio di MongoDB...
    start "MongoDB" mongod --dbpath=./mongodb_data
    echo Attendi 5 secondi per l'avvio di MongoDB...
    timeout /t 5 /nobreak > nul
)

REM Avvio del server Express
echo Avvio del server Express...
start "Express Server" node server-express.mjs

echo.
echo ======================================================
echo Sistema avviato!
echo.
echo Server Express disponibile su: http://localhost:3000/
echo API disponibili su: http://localhost:3000/api
echo API Auth disponibili su: http://localhost:3000/api/auth
echo API Media disponibili su: http://localhost:3000/api/media
echo ======================================================
echo.
echo Per interrompere, chiudi le finestre dei server o usa CTRL+C
echo.

REM Creazione utente amministratore
echo Vuoi creare un utente amministratore? (s/n)
choice /c sn /n
if %errorlevel% == 1 (
    echo Creazione utente amministratore...
    node crea-utente-admin.js
    echo.
)

echo Avvio React in modalità di sviluppo... 
echo Attendi che il server React venga avviato...
npm run dev
