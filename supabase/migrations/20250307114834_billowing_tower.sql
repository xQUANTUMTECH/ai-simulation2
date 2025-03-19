/*
  # Real-time Collaboration Features

  1. New Tables
    - `whiteboard_elements`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references collaboration_rooms)
      - `type` (text: 'path', 'shape', 'text', 'image')
      - `data` (jsonb)
      - `position` (jsonb)
      - `style` (jsonb)
      - `created_by` (uuid)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `whiteboard_cursors`
      - `id` (uuid, primary key)
      - `room_id` (uuid)
      - `user_id` (uuid)
      - `position` (jsonb)
      - `last_updated` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for real-time collaboration
    - Secure cursor tracking

  3. Changes
    - Add real-time capabilities to existing tables
    - Add collaboration-specific fields
*/

-- Create whiteboard_elements table
CREATE TABLE IF NOT EXISTS whiteboard_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('path', 'shape', 'text', 'image')),
  data jsonb NOT NULL DEFAULT '{}',
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0}',
  style jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create whiteboard_cursors table
CREATE TABLE IF NOT EXISTS whiteboard_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0}',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE whiteboard_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_cursors ENABLE ROW LEVEL SECURITY;

-- Policies for whiteboard_elements
CREATE POLICY "Users can view elements in their rooms"
  ON whiteboard_elements
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM collaboration_participants
    WHERE collaboration_participants.room_id = whiteboard_elements.room_id
    AND collaboration_participants.user_id = auth.uid()
  ));

CREATE POLICY "Users can create elements in their rooms"
  ON whiteboard_elements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE collaboration_participants.room_id = whiteboard_elements.room_id
      AND collaboration_participants.user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

CREATE POLICY "Users can update their own elements"
  ON whiteboard_elements
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policies for whiteboard_cursors
CREATE POLICY "Users can view cursors in their rooms"
  ON whiteboard_cursors
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM collaboration_participants
    WHERE collaboration_participants.room_id = whiteboard_cursors.room_id
    AND collaboration_participants.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own cursor"
  ON whiteboard_cursors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for whiteboard_elements
CREATE TRIGGER update_whiteboard_elements_updated_at
  BEFORE UPDATE ON whiteboard_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add real-time replication for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_elements;
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_cursors;

-- Add indexes for better performance
CREATE INDEX idx_whiteboard_elements_room ON whiteboard_elements(room_id);
CREATE INDEX idx_whiteboard_elements_type ON whiteboard_elements(type);
CREATE INDEX idx_whiteboard_cursors_room ON whiteboard_cursors(room_id);
CREATE INDEX idx_whiteboard_cursors_user ON whiteboard_cursors(user_id);