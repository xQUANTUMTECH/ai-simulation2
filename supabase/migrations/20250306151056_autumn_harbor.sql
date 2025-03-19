/*
  # Academy Training Schema

  1. New Tables
    - `academy_courses`: Corsi formativi
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `created_by` (uuid)
      - `status` (enum: draft, published)
      - Timestamps

    - `academy_videos`: Video formativi
      - `id` (uuid, primary key)
      - `course_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `url` (text)
      - `duration` (integer)
      - `order` (integer)
      - `transcript` (text)
      - Timestamps

    - `academy_documents`: Documenti correlati ai video
      - `id` (uuid, primary key)
      - `video_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `file_url` (text)
      - `content_text` (text)
      - Timestamps

    - `academy_video_progress`: Progressi utente
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `video_id` (uuid)
      - `progress` (integer)
      - `completed` (boolean)
      - `last_position` (integer)
      - Timestamps

  2. Security
    - Enable RLS su tutte le tabelle
    - Policies per lettura/scrittura basate su ruoli utente
*/

-- Courses
CREATE TABLE academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT academy_courses_status_check 
    CHECK (status IN ('draft', 'published'))
);

ALTER TABLE academy_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are viewable by everyone"
  ON academy_courses
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert courses"
  ON academy_courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can update courses"
  ON academy_courses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Videos
CREATE TABLE academy_videos (
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

ALTER TABLE academy_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON academy_videos
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert videos"
  ON academy_videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Documents
CREATE TABLE academy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  content_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE academy_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are viewable by everyone"
  ON academy_documents
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert documents"
  ON academy_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Video Progress
CREATE TABLE academy_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  last_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT progress_range CHECK (progress >= 0 AND progress <= 100)
);

ALTER TABLE academy_video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON academy_video_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON academy_video_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON academy_video_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_academy_videos_course_id ON academy_videos(course_id);
CREATE INDEX idx_academy_documents_video_id ON academy_documents(video_id);
CREATE INDEX idx_academy_video_progress_user_id ON academy_video_progress(user_id);
CREATE INDEX idx_academy_video_progress_video_id ON academy_video_progress(video_id);

-- Updated triggers
CREATE TRIGGER update_academy_courses_updated_at
  BEFORE UPDATE ON academy_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_videos_updated_at
  BEFORE UPDATE ON academy_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_documents_updated_at
  BEFORE UPDATE ON academy_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_video_progress_updated_at
  BEFORE UPDATE ON academy_video_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();