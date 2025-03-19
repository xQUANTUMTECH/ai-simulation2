/*
  # Real-time Collaboration Features

  1. New Tables
    - `collaboration_rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text: 'whiteboard', 'chat', 'video')
      - `status` (text: 'active', 'ended')
      - `created_by` (uuid, references users)
      - `created_at` (timestamp)
      - `ended_at` (timestamp)

    - `collaboration_participants`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references collaboration_rooms)
      - `user_id` (uuid, references users)
      - `role` (text: 'host', 'participant', 'observer')
      - `joined_at` (timestamp)
      - `left_at` (timestamp)

    - `whiteboard_data`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references collaboration_rooms)
      - `user_id` (uuid, references users)
      - `type` (text: 'path', 'shape', 'text', 'image')
      - `data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `chat_messages`
      - `id` (uuid, primary key)
      - `room_id` (uuid, references collaboration_rooms)
      - `user_id` (uuid, references users)
      - `content` (text)
      - `type` (text: 'text', 'file', 'system')
      - `metadata` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for room access and data management
*/

-- Create tables first
CREATE TABLE IF NOT EXISTS collaboration_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('whiteboard', 'chat', 'video')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS collaboration_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('host', 'participant', 'observer')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS whiteboard_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('path', 'shape', 'text', 'image')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'file', 'system')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE collaboration_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration_rooms
CREATE POLICY "Users can create rooms"
  ON collaboration_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view active rooms they're part of"
  ON collaboration_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = id
      AND user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Create policies for collaboration_participants
CREATE POLICY "Users can join rooms"
  ON collaboration_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view participants in their rooms"
  ON collaboration_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_rooms
      WHERE id = room_id
      AND (created_by = auth.uid() OR room_id IN (
        SELECT room_id FROM collaboration_participants
        WHERE user_id = auth.uid()
      ))
    )
  );

-- Create policies for whiteboard_data
CREATE POLICY "Users can add whiteboard data to their rooms"
  ON whiteboard_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = whiteboard_data.room_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view whiteboard data in their rooms"
  ON whiteboard_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = whiteboard_data.room_id
      AND user_id = auth.uid()
    )
  );

-- Create policies for chat_messages
CREATE POLICY "Users can send messages in their rooms"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = chat_messages.room_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = chat_messages.room_id
      AND user_id = auth.uid()
    )
  );

-- Create function and trigger for whiteboard_data
CREATE OR REPLACE FUNCTION update_whiteboard_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whiteboard_data_updated_at
  BEFORE UPDATE ON whiteboard_data
  FOR EACH ROW
  EXECUTE FUNCTION update_whiteboard_data_updated_at();