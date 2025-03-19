/*
  # Video Processing Status Tracking

  1. Changes
    - Add video processing status tracking
    - Add processing metadata
    - Add error handling
    - Add completion tracking
*/

-- Add video processing status tracking
ALTER TABLE admin_content_uploads
ADD COLUMN IF NOT EXISTS processing_metadata jsonb DEFAULT '{
  "progress": 0,
  "stage": "pending",
  "formats": [],
  "error": null,
  "started_at": null,
  "completed_at": null
}'::jsonb;

-- Create function to update video status
CREATE OR REPLACE FUNCTION update_video_status()
RETURNS trigger AS $$
BEGIN
  -- Update processing metadata
  IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{stage}',
      '"processing"'
    );
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{started_at}',
      to_jsonb(now()::text)
    );
  END IF;

  -- Handle completion
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{stage}',
      '"completed"'
    );
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{completed_at}',
      to_jsonb(now()::text)
    );
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{progress}',
      '100'
    );
  END IF;

  -- Handle errors
  IF NEW.status = 'error' AND OLD.status != 'error' THEN
    NEW.processing_metadata = jsonb_set(
      NEW.processing_metadata,
      '{stage}',
      '"error"'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER on_video_status_change
  BEFORE UPDATE ON admin_content_uploads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_video_status();

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_admin_content_uploads_status 
ON admin_content_uploads(status);

-- Add function to track processing progress
CREATE OR REPLACE FUNCTION update_processing_progress(
  upload_id uuid,
  progress integer,
  current_stage text DEFAULT NULL,
  error_message text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  metadata jsonb;
BEGIN
  -- Get current metadata
  SELECT processing_metadata INTO metadata
  FROM admin_content_uploads
  WHERE id = upload_id;

  -- Update progress
  metadata = jsonb_set(metadata, '{progress}', to_jsonb(progress));

  -- Update stage if provided
  IF current_stage IS NOT NULL THEN
    metadata = jsonb_set(metadata, '{stage}', to_jsonb(current_stage));
  END IF;

  -- Update error if provided
  IF error_message IS NOT NULL THEN
    metadata = jsonb_set(metadata, '{error}', to_jsonb(error_message));
  END IF;

  -- Update record
  UPDATE admin_content_uploads
  SET 
    processing_metadata = metadata,
    status = CASE
      WHEN error_message IS NOT NULL THEN 'error'
      WHEN progress = 100 THEN 'ready'
      ELSE status
    END,
    updated_at = now()
  WHERE id = upload_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;