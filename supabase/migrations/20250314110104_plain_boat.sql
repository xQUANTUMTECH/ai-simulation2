/*
  # Add Thumbnail Generation System

  1. Changes
    - Add thumbnail tracking to video uploads
    - Add thumbnail generation queue
    - Add thumbnail storage configuration
    - Add thumbnail processing functions
*/

-- Add thumbnail fields to admin_content_uploads
ALTER TABLE admin_content_uploads
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS thumbnail_sizes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS thumbnail_timestamp integer;

-- Create thumbnail_jobs table
CREATE TABLE IF NOT EXISTS thumbnail_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES admin_content_uploads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  sizes integer[] DEFAULT '{120,320,640,1280}',
  format text DEFAULT 'jpeg',
  quality integer DEFAULT 80,
  time_offset integer, -- Changed from timestamp to time_offset
  error_message text,
  output_urls jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE thumbnail_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can manage thumbnail jobs" ON thumbnail_jobs;
  DROP POLICY IF EXISTS "Users can view own video thumbnails" ON thumbnail_jobs;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Admins can manage thumbnail jobs"
  ON thumbnail_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view own video thumbnails"
  ON thumbnail_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_content_uploads
      WHERE admin_content_uploads.id = thumbnail_jobs.video_id
      AND admin_content_uploads.created_by = auth.uid()
    )
  );

-- Create function to update thumbnail status
CREATE OR REPLACE FUNCTION update_thumbnail_status()
RETURNS trigger AS $$
BEGIN
  -- Update video record when thumbnail is ready
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE admin_content_uploads
    SET 
      thumbnail_url = NEW.output_urls->>'320',
      thumbnail_sizes = NEW.output_urls,
      thumbnail_timestamp = NEW.time_offset,
      updated_at = now()
    WHERE id = NEW.video_id;
  END IF;

  -- Update video record when thumbnail fails
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE admin_content_uploads
    SET 
      status = 'error',
      metadata = jsonb_set(
        metadata,
        '{error}',
        to_jsonb('Thumbnail generation failed: ' || COALESCE(NEW.error_message, 'Unknown error'))
      ),
      updated_at = now()
    WHERE id = NEW.video_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thumbnail status updates
CREATE TRIGGER on_thumbnail_status_change
  AFTER UPDATE ON thumbnail_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_thumbnail_status();

-- Create indexes
CREATE INDEX idx_thumbnail_jobs_video_id ON thumbnail_jobs(video_id);
CREATE INDEX idx_thumbnail_jobs_status ON thumbnail_jobs(status);

-- Create function to queue thumbnail generation
CREATE OR REPLACE FUNCTION queue_thumbnail_generation(
  video_id uuid,
  time_offset integer DEFAULT NULL, -- Changed from timestamp to time_offset
  sizes integer[] DEFAULT NULL,
  format text DEFAULT NULL,
  quality integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  job_id uuid;
BEGIN
  INSERT INTO thumbnail_jobs (
    video_id,
    time_offset, -- Changed from timestamp to time_offset
    sizes,
    format,
    quality
  ) VALUES (
    video_id,
    COALESCE(time_offset, 0), -- Changed from timestamp to time_offset
    COALESCE(sizes, '{120,320,640,1280}'::integer[]),
    COALESCE(format, 'jpeg'),
    COALESCE(quality, 80)
  )
  RETURNING id INTO job_id;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;