/*
  # Video Processing System

  1. Tables
    - video_formats: Stores video format configurations
    - video_processing_jobs: Tracks video processing tasks

  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Drop existing tables if they exist
DO $$ 
BEGIN
  DROP TABLE IF EXISTS video_processing_jobs;
  DROP TABLE IF EXISTS video_formats;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create video_formats table
CREATE TABLE IF NOT EXISTS video_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  codec text NOT NULL,
  container text NOT NULL,
  resolution text NOT NULL,
  bitrate integer NOT NULL,
  fps integer NOT NULL,
  quality_preset text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT video_formats_quality_preset_check 
    CHECK (quality_preset IN ('low', 'medium', 'high', 'ultra'))
);

-- Create video_processing_jobs table
CREATE TABLE IF NOT EXISTS video_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES admin_content_uploads(id) ON DELETE CASCADE,
  format_id uuid REFERENCES video_formats(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  progress integer DEFAULT 0,
  output_url text,
  error_message text,
  processing_settings jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT video_processing_jobs_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT video_processing_jobs_progress_check 
    CHECK (progress >= 0 AND progress <= 100)
);

-- Enable RLS
ALTER TABLE video_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can manage video formats" ON video_formats;
  DROP POLICY IF EXISTS "Anyone can view video formats" ON video_formats;
  DROP POLICY IF EXISTS "Admins can manage processing jobs" ON video_processing_jobs;
  DROP POLICY IF EXISTS "Users can view own video processing jobs" ON video_processing_jobs;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_formats' 
    AND policyname = 'Admins can manage video formats'
  ) THEN
    CREATE POLICY "Admins can manage video formats"
      ON video_formats
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'ADMIN'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_formats' 
    AND policyname = 'Anyone can view video formats'
  ) THEN
    CREATE POLICY "Anyone can view video formats"
      ON video_formats
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_processing_jobs' 
    AND policyname = 'Admins can manage processing jobs'
  ) THEN
    CREATE POLICY "Admins can manage processing jobs"
      ON video_processing_jobs
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'ADMIN'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'video_processing_jobs' 
    AND policyname = 'Users can view own video processing jobs'
  ) THEN
    CREATE POLICY "Users can view own video processing jobs"
      ON video_processing_jobs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admin_content_uploads
          WHERE admin_content_uploads.id = video_processing_jobs.video_id
          AND admin_content_uploads.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_video_id 
  ON video_processing_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status 
  ON video_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_formats_quality_preset 
  ON video_formats(quality_preset);

-- Create triggers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_video_formats_updated_at'
  ) THEN
    CREATE TRIGGER update_video_formats_updated_at
      BEFORE UPDATE ON video_formats
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_video_processing_jobs_updated_at'
  ) THEN
    CREATE TRIGGER update_video_processing_jobs_updated_at
      BEFORE UPDATE ON video_processing_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default video formats if not exist
INSERT INTO video_formats 
  (name, description, codec, container, resolution, bitrate, fps, quality_preset, is_default)
SELECT
  '720p', 'HD Ready', 'h264', 'mp4', '1280x720', 2500000, 30, 'medium', true
WHERE NOT EXISTS (
  SELECT 1 FROM video_formats WHERE name = '720p'
);

INSERT INTO video_formats 
  (name, description, codec, container, resolution, bitrate, fps, quality_preset, is_default)
SELECT
  '1080p', 'Full HD', 'h264', 'mp4', '1920x1080', 5000000, 30, 'high', false
WHERE NOT EXISTS (
  SELECT 1 FROM video_formats WHERE name = '1080p'
);

INSERT INTO video_formats 
  (name, description, codec, container, resolution, bitrate, fps, quality_preset, is_default)
SELECT
  '480p', 'SD', 'h264', 'mp4', '854x480', 1000000, 30, 'low', false
WHERE NOT EXISTS (
  SELECT 1 FROM video_formats WHERE name = '480p'
);

INSERT INTO video_formats 
  (name, description, codec, container, resolution, bitrate, fps, quality_preset, is_default)
SELECT
  '1440p', '2K', 'h264', 'mp4', '2560x1440', 8000000, 30, 'ultra', false
WHERE NOT EXISTS (
  SELECT 1 FROM video_formats WHERE name = '1440p'
);