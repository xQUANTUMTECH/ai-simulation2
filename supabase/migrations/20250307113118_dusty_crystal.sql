/*
  # Voice and Audio System Schema

  1. New Tables
    - `voice_profiles` - Stores voice configuration profiles
      - `id` (uuid, primary key)
      - `name` (text) - Profile name
      - `settings` (jsonb) - Voice settings (pitch, rate, etc.)
      - `emotion_settings` (jsonb) - Emotion-specific adjustments
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `audio_zones` - Defines spatial audio zones in rooms
      - `id` (uuid, primary key)
      - `room_id` (uuid)
      - `type` (text) - Zone type (ambient/conversation/presentation)
      - `position` (jsonb) - Zone coordinates
      - `settings` (jsonb) - Audio settings
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `conversation_records` - Tracks conversation history
      - `id` (uuid, primary key)
      - `room_id` (uuid)
      - `speaker_id` (uuid)
      - `content` (text)
      - `emotion` (text)
      - `timestamp` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Add policies for access control
*/

-- Voice Profiles Table
CREATE TABLE voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{
    "pitch": 1.0,
    "rate": 1.0,
    "volume": 1.0,
    "voice": null
  }',
  emotion_settings jsonb NOT NULL DEFAULT '{
    "happy": {"pitch": 1.1, "rate": 1.1},
    "sad": {"pitch": 0.9, "rate": 0.9},
    "angry": {"pitch": 1.2, "rate": 1.2},
    "neutral": {"pitch": 1.0, "rate": 1.0}
  }',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audio Zones Table
CREATE TABLE audio_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb NOT NULL DEFAULT '{
    "volume": 1.0,
    "radius": 50,
    "falloff": "linear"
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT audio_zones_type_check CHECK (
    type IN ('ambient', 'conversation', 'presentation')
  )
);

-- Conversation Records Table
CREATE TABLE conversation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  emotion text,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT conversation_records_emotion_check CHECK (
    emotion IN ('neutral', 'happy', 'sad', 'angry')
  )
);

-- Enable RLS
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_records ENABLE ROW LEVEL SECURITY;

-- Voice Profiles Policies
CREATE POLICY "Users can view own voice profiles"
  ON voice_profiles
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can manage own voice profiles"
  ON voice_profiles
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Audio Zones Policies
CREATE POLICY "Anyone can view audio zones in active rooms"
  ON audio_zones
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = audio_zones.room_id
    AND web_rooms.status = 'active'
  ));

CREATE POLICY "Room creators can manage audio zones"
  ON audio_zones
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM web_rooms
    WHERE web_rooms.id = audio_zones.room_id
    AND web_rooms.created_by = auth.uid()
  ));

-- Conversation Records Policies
CREATE POLICY "Room participants can view conversations"
  ON conversation_records
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM web_room_participants
    WHERE web_room_participants.room_id = conversation_records.room_id
    AND web_room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own conversation records"
  ON conversation_records
  FOR INSERT
  WITH CHECK (auth.uid() = speaker_id);

-- Indexes
CREATE INDEX idx_voice_profiles_created_by ON voice_profiles(created_by);
CREATE INDEX idx_audio_zones_room ON audio_zones(room_id);
CREATE INDEX idx_conversation_records_room ON conversation_records(room_id);
CREATE INDEX idx_conversation_records_speaker ON conversation_records(speaker_id);

-- Update Triggers
CREATE TRIGGER update_voice_profiles_updated_at
  BEFORE UPDATE ON voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_zones_updated_at
  BEFORE UPDATE ON audio_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();