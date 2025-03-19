/*
  # Add Simulation Notes Support

  1. New Tables
    - `simulation_notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `simulation_id` (uuid, foreign key to simulations)
      - `content` (text)
      - `type` (text - observation, feedback, action)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on simulation_notes table
    - Add policies for note management
*/

-- Create notes table
CREATE TABLE IF NOT EXISTS simulation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id uuid NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('observation', 'feedback', 'action')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE simulation_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own notes"
  ON simulation_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes"
  ON simulation_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON simulation_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON simulation_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_simulation_notes_user_id ON simulation_notes(user_id);
CREATE INDEX idx_simulation_notes_simulation_id ON simulation_notes(simulation_id);

-- Add trigger for updated_at
CREATE TRIGGER update_simulation_notes_updated_at
  BEFORE UPDATE ON simulation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();