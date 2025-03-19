@echo off
echo ======================================================
echo Chiusura di tutti i processi relativi al sistema Cafasso AI Academy
echo ======================================================
echo.

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
echo ======================================================
echo Tutti i processi sono stati chiusi. Il sistema è pronto per essere riavviato.
echo ======================================================
echo.

pause
