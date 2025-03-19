/*
  # Recording System Tables

  1. New Tables
    - recordings: Stores recording metadata and status
    - recording_segments: Stores individual recording chunks
    - interaction_events: Tracks user interactions during simulations
    - analysis_metrics: Stores performance metrics and analysis

  2. Security
    - Enable RLS on all tables
    - Policies for participant access
    - Instructor-specific permissions

  3. Indexes
    - Optimized queries for recordings and segments
    - Fast lookup by simulation ID
*/

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

-- Create interaction_events table
CREATE TABLE IF NOT EXISTS interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Create analysis_metrics table
CREATE TABLE IF NOT EXISTS analysis_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('communication', 'clinical', 'technical', 'leadership')),
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recordings_simulation_id ON recordings(simulation_id);
CREATE INDEX IF NOT EXISTS idx_recording_segments_recording_id ON recording_segments(recording_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_simulation_id ON interaction_events(simulation_id);
CREATE INDEX IF NOT EXISTS idx_analysis_metrics_simulation_id ON analysis_metrics(simulation_id);

-- Enable RLS
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recording_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for recordings
CREATE POLICY "Users can view recordings they participated in" ON recordings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = recordings.simulation_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Instructors can create recordings" ON recordings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = simulation_id
    AND sp.user_id = auth.uid()
    AND sp.role = 'instructor'
  )
);

-- Create policies for recording segments
CREATE POLICY "Users can view recording segments they have access to" ON recording_segments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recordings r
    JOIN simulation_participants sp ON sp.simulation_id = r.simulation_id
    WHERE r.id = recording_segments.recording_id
    AND sp.user_id = auth.uid()
  )
);

-- Create policies for interaction events
CREATE POLICY "Users can create interaction events" ON interaction_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = simulation_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view interaction events they participated in" ON interaction_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = interaction_events.simulation_id
    AND sp.user_id = auth.uid()
  )
);

-- Create policies for analysis metrics
CREATE POLICY "Users can view analysis metrics they participated in" ON analysis_metrics
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = analysis_metrics.simulation_id
    AND sp.user_id = auth.uid()
  )
);

-- Create updated_at triggers
CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();