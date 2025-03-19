/*
  # Video Processing System

  1. New Tables
    - `video_processing_jobs`
      - Tracks video transcoding jobs
      - Manages processing queue
      - Stores processing settings and results
    
    - `video_formats`
      - Stores available video formats
      - Quality presets
      - Encoding settings

  2. Security
    - Enable RLS
    - Admin-only access for job management
    - User access for status checking

  3. Features
    - Multi-format transcoding
    - Quality presets
    - Progress tracking
    - Error handling
*/

-- Create video_formats table
CREATE TABLE video_formats (
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
CREATE TABLE video_processing_jobs (
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

-- Create policies
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

CREATE POLICY "Anyone can view video formats"
  ON video_formats
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Create indexes
CREATE INDEX idx_video_processing_jobs_video_id 
  ON video_processing_jobs(video_id);
CREATE INDEX idx_video_processing_jobs_status 
  ON video_processing_jobs(status);
CREATE INDEX idx_video_formats_quality_preset 
  ON video_formats(quality_preset);

-- Create triggers
CREATE TRIGGER update_video_formats_updated_at
  BEFORE UPDATE ON video_formats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_processing_jobs_updated_at
  BEFORE UPDATE ON video_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default video formats
INSERT INTO video_formats 
  (name, description, codec, container, resolution, bitrate, fps, quality_preset, is_default)
VALUES
  ('720p', 'HD Ready', 'h264', 'mp4', '1280x720', 2500000, 30, 'medium', true),
  ('1080p', 'Full HD', 'h264', 'mp4', '1920x1080', 5000000, 30, 'high', false),
  ('480p', 'SD', 'h264', 'mp4', '854x480', 1000000, 30, 'low', false),
  ('1440p', '2K', 'h264', 'mp4', '2560x1440', 8000000, 30, 'ultra', false);