/*
  # Notifications and Simulation Schema

  1. New Tables
    - notifications: User notifications system
    - simulation_notes: Notes for simulations
    - simulations: Core simulation data
    - simulation_participants: Participant tracking
    - simulation_metrics: Performance metrics

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict access based on user ownership

  3. Changes
    - Add indexes for performance
    - Add constraints for data integrity
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  notification_type text CHECK (notification_type IN ('COURSE', 'QUIZ', 'CERTIFICATE', 'SYSTEM')),
  related_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'notifications_select_policy'
  ) THEN
    CREATE POLICY "notifications_select_policy"
      ON notifications
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'notifications_update_policy'
  ) THEN
    CREATE POLICY "notifications_update_policy"
      ON notifications
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create simulation_notes table
CREATE TABLE IF NOT EXISTS simulation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id uuid NOT NULL,
  content text NOT NULL,
  type text CHECK (type IN ('observation', 'feedback', 'action')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for simulation_notes
CREATE INDEX IF NOT EXISTS idx_simulation_notes_simulation_id ON simulation_notes(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_notes_user_id ON simulation_notes(user_id);

-- Enable RLS
ALTER TABLE simulation_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for simulation_notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_notes' 
    AND policyname = 'simulation_notes_insert_policy'
  ) THEN
    CREATE POLICY "simulation_notes_insert_policy"
      ON simulation_notes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_notes' 
    AND policyname = 'simulation_notes_select_policy'
  ) THEN
    CREATE POLICY "simulation_notes_select_policy"
      ON simulation_notes
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_notes' 
    AND policyname = 'simulation_notes_update_policy'
  ) THEN
    CREATE POLICY "simulation_notes_update_policy"
      ON simulation_notes
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_notes' 
    AND policyname = 'simulation_notes_delete_policy'
  ) THEN
    CREATE POLICY "simulation_notes_delete_policy"
      ON simulation_notes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create simulations table
CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text CHECK (type IN ('medical', 'emergency', 'surgical')),
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for simulations
CREATE INDEX IF NOT EXISTS idx_simulations_created_by ON simulations(created_by);
CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);

-- Enable RLS
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

-- Create policies for simulations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulations' 
    AND policyname = 'simulations_select_policy'
  ) THEN
    CREATE POLICY "simulations_select_policy"
      ON simulations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulations' 
    AND policyname = 'simulations_insert_policy'
  ) THEN
    CREATE POLICY "simulations_insert_policy"
      ON simulations
      FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'ADMIN'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulations' 
    AND policyname = 'simulations_update_policy'
  ) THEN
    CREATE POLICY "simulations_update_policy"
      ON simulations
      FOR UPDATE
      TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- Create simulation_participants table
CREATE TABLE IF NOT EXISTS simulation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('observer', 'participant', 'instructor')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(simulation_id, user_id)
);

-- Create indexes for simulation_participants
CREATE INDEX IF NOT EXISTS idx_simulation_participants_simulation_id ON simulation_participants(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_participants_user_id ON simulation_participants(user_id);

-- Enable RLS
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for simulation_participants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_participants' 
    AND policyname = 'simulation_participants_insert_policy'
  ) THEN
    CREATE POLICY "simulation_participants_insert_policy"
      ON simulation_participants
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_participants' 
    AND policyname = 'simulation_participants_select_policy'
  ) THEN
    CREATE POLICY "simulation_participants_select_policy"
      ON simulation_participants
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Create simulation_metrics table
CREATE TABLE IF NOT EXISTS simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES simulation_participants(id) ON DELETE CASCADE,
  metric_type text CHECK (metric_type IN ('communication', 'decision_making', 'technical_skill')),
  score integer CHECK (score >= 0 AND score <= 100),
  feedback text,
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for simulation_metrics
CREATE INDEX IF NOT EXISTS idx_simulation_metrics_simulation_id ON simulation_metrics(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_metrics_participant_id ON simulation_metrics(participant_id);

-- Enable RLS
ALTER TABLE simulation_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for simulation_metrics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_metrics' 
    AND policyname = 'simulation_metrics_select_policy'
  ) THEN
    CREATE POLICY "simulation_metrics_select_policy"
      ON simulation_metrics
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM simulation_participants
        WHERE simulation_participants.id = simulation_metrics.participant_id
        AND simulation_participants.user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'simulation_metrics' 
    AND policyname = 'simulation_metrics_insert_policy'
  ) THEN
    CREATE POLICY "simulation_metrics_insert_policy"
      ON simulation_metrics
      FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM simulation_participants sp
        JOIN simulations s ON s.id = sp.simulation_id
        WHERE sp.id = simulation_metrics.participant_id
        AND s.created_by = auth.uid()
      ));
  END IF;
END $$;