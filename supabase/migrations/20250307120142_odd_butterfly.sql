/*
  # Web Rooms and Collaboration Migration

  1. New Tables
    - web_rooms: Virtual meeting rooms
    - web_room_participants: Room participants management
    - web_room_zones: Room zone configuration
    - audio_zones: Spatial audio configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for access control
    - Add indexes for performance

  3. Changes
    - Add triggers for updated_at columns
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create rooms" ON web_rooms;
  DROP POLICY IF EXISTS "Room creators can update their rooms" ON web_rooms;
  DROP POLICY IF EXISTS "Anyone can view active rooms" ON web_rooms;
  DROP POLICY IF EXISTS "Users can join rooms" ON web_room_participants;
  DROP POLICY IF EXISTS "Users can update own participant status" ON web_room_participants;
  DROP POLICY IF EXISTS "Participants can view room members" ON web_room_participants;
  DROP POLICY IF EXISTS "Anyone can view room zones" ON web_room_zones;
  DROP POLICY IF EXISTS "Room creators can manage zones" ON web_room_zones;
  DROP POLICY IF EXISTS "Anyone can view audio zones in active rooms" ON audio_zones;
  DROP POLICY IF EXISTS "Room creators can manage audio zones" ON audio_zones;
END $$;

-- Drop existing triggers if they exist
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS update_web_rooms_updated_at ON web_rooms;
  DROP TRIGGER IF EXISTS update_web_room_zones_updated_at ON web_room_zones;
  DROP TRIGGER IF EXISTS update_audio_zones_updated_at ON audio_zones;
END $$;

-- Web Rooms Table
CREATE TABLE IF NOT EXISTS web_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  layout jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  max_participants integer NOT NULL DEFAULT 50,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT web_rooms_status_check CHECK (status IN ('active', 'inactive'))
);

-- Web Room Participants Table
CREATE TABLE IF NOT EXISTS web_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  media_state jsonb DEFAULT '{"audio": false, "video": false}'::jsonb,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  CONSTRAINT web_room_participants_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT web_room_participants_unique UNIQUE (room_id, user_id)
);

-- Web Room Zones Table
CREATE TABLE IF NOT EXISTS web_room_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT web_room_zones_type_check CHECK (type IN ('presentation', 'discussion', 'quiet'))
);

-- Audio Zones Table
CREATE TABLE IF NOT EXISTS audio_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb NOT NULL DEFAULT '{"radius": 50, "volume": 1.0, "falloff": "linear"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT audio_zones_type_check CHECK (type IN ('ambient', 'conversation', 'presentation'))
);

-- Enable RLS
ALTER TABLE web_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_room_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_zones ENABLE ROW LEVEL SECURITY;

-- Web Rooms Policies
CREATE POLICY "Users can create rooms"
  ON web_rooms
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
  ON web_rooms
  FOR UPDATE
  TO public
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view active rooms"
  ON web_rooms
  FOR SELECT
  TO public
  USING (status = 'active');

-- Web Room Participants Policies
CREATE POLICY "Users can join rooms"
  ON web_room_participants
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participant status"
  ON web_room_participants
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can view room members"
  ON web_room_participants
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM web_room_participants wp
    WHERE wp.room_id = web_room_participants.room_id
    AND wp.user_id = auth.uid()
  ));

-- Web Room Zones Policies
CREATE POLICY "Anyone can view room zones"
  ON web_room_zones
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = web_room_zones.room_id
    AND web_rooms.status = 'active'
  ));

CREATE POLICY "Room creators can manage zones"
  ON web_room_zones
  FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = web_room_zones.room_id
    AND web_rooms.created_by = auth.uid()
  ));

-- Audio Zones Policies
CREATE POLICY "Anyone can view audio zones in active rooms"
  ON audio_zones
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = audio_zones.room_id
    AND web_rooms.status = 'active'
  ));

CREATE POLICY "Room creators can manage audio zones"
  ON audio_zones
  FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = audio_zones.room_id
    AND web_rooms.created_by = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_web_rooms_status ON web_rooms(status);
CREATE INDEX IF NOT EXISTS idx_web_room_participants_room ON web_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_web_room_participants_user ON web_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_web_room_zones_room ON web_room_zones(room_id);
CREATE INDEX IF NOT EXISTS idx_audio_zones_room ON audio_zones(room_id);

-- Update Triggers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_web_rooms_updated_at'
  ) THEN
    CREATE TRIGGER update_web_rooms_updated_at
      BEFORE UPDATE ON web_rooms
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_web_room_zones_updated_at'
  ) THEN
    CREATE TRIGGER update_web_room_zones_updated_at
      BEFORE UPDATE ON web_room_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_audio_zones_updated_at'
  ) THEN
    CREATE TRIGGER update_audio_zones_updated_at
      BEFORE UPDATE ON audio_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;