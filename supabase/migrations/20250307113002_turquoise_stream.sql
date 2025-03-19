/*
  # Web Room Schema Update

  1. New Tables
    - `web_rooms` - Stores web-based virtual rooms
      - `id` (uuid, primary key)
      - `name` (text)
      - `layout` (jsonb) - Room layout configuration
      - `status` (text) - Room status (active/inactive)
      - `max_participants` (integer)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `web_room_participants` - Tracks participants in web rooms
      - `id` (uuid, primary key)
      - `room_id` (uuid)
      - `user_id` (uuid)
      - `position` (jsonb) - Participant's position in room
      - `status` (text) - Participant status
      - `media_state` (jsonb) - Audio/video state
      - `joined_at` (timestamptz)
      - `left_at` (timestamptz)
    
    - `web_room_zones` - Defines interaction zones in rooms
      - `id` (uuid, primary key)
      - `room_id` (uuid)
      - `type` (text) - Zone type (presentation/discussion/quiet)
      - `position` (jsonb) - Zone position and size
      - `settings` (jsonb) - Zone-specific settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for room access and management
*/

-- Web Rooms Table
CREATE TABLE web_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  layout jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  max_participants integer NOT NULL DEFAULT 50,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT web_rooms_status_check CHECK (status IN ('active', 'inactive'))
);

-- Web Room Participants Table
CREATE TABLE web_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position jsonb DEFAULT '{"x": 0, "y": 0}',
  status text NOT NULL DEFAULT 'active',
  media_state jsonb DEFAULT '{"audio": false, "video": false}',
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  
  CONSTRAINT web_room_participants_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT web_room_participants_unique UNIQUE (room_id, user_id)
);

-- Web Room Zones Table
CREATE TABLE web_room_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT web_room_zones_type_check CHECK (type IN ('presentation', 'discussion', 'quiet'))
);

-- Enable RLS
ALTER TABLE web_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_room_zones ENABLE ROW LEVEL SECURITY;

-- Policies for web_rooms
CREATE POLICY "Anyone can view active rooms"
  ON web_rooms
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can create rooms"
  ON web_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms"
  ON web_rooms
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policies for web_room_participants
CREATE POLICY "Participants can view room members"
  ON web_room_participants
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM web_room_participants wp
    WHERE wp.room_id = web_room_participants.room_id
    AND wp.user_id = auth.uid()
  ));

CREATE POLICY "Users can join rooms"
  ON web_room_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participant status"
  ON web_room_participants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for web_room_zones
CREATE POLICY "Anyone can view room zones"
  ON web_room_zones
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = web_room_zones.room_id
    AND web_rooms.status = 'active'
  ));

CREATE POLICY "Room creators can manage zones"
  ON web_room_zones
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = web_room_zones.room_id
    AND web_rooms.created_by = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_web_rooms_status ON web_rooms(status);
CREATE INDEX idx_web_room_participants_room ON web_room_participants(room_id);
CREATE INDEX idx_web_room_participants_user ON web_room_participants(user_id);
CREATE INDEX idx_web_room_zones_room ON web_room_zones(room_id);

-- Update trigger for web_rooms
CREATE TRIGGER update_web_rooms_updated_at
  BEFORE UPDATE ON web_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for web_room_zones
CREATE TRIGGER update_web_room_zones_updated_at
  BEFORE UPDATE ON web_room_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();