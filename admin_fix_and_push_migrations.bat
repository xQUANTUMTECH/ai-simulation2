@echo off
echo === Cafasso AI Academy - Applicazione Migrazioni e Fix Admin ===
echo Data: %date% %time%

REM Impostazione variabili di ambiente
set SUPABASE_PROJECT_ID=twusehwykpemphqtxlrx
set SUPABASE_PAT=sbp_91b1a5d19583c717a044bb0d19a1cbdb82c77c4c
set SUPABASE_URL=https://twusehwykpemphqtxlrx.supabase.co

echo.
echo 1. Verifica configurazione CLI Supabase
call npx supabase --version
if %ERRORLEVEL% NEQ 0 (
    echo Errore: CLI Supabase non trovato. Installazione...
    call npm install -g supabase
)

echo.
echo 2. Login con PAT token
call npx supabase login --token %SUPABASE_PAT%

echo.
echo 3. Collegamento al progetto Supabase
call npx supabase link --project-ref %SUPABASE_PROJECT_ID%

echo.
echo 4. Applicazione delle migrazioni SQL...
echo Y | call npx supabase db push

echo.
echo 5. Verifica e fix permessi admin...
echo.
echo SET client_min_messages TO WARNING; > .\temp_admin_fix.sql
echo -- Fix per assicurarsi che l'utente specificato abbia i permessi di admin >> .\temp_admin_fix.sql
echo UPDATE public.profiles >> .\temp_admin_fix.sql
echo SET is_admin = true, >> .\temp_admin_fix.sql
echo     role = 'admin', >> .\temp_admin_fix.sql
echo     permissions = '{"can_upload": true, "can_create_course": true, "can_edit_course": true, "can_delete_course": true}'::jsonb >> .\temp_admin_fix.sql
echo WHERE email = 'direttore@cafasso.edu'; >> .\temp_admin_fix.sql
echo >> .\temp_admin_fix.sql
echo -- Verifica impostazione admin >> .\temp_admin_fix.sql
echo \echo 'Risultato operazione:' >> .\temp_admin_fix.sql
echo SELECT email, role, is_admin FROM public.profiles WHERE email = 'direttore@cafasso.edu'; >> .\temp_admin_fix.sql

call npx supabase db execute < .\temp_admin_fix.sql
del .\temp_admin_fix.sql

echo.
echo 6. Esecuzione e verifica terminata!
echo Se non vedi errori, le migrazioni sono state applicate con successo.
echo Assicurati che lo status dell'utente 'direttore@cafasso.edu' mostri 'is_admin = true' e 'role = admin'
echo.
echo Per accedere come admin, usa le seguenti credenziali:
echo Email: direttore@cafasso.edu
echo Password: CafassoAdmin2025!
echo.
pause
