@echo off
ECHO ===================================================
ECHO AVVIO SERVER EXPRESS CON MONGODB - CAFASSO AI ACADEMY
ECHO ===================================================

REM Verifica che MongoDB sia in esecuzione
ECHO [1/2] Verifica che MongoDB sia in esecuzione...
docker ps | findstr cafasso_mongodb > nul
IF %ERRORLEVEL% NEQ 0 (
    ECHO MongoDB non risulta attivo. Avvio MongoDB con Docker...
    CALL .\start-mongodb-docker.bat
) ELSE (
    ECHO MongoDB risulta già in esecuzione.
)

ECHO [2/2] Avvio server Express...
ECHO.

REM Avvio del server backend semplificato
node server-express.mjs

ECHO ===================================================
ECHO Server Express terminato.
ECHO ===================================================
