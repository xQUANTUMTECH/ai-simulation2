# Correzioni per le Policy RLS in Supabase

Questo documento descrive le correzioni necessarie per le politiche di Row Level Security (RLS) in Supabase che hanno riferimenti errati a `users` o `public.users` invece di `auth.users`.

## Problema

Nel tentativo di eseguire le migrazioni, si verifica il seguente errore:

```
ERROR: relation "users" does not exist (SQLSTATE 42P01)
At statement 7:
CREATE POLICY "Instructors can create simulations"     
  ON simulations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
```

Questo è causato da policy RLS che fanno riferimento a una tabella `users` che non esiste o non è accessibile nel contesto atteso. Invece, dovrebbero fare riferimento a `auth.users`.

## Correzioni necessarie

Eseguire le seguenti correzioni SQL nella console SQL di Supabase:

### 1. Fix per "Instructors can create simulations" in simulations

```sql
-- Elimina la policy problematica
DROP POLICY IF EXISTS "Instructors can create simulations" ON simulations;

-- Ricrea la policy con il riferimento corretto a auth.users
CREATE POLICY "Instructors can create simulations" 
ON simulations 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);
```

### 2. Fix per "admin_api_keys_policy" in api_keys

```sql
-- Elimina la policy problematica
DROP POLICY IF EXISTS admin_api_keys_policy ON public.api_keys;

-- Ricrea la policy con il riferimento corretto a auth.users
CREATE POLICY admin_api_keys_policy ON public.api_keys
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);
```

### 3. Fix per "admin_api_key_usage_logs_policy" in api_key_usage_logs

```sql
-- Elimina la policy problematica
DROP POLICY IF EXISTS admin_api_key_usage_logs_policy ON public.api_key_usage_logs;

-- Ricrea la policy con il riferimento corretto a auth.users
CREATE POLICY admin_api_key_usage_logs_policy ON public.api_key_usage_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
  )
);
```

## Note

- In Supabase, la tabella che contiene gli utenti è `auth.users`, non `public.users` o semplicemente `users`.
- Gli utenti hanno un campo `raw_user_meta_data` che è un oggetto JSON. Il ruolo dell'utente si trova in `raw_user_meta_data->>'role'`.
- È importante controllare altre policy RLS che potrebbero avere lo stesso problema di riferimento alla tabella utenti.
