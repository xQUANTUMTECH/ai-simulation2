/*
  # Add Simulation System Tables

  1. New Tables
    - `simulations`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `type` (text - medical, emergency, surgical)
      - `difficulty` (text - beginner, intermediate, advanced)
      - `created_by` (uuid, foreign key to users)
      - `status` (text - draft, active, completed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `simulation_participants`
      - `id` (uuid, primary key)
      - `simulation_id` (uuid, foreign key to simulations)
      - `user_id` (uuid, foreign key to users)
      - `role` (text - observer, participant, instructor)
      - `joined_at` (timestamp)
      - `left_at` (timestamp)
    
    - `simulation_metrics`
      - `id` (uuid, primary key)
      - `simulation_id` (uuid, foreign key to simulations)
      - `participant_id` (uuid, foreign key to simulation_participants)
      - `metric_type` (text - communication, decision_making, technical_skill)
      - `score` (integer)
      - `feedback` (text)
      - `recorded_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for data access and modification
*/

-- Create simulations table
CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('medical', 'emergency', 'surgical')),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS simulation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('observer', 'participant', 'instructor')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(simulation_id, user_id)
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES simulation_participants(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('communication', 'decision_making', 'technical_skill')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  feedback text,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_metrics ENABLE ROW LEVEL SECURITY;

-- Simulation policies
CREATE POLICY "Users can view all simulations"
  ON simulations
  FOR SELECT
  TO authenticated
  USING (true);

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

CREATE POLICY "Instructors can update own simulations"
  ON simulations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Participant policies
CREATE POLICY "Users can view own participations"
  ON simulation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join simulations"
  ON simulation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Metrics policies
CREATE POLICY "Users can view own metrics"
  ON simulation_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulation_participants
      WHERE simulation_participants.id = participant_id
      AND simulation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create metrics"
  ON simulation_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM simulation_participants sp
      JOIN simulations s ON s.id = sp.simulation_id
      WHERE sp.id = participant_id
      AND s.created_by = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_simulations_created_by ON simulations(created_by);
CREATE INDEX idx_simulations_status ON simulations(status);
CREATE INDEX idx_simulation_participants_simulation_id ON simulation_participants(simulation_id);
CREATE INDEX idx_simulation_participants_user_id ON simulation_participants(user_id);
CREATE INDEX idx_simulation_metrics_simulation_id ON simulation_metrics(simulation_id);
CREATE INDEX idx_simulation_metrics_participant_id ON simulation_metrics(participant_id);
