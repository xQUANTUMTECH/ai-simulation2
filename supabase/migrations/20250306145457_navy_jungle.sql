/*
  # Virtual Rooms System

  1. New Tables
    - `virtual_rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text - web/unreal)
      - `status` (text - waiting/active/ended)
      - `max_participants` (integer)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for room access and management
*/

-- Create virtual_rooms table
CREATE TABLE IF NOT EXISTS virtual_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('web', 'unreal')),
  status text NOT NULL CHECK (status IN ('waiting', 'active', 'ended')),
  max_participants integer NOT NULL DEFAULT 10,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_virtual_rooms_created_by ON virtual_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_virtual_rooms_status ON virtual_rooms(status);

-- Enable RLS
ALTER TABLE virtual_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create rooms"
  ON virtual_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view active rooms"
  ON virtual_rooms
  FOR SELECT
  TO authenticated
  USING (status != 'ended');

CREATE POLICY "Room creators can update their rooms"
  ON virtual_rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_virtual_rooms_updated_at
  BEFORE UPDATE ON virtual_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();