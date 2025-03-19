/*
  # Update Video Management Schema

  1. New Tables
    - video_sections: Organizes videos within courses
    - video_resources: Stores video attachments
    - video_knowledge_base: Stores text content for AI quiz generation

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
    - Add policies for public viewing
*/

-- Create video_sections table
CREATE TABLE IF NOT EXISTS video_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create video_resources table
CREATE TABLE IF NOT EXISTS video_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create video_knowledge_base table
CREATE TABLE IF NOT EXISTS video_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  content_text text NOT NULL,
  processed_content jsonb,
  keywords text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to course_sections
ALTER TABLE course_sections 
ADD COLUMN IF NOT EXISTS video_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_duration interval,
ADD COLUMN IF NOT EXISTS completion_required boolean DEFAULT true;

-- Enable RLS
ALTER TABLE video_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies for video_sections
CREATE POLICY "Admins can manage video sections"
  ON video_sections
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Public can view video sections"
  ON video_sections
  FOR SELECT
  TO public
  USING (true);

-- Create policies for video_resources
CREATE POLICY "Admins can manage video resources"
  ON video_resources
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Public can view video resources"
  ON video_resources
  FOR SELECT
  TO public
  USING (true);

-- Create policies for video_knowledge_base
CREATE POLICY "Admins can manage knowledge base"
  ON video_knowledge_base
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_video_sections_course ON video_sections(course_id);
CREATE INDEX idx_video_resources_video ON video_resources(video_id);
CREATE INDEX idx_video_knowledge_base_video ON video_knowledge_base(video_id);

-- Create triggers
CREATE TRIGGER update_video_sections_updated_at
  BEFORE UPDATE ON video_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_resources_updated_at
  BEFORE UPDATE ON video_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_knowledge_base_updated_at
  BEFORE UPDATE ON video_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update section video counts
CREATE OR REPLACE FUNCTION update_section_video_count()
RETURNS trigger AS $$
BEGIN
  UPDATE course_sections
  SET 
    video_count = (
      SELECT COUNT(*) 
      FROM videos 
      WHERE course_id = NEW.course_id
    ),
    total_duration = (
      SELECT SUM(duration * interval '1 second')
      FROM videos
      WHERE course_id = NEW.course_id
    ),
    updated_at = now()
  WHERE id = NEW.section_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for video count updates
CREATE TRIGGER update_section_stats_on_video_change
  AFTER INSERT OR DELETE OR UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_section_video_count();