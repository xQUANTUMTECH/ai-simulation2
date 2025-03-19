/*
  # Academy Tables Creation

  1. New Tables
    - `academy_courses`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `status` (text: draft/published)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `academy_videos`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references academy_courses)
      - `title` (text)
      - `description` (text)
      - `url` (text)
      - `duration` (integer)
      - `order` (integer)
      - `transcript` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `academy_documents`
      - `id` (uuid, primary key)
      - `video_id` (uuid, references academy_videos)
      - `title` (text)
      - `description` (text)
      - `file_url` (text)
      - `content_text` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `academy_video_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `video_id` (uuid, references academy_videos)
      - `progress` (integer)
      - `completed` (boolean)
      - `last_position` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create academy_courses table
CREATE TABLE IF NOT EXISTS academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create academy_videos table
CREATE TABLE IF NOT EXISTS academy_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  duration integer,
  "order" integer,
  transcript text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create academy_documents table
CREATE TABLE IF NOT EXISTS academy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  content_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create academy_video_progress table
CREATE TABLE IF NOT EXISTS academy_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  last_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_video_progress ENABLE ROW LEVEL SECURITY;

-- Policies for academy_courses
CREATE POLICY "Anyone can view published courses"
  ON academy_courses
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage courses"
  ON academy_courses
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policies for academy_videos
CREATE POLICY "Anyone can view videos of published courses"
  ON academy_videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_courses
      WHERE academy_courses.id = course_id
      AND academy_courses.status = 'published'
    )
  );

-- Policies for academy_documents
CREATE POLICY "Anyone can view documents of published courses"
  ON academy_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM academy_videos
      JOIN academy_courses ON academy_courses.id = academy_videos.course_id
      WHERE academy_videos.id = video_id
      AND academy_courses.status = 'published'
    )
  );

-- Policies for academy_video_progress
CREATE POLICY "Users can manage their own progress"
  ON academy_video_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);