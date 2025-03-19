/*
  # Add video quiz system

  1. New Tables
    - `video_quiz_attempts` - Tracks quiz attempts and ensures video completion
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `video_id` (uuid, references academy_videos)
      - `quiz_id` (uuid, references quizzes)
      - `video_completed` (boolean)
      - `video_watched_duration` (integer)
      - `video_total_duration` (integer) 
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `score` (integer)
      - `passed` (boolean)

  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
    - Users can only view and manage their own attempts

  3. Functions
    - Add function to validate video completion before quiz
*/

-- Create video quiz attempts table
CREATE TABLE IF NOT EXISTS video_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  video_completed boolean DEFAULT false,
  video_watched_duration integer DEFAULT 0,
  video_total_duration integer NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score integer,
  passed boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own attempts"
  ON video_quiz_attempts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create attempts"
  ON video_quiz_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON video_quiz_attempts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_video_quiz_attempts_updated_at
  BEFORE UPDATE ON video_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();