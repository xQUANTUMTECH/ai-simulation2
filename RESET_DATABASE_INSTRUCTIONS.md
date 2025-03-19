# Istruzioni per Reset Database Supabase

## Problema Riscontrato

È stato rilevato un problema critico di ricorsione infinita nelle policy RLS su Supabase:
```
infinite recursion detected in policy for relation "users"
```

Abbiamo tentato di risolvere il problema tramite API REST e script ma abbiamo riscontrato limitazioni nei permessi. **La soluzione raccomandata è un reset completo del database con successiva riconfigurazione corretta.**

## Procedura di Reset e Riconfigurazione

### 1. Backup dei Dati Critici

Prima di procedere, eseguire un backup di tutti i dati importanti:

```javascript
// Backup utenti
const { data: users } = await supabase.from('users').select('*');
fs.writeFileSync('users_backup.json', JSON.stringify(users, null, 2));

// Backup altre tabelle essenziali
// ...
```

### 2. Reset del Database

1. Accedi alla dashboard Supabase: https://app.supabase.io
2. Seleziona il progetto Cafasso AI Academy
3. Vai su "Impostazioni del Progetto" → "Database"
4. Scorri fino a "Reset Database" nella sezione Danger Zone
5. Conferma l'operazione

### 3. Riconfigurazione del Database

Dopo il reset, esegui in sequenza:

1. **Creazione Tabelle**
   ```
   supabase db execute --file fix_missing_tables.sql
   ```
   Oppure esegui manualmente lo script tramite SQL Editor nella dashboard Supabase.

2. **Configurazione Storage**
   ```
   node fix_bucket_storage.js
   ```

3. **Importazione Utenti**
   ```
   node create_users.js
   ```

4. **Verifica configurazione**
   ```
   node simple-db-check.js
   ```

### 4. Configurazione RLS Corretta

Per configurare le policy RLS dopo il reset, utilizzare il seguente script SQL nell'interfaccia SQL di Supabase:

```sql
-- Abilita RLS su tutte le tabelle
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policy sicure e non ricorsive per public.users
CREATE POLICY "Users can see own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can see all profiles" ON public.users
  FOR SELECT 
  USING (
      EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid() 
          AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      )
  );

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy per auth_sessions (solo proprietario)
CREATE POLICY "Users can see own sessions" ON public.auth_sessions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert sessions" ON public.auth_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update sessions" ON public.auth_sessions
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete sessions" ON public.auth_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Policy per failed_login_attempts (solo admin)
CREATE POLICY "Admins can view failed logins" ON public.failed_login_attempts
  FOR SELECT USING (
      EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid() 
          AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      )
  );

-- Policy per user_settings (solo proprietario)
CREATE POLICY "Users can see own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);
```

### 5. Verifica Finale

Dopo la riconfigurazione completa, esegui:

```
node supabase-test-unified.js
```

## Perché è Necessario il Reset

I tentativi di correggere le policy problematiche tramite API e script hanno fallito per i seguenti motivi:

1. **Limitazioni di permessi**: Non abbiamo accesso completo per modificare le policy tramite API
2. **Errori di ricorsione infinita**: Le policy attuali contengono riferimenti circolari che impediscono l'accesso ai dati
3. **Impossibilità di modifica incrementale**: Il problema è strutturale e richiede un approccio radicale

Una riconfigurazione pulita garantirà un database funzionante con policy RLS corrette e non ricorsive.

## Impatto del Reset

- **Dati persi**: Tutti i dati nel database saranno eliminati (per questo è essenziale il backup)
- **Configurazione**: Tutte le impostazioni di RLS saranno rimosse e dovranno essere riconfigurate
- **Storage**: I bucket di storage rimarranno ma dovrà essere riconfigurato l'accesso RLS

## Conclusione

Pur essendo un'operazione invasiva, il reset del database rappresenta la soluzione più affidabile e pulita per risolvere i problemi di ricorsione infinita nelle policy RLS. Seguendo attentamente la procedura descritta, sarà possibile riconfigurare correttamente il database e garantire il corretto funzionamento dell'applicazione.
