// Script per applicare le migrazioni di Supabase
import { createClient } from '@supabase/supabase-js';

// Credenziali Supabase dal file di configurazione
const supabaseUrl = 'https://twusehwykpemphqtxlrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXNlaHd5a3BlbXBocXR4bHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI2MTU1MCwiZXhwIjoyMDU2ODM3NTUwfQ.6R1sHNpVWvpl_OyNBmjV7PWosmxke5UaVHvz0eZQiNg';

// Crea un client Supabase con il token di servizio
const supabase = createClient(supabaseUrl, supabaseKey);

// Funzione per eseguire una migrazione SQL
async function executeMigration(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Errore nell\'esecuzione della migrazione:', error);
      return false;
    }
    
    console.log('Migrazione eseguita con successo:', data);
    return true;
  } catch (err) {
    console.error('Eccezione durante l\'esecuzione della migrazione:', err);
    return false;
  }
}

// Funzione principale che applica tutte le migrazioni
async function applyMigrations() {
  console.log('Inizio applicazione migrazioni...');
  
  // SQL delle migrazioni essenziali
  const migrations = [
    // Migrazione per la gestione delle API key
    `
    -- API Key Management
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      last_used_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE
    );
    
    CREATE INDEX ON api_keys (user_id);
    CREATE INDEX ON api_keys (key_hash);
    
    -- RLS policies for API keys
    ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own API keys"
      ON api_keys FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own API keys"
      ON api_keys FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own API keys"
      ON api_keys FOR UPDATE
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete their own API keys"
      ON api_keys FOR DELETE
      USING (auth.uid() = user_id);
    `,
    
    // Migrazione per tabelle activity e alerts
    `
    -- Activity Feed Table
    CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      details JSONB,
      importance TEXT NOT NULL DEFAULT 'normal',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX ON activities (user_id);
    CREATE INDEX ON activities (type);
    CREATE INDEX ON activities (created_at);
    
    -- RLS policies for activities
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can view all activities"
      ON activities FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    
    CREATE POLICY "Users can view their own activities"
      ON activities FOR SELECT
      USING (auth.uid() = user_id);
    
    -- System Alerts Table
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details JSONB,
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX ON alerts (type);
    CREATE INDEX ON alerts (category);
    CREATE INDEX ON alerts (priority);
    CREATE INDEX ON alerts (created_at);
    CREATE INDEX ON alerts (resolved_at);
    CREATE INDEX ON alerts (assigned_to);
    
    -- RLS policies for alerts
    ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can view all alerts"
      ON alerts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    
    CREATE POLICY "Admins can insert alerts"
      ON alerts FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    
    CREATE POLICY "Admins can update alerts"
      ON alerts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    `,
    
    // Migrazione per tabella media_library
    `
    -- Media Library Schema
    CREATE TABLE IF NOT EXISTS media_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type TEXT NOT NULL CHECK (type IN ('video', 'document', 'image', 'audio')),
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      metadata JSONB,
      tags TEXT[],
      uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      size_bytes BIGINT,
      duration_seconds INTEGER,
      mime_type TEXT,
      is_public BOOLEAN DEFAULT FALSE
    );
    
    CREATE INDEX ON media_items (type);
    CREATE INDEX ON media_items (uploaded_by);
    CREATE INDEX ON media_items (created_at);
    CREATE INDEX ON media_items (is_public);
    
    -- RLS policies for media items
    ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Public media is viewable by everyone"
      ON media_items FOR SELECT
      USING (is_public = TRUE);
    
    CREATE POLICY "Users can view media they uploaded"
      ON media_items FOR SELECT
      USING (auth.uid() = uploaded_by);
    
    CREATE POLICY "Admins can view all media"
      ON media_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    
    CREATE POLICY "Admins can insert media"
      ON media_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.role = 'admin' OR auth.users.role = 'content_creator')
        )
      );
    
    CREATE POLICY "Admins can update media"
      ON media_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.role = 'admin' OR auth.users.role = 'content_creator')
        )
      );
    
    CREATE POLICY "Admins can delete media"
      ON media_items FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    `,
    
    // Migrazione per fix della tabella users
    `
    -- Fix users table with role field if not exists
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'auth'
            AND table_name = 'users'
            AND column_name = 'role'
        ) THEN
            ALTER TABLE auth.users ADD COLUMN role TEXT DEFAULT 'user';
        END IF;
    END $$;
    
    -- Create RLS policy allowing users to see their own role
    BEGIN;
    DROP POLICY IF EXISTS "Users can view own user data" ON auth.users;
    
    CREATE POLICY "Users can view own user data"
      ON auth.users FOR SELECT
      USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Admins can view all user data" ON auth.users;
    
    CREATE POLICY "Admins can view all user data"
      ON auth.users FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.role = 'admin'
        )
      );
    COMMIT;
    `
  ];
  
  // Applica ciascuna migrazione in sequenza
  for (let i = 0; i < migrations.length; i++) {
    console.log(`Applicazione migrazione ${i + 1}/${migrations.length}...`);
    const success = await executeMigration(migrations[i]);
    
    if (!success) {
      console.error(`Fallimento nella migrazione ${i + 1}. Processo interrotto.`);
      return;
    }
  }
  
  console.log('Tutte le migrazioni sono state applicate con successo!');
}

// Esegui la funzione principale
applyMigrations()
  .then(() => {
    console.log('Processo completato.');
  })
  .catch(err => {
    console.error('Errore durante l\'applicazione delle migrazioni:', err);
  });
