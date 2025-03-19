@echo off
setlocal enabledelayedexpansion

:: Fix per evitare problemi di esecuzione
chcp 1252 > nul

:: Colori per output console
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%=================================================%RESET%
echo %CYAN%  ESECUZIONE TEST REPOSITORY E SERVIZI CAFASSO AI ACADEMY  %RESET%
echo %CYAN%=================================================%RESET%

:: Verifica se MongoDB è in esecuzione
echo.
echo %YELLOW%Verifica stato MongoDB...%RESET%
netstat -an | findstr "27017" > nul
if %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%MongoDB non rilevato in esecuzione. Avvio in corso...%RESET%
    start "" cmd /c "avvia-mongodb-server.bat"
    
    echo %YELLOW%Attesa avvio MongoDB...%RESET%
    :: Attendi 5 secondi per l'avvio di MongoDB
    ping -n 6 127.0.0.1 > nul
    
    :: Verifica nuovamente se MongoDB è in esecuzione
    netstat -an | findstr "27017" > nul
    if %ERRORLEVEL% NEQ 0 (
        echo %RED%Errore: Impossibile avviare MongoDB!%RESET%
        echo %RED%Assicurati che MongoDB sia installato correttamente.%RESET%
        pause
        exit /b 1
    ) else (
        echo %GREEN%MongoDB avviato con successo!%RESET%
    )
) else (
    echo %GREEN%MongoDB è già in esecuzione.%RESET%
)

:: Crea directory per i risultati dei test se non esiste
if not exist "test-results" mkdir "test-results"

echo.
echo %CYAN%-------------------------------------------------%RESET%
echo %CYAN%  TEST 1: PATTERN REPOSITORY (TEST BASE)  %RESET%
echo %CYAN%-------------------------------------------------%RESET%

:: Esegui il primo test
echo %YELLOW%Esecuzione test pattern repository base...%RESET%
node test-db-repository-pattern.js > test-results\test-db-repository-results.txt 2>&1

:: Verifica l'esito del test 1
findstr /C:"TUTTI I TEST COMPLETATI" test-results\test-db-repository-results.txt > nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%✓ Test pattern repository base completato con successo!%RESET%
    set TEST1_SUCCESS=1
) else (
    echo %RED%✗ Test pattern repository base fallito!%RESET%
    echo %RED%  Controlla il file di log per i dettagli: test-results\test-db-repository-results.txt%RESET%
    set TEST1_SUCCESS=0
)

echo.
echo %CYAN%-------------------------------------------------%RESET%
echo %CYAN%  TEST 2: PATTERN REPOSITORY (DATI REALI)  %RESET%
echo %CYAN%-------------------------------------------------%RESET%

:: Esegui il secondo test
echo %YELLOW%Esecuzione test pattern repository con dati reali...%RESET%
node test-repository-dati-reali.js > test-results\test-repository-dati-reali-results.txt 2>&1

:: Verifica l'esito del test 2
findstr /C:"TUTTI I TEST COMPLETATI" test-results\test-repository-dati-reali-results.txt > nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%✓ Test pattern repository con dati reali completato con successo!%RESET%
    set TEST2_SUCCESS=1
) else (
    echo %RED%✗ Test pattern repository con dati reali fallito!%RESET%
    echo %RED%  Controlla il file di log per i dettagli: test-results\test-repository-dati-reali-results.txt%RESET%
    set TEST2_SUCCESS=0
)

echo.
echo %CYAN%-------------------------------------------------%RESET%
echo %CYAN%  TEST 3: SERVIZIO RICONOSCIMENTO VOCALE  %RESET%
echo %CYAN%-------------------------------------------------%RESET%

:: Apri la pagina HTML di test per il riconoscimento vocale
echo %YELLOW%Apertura test browser riconoscimento vocale...%RESET%
start "" test-voice-recognition.html

:: Riepilogo risultati test
echo.
echo %CYAN%=================================================%RESET%
echo %CYAN%  RIEPILOGO RISULTATI TEST  %RESET%
echo %CYAN%=================================================%RESET%

echo.
if "!TEST1_SUCCESS!"=="1" (
    echo %GREEN%✓ TEST 1: Pattern repository base - SUCCESSO%RESET%
) else (
    echo %RED%✗ TEST 1: Pattern repository base - FALLITO%RESET%
)

if "!TEST2_SUCCESS!"=="1" (
    echo %GREEN%✓ TEST 2: Pattern repository dati reali - SUCCESSO%RESET%
) else (
    echo %RED%✗ TEST 2: Pattern repository dati reali - FALLITO%RESET%
)

echo %YELLOW%✓ TEST 3: Servizio riconoscimento vocale - AVVIATO (browser)%RESET%

echo.
echo %CYAN%I risultati completi dei test sono disponibili nella directory 'test-results'%RESET%
echo.
echo %YELLOW%Note importanti:%RESET%
echo %YELLOW%- Gli errori di transazione MongoDB ("Transaction numbers are only allowed on a replica set")%RESET%
echo %YELLOW%  sono normali in ambiente di sviluppo locale (MongoDB standalone). Sono previsti.%RESET%
echo %YELLOW%- Il test di riconoscimento vocale è interattivo e richiede l'intervento dell'utente%RESET%
echo %YELLOW%  per verificare il funzionamento nell'interfaccia grafica.%RESET%
echo.

:: Opzione per visualizzare i risultati completi (autocompilata in modalità non interattiva)
set "SHOW_LOGS="
set /p SHOW_LOGS=%YELLOW%Vuoi visualizzare i log dei test? (S/N): %RESET%
if /i "%SHOW_LOGS%"=="S" (
    echo.
    echo %CYAN%==== LOG TEST 1 ====%RESET%
    type test-results\test-db-repository-results.txt
    echo.
    echo %CYAN%==== LOG TEST 2 ====%RESET%
    type test-results\test-repository-dati-reali-results.txt
)

:: Chiedi se terminare MongoDB (autocompilata in modalità non interattiva)
echo.
set "STOP_MONGODB="
set /p STOP_MONGODB=%YELLOW%Vuoi terminare MongoDB? (S/N): %RESET%
if /i "%STOP_MONGODB%"=="S" (
    echo %YELLOW%Terminazione MongoDB in corso...%RESET%
    taskkill /im mongod.exe /f > nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo %GREEN%MongoDB terminato con successo.%RESET%
    ) else (
        echo %RED%Errore durante la terminazione di MongoDB.%RESET%
    )
)

echo.
echo %GREEN%Esecuzione test completata!%RESET%
pause
