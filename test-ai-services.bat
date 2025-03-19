@echo off
echo ======================================================
echo Test dei servizi AI di Cafasso Academy
echo ======================================================
echo.

REM Verifica che Node.js sia installato
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Errore: Node.js non è installato.
    echo Installa Node.js dal sito: https://nodejs.org/
    exit /b 1
)

REM Verifica che il server Express sia in esecuzione
REM Questo è facoltativo ma utile per ricordare all'utente
echo Verifica dello stato del server Express...
curl -s http://localhost:3000/api > nul
if %errorlevel% neq 0 (
    echo.
    echo ATTENZIONE: Il server Express non sembra essere in esecuzione.
    echo Si consiglia di avviare il server prima di eseguire i test.
    echo.
    echo Digitare:
    echo 1 per avviare il server Express e poi eseguire i test
    echo 2 per procedere comunque con i test
    echo 3 per annullare
    choice /c 123 /n /m "Scelta: "
    
    if %errorlevel% equ 1 (
        echo.
        echo Avvio del server Express...
        start "Server Express" cmd /c "node server-express.mjs"
        echo Attendo 5 secondi per l'avvio del server...
        timeout /t 5 /nobreak > nul
    ) else if %errorlevel% equ 3 (
        echo Operazione annullata.
        exit /b 0
    )
)

echo.
echo Creazione directory per i risultati dei test...
if not exist "test-ai-output" mkdir "test-ai-output"

echo.
echo ======================================================
echo ESECUZIONE TEST SERVIZI AI
echo ======================================================
echo.
echo 1. Test Generazione Testo - Testa la generazione di testo con vari modelli AI
echo 2. Test Text-to-Speech - Testa la conversione di testo in audio 
echo 3. Test Generazione Scenari - Testa la creazione di scenari da conversazioni
echo 4. Esegui tutti i test
echo 5. Esci senza eseguire test
echo.

choice /c 12345 /n /m "Seleziona un'opzione: "

if %errorlevel% equ 1 (
    echo.
    echo Esecuzione test di generazione testo...
    echo (Versione semplificata - simulazione)
    node test-ai-services-simple.js
) else if %errorlevel% equ 2 (
    echo.
    echo Esecuzione test di Text-to-Speech...
    echo (Versione semplificata - simulazione)
    node test-ai-services-simple.js
) else if %errorlevel% equ 3 (
    echo.
    echo Esecuzione test di generazione scenari...
    echo (Versione semplificata - simulazione)
    node test-ai-services-simple.js
) else if %errorlevel% equ 4 (
    echo.
    echo Esecuzione di tutti i test...
    echo (Versione semplificata - simulazione)
    node test-ai-services-simple.js
) else if %errorlevel% equ 5 (
    echo Operazione annullata.
    exit /b 0
)

echo.
echo ======================================================
echo TEST COMPLETATI
echo ======================================================
echo.
echo Se i test hanno avuto successo, i risultati sono disponibili nella
echo directory "test-ai-output".
echo.
echo Premi un tasto per aprire la cartella con i risultati...
pause > nul

explorer "test-ai-output"

echo.
echo Premi un tasto per uscire...
pause > nul
