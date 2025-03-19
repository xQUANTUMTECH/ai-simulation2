/*
  # Fix Collaboration Schema

  This migration drops the existing policies and recreates them to fix the conflict.
  It also adds some missing indexes for better performance.

  1. Changes
    - Drop existing policies
    - Recreate policies with unique names
    - Add performance indexes
    - Add missing delete policies

  2. Security
    - Maintain existing RLS rules
    - Update policy names to be more specific
    - Add delete policies where missing
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create rooms" ON collaboration_rooms;
DROP POLICY IF EXISTS "Users can view active rooms they're part of" ON collaboration_rooms;
DROP POLICY IF EXISTS "Users can join rooms" ON collaboration_participants;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON collaboration_participants;
DROP POLICY IF EXISTS "Users can add whiteboard data to their rooms" ON whiteboard_data;
DROP POLICY IF EXISTS "Users can view whiteboard data in their rooms" ON whiteboard_data;
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

-- Recreate policies with unique names
CREATE POLICY "collaboration_rooms_insert_policy" 
  ON collaboration_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "collaboration_rooms_select_policy"
  ON collaboration_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_participants
      WHERE room_id = collaboration_rooms.id
      AND user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "collaboration_rooms_update_policy"
  ON collaboration_rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "collaboration_rooms_delete_policy"
  ON collaboration_rooms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "collaboration_participants_insert_policy"
  ON collaboration_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "collaboration_participants_select_policy"
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

CREATE POLICY "collaboration_participants_update_policy"
  ON collaboration_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "whiteboard_data_insert_policy"
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

CREATE POLICY "whiteboard_data_select_policy"
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

CREATE POLICY "whiteboard_data_update_policy"
  ON whiteboard_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_policy"
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

CREATE POLICY "chat_messages_select_policy"
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

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_rooms_status ON collaboration_rooms(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_rooms_created_by ON collaboration_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_room ON collaboration_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user ON collaboration_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_data_room ON whiteboard_data(room_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_data_user ON whiteboard_data(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);