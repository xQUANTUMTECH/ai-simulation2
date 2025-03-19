/*
  # Recording and Analysis System

  1. New Tables
    - recordings: Video/audio session recordings
    - recording_segments: Individual recording segments
    - interaction_events: User interaction tracking
    - analysis_metrics: Performance analysis data

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict access based on simulation participation

  3. Changes
    - Add indexes for performance
    - Add constraints for data integrity
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
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recordings' 
    AND policyname = 'recordings_select_policy'
  ) THEN
    CREATE POLICY "recordings_select_policy"
      ON recordings
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = recordings.simulation_id
          AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recordings' 
    AND policyname = 'recordings_insert_policy'
  ) THEN
    CREATE POLICY "recordings_insert_policy"
      ON recordings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = simulation_id
          AND sp.user_id = auth.uid()
          AND sp.role = 'instructor'
        )
      );
  END IF;
END $$;

-- Create policies for recording segments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recording_segments' 
    AND policyname = 'recording_segments_select_policy'
  ) THEN
    CREATE POLICY "recording_segments_select_policy"
      ON recording_segments
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM recordings r
          JOIN simulation_participants sp ON sp.simulation_id = r.simulation_id
          WHERE r.id = recording_segments.recording_id
          AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for interaction events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interaction_events' 
    AND policyname = 'interaction_events_insert_policy'
  ) THEN
    CREATE POLICY "interaction_events_insert_policy"
      ON interaction_events
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = simulation_id
          AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interaction_events' 
    AND policyname = 'interaction_events_select_policy'
  ) THEN
    CREATE POLICY "interaction_events_select_policy"
      ON interaction_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = interaction_events.simulation_id
          AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for analysis metrics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analysis_metrics' 
    AND policyname = 'analysis_metrics_select_policy'
  ) THEN
    CREATE POLICY "analysis_metrics_select_policy"
      ON analysis_metrics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = analysis_metrics.simulation_id
          AND sp.user_id = auth.uid()
        )
      );
  END IF;
END $$;