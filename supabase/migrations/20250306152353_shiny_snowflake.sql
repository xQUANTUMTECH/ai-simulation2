/*
  # Simulation System Schema

  1. New Tables
    - notifications: User notification system
    - simulation_notes: Notes for simulation sessions
    - simulations: Core simulation data
    - simulation_participants: Participant tracking
    - simulation_metrics: Performance metrics
    - recordings: Recording management
    - recording_segments: Recording data segments
    - interaction_events: Event tracking
    - analysis_metrics: Performance analysis

  2. Security
    - RLS enabled on all tables
    - User-specific access policies
    - Role-based permissions for instructors

  3. Indexes
    - Optimized queries for all tables
    - Fast participant and recording lookups
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_simulations_created_by ON simulations(created_by);
CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulations_select_policy" ON simulations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "simulations_insert_policy" ON simulations
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ));

CREATE POLICY "simulations_update_policy" ON simulations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

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

CREATE INDEX IF NOT EXISTS idx_simulation_notes_simulation_id ON simulation_notes(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_notes_user_id ON simulation_notes(user_id);
ALTER TABLE simulation_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulation_notes_select_policy" ON simulation_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "simulation_notes_insert_policy" ON simulation_notes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulation_notes_update_policy" ON simulation_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "simulation_notes_delete_policy" ON simulation_notes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_simulation_participants_simulation_id ON simulation_participants(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_participants_user_id ON simulation_participants(user_id);
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulation_participants_select_policy" ON simulation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "simulation_participants_insert_policy" ON simulation_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

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

CREATE INDEX IF NOT EXISTS idx_simulation_metrics_simulation_id ON simulation_metrics(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_metrics_participant_id ON simulation_metrics(participant_id);
ALTER TABLE simulation_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulation_metrics_select_policy" ON simulation_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM simulation_participants
    WHERE simulation_participants.id = simulation_metrics.participant_id
    AND simulation_participants.user_id = auth.uid()
  ));

CREATE POLICY "simulation_metrics_insert_policy" ON simulation_metrics
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM simulation_participants sp
    JOIN simulations s ON s.id = sp.simulation_id
    WHERE sp.id = participant_id
    AND s.created_by = auth.uid()
  ));

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration integer,
  size integer,
  status text NOT NULL CHECK (status IN ('recording', 'processing', 'ready', 'error')),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recordings_simulation_id ON recordings(simulation_id);
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recordings_select_policy" ON recordings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = recordings.simulation_id
    AND sp.user_id = auth.uid()
  ));

CREATE POLICY "recordings_insert_policy" ON recordings
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = simulation_id
    AND sp.user_id = auth.uid()
    AND sp.role = 'instructor'
  ));

-- Create recording_segments table
CREATE TABLE IF NOT EXISTS recording_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES recordings(id) ON DELETE CASCADE,
  start_time bigint NOT NULL,
  end_time bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('video', 'audio', 'screen', 'events')),
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recording_segments_recording_id ON recording_segments(recording_id);
ALTER TABLE recording_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recording_segments_select_policy" ON recording_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM recordings r
    JOIN simulation_participants sp ON sp.simulation_id = r.simulation_id
    WHERE r.id = recording_segments.recording_id
    AND sp.user_id = auth.uid()
  ));

-- Create interaction_events table
CREATE TABLE IF NOT EXISTS interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_simulation_id ON interaction_events(simulation_id);
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interaction_events_select_policy" ON interaction_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = interaction_events.simulation_id
    AND sp.user_id = auth.uid()
  ));

CREATE POLICY "interaction_events_insert_policy" ON interaction_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = simulation_id
    AND sp.user_id = auth.uid()
  ));

-- Create analysis_metrics table
CREATE TABLE IF NOT EXISTS analysis_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('communication', 'clinical', 'technical', 'leadership')),
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analysis_metrics_simulation_id ON analysis_metrics(simulation_id);
ALTER TABLE analysis_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_metrics_select_policy" ON analysis_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = analysis_metrics.simulation_id
    AND sp.user_id = auth.uid()
  ));