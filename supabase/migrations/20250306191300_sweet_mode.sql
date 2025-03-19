/*
  # Admin Content Management System

  1. New Tables
    - `admin_content_uploads`
      - Tracks video and document uploads
      - Stores metadata and processing status
      - Handles versioning and access control
    
    - `admin_quiz_templates`
      - Stores quiz templates for reuse
      - Manages question banks
      - Tracks quiz usage and performance

  2. Security
    - Enable RLS on all tables
    - Only ADMIN users can access these tables
    - Strict access control policies

  3. Changes
    - Added triggers for updated_at columns
    - Added indexes for performance
*/

-- Admin Content Uploads Table
CREATE TABLE IF NOT EXISTS public.admin_content_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('video', 'document', 'presentation')),
  file_size integer,
  mime_type text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Templates Table
CREATE TABLE IF NOT EXISTS public.admin_quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Template Questions Table
CREATE TABLE IF NOT EXISTS public.admin_quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES admin_quiz_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'open_text', 'matching')),
  options jsonb,
  correct_answer text,
  explanation text,
  points integer DEFAULT 1,
  order_number integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_content_uploads_type ON admin_content_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_admin_content_uploads_status ON admin_content_uploads(status);
CREATE INDEX IF NOT EXISTS idx_admin_quiz_templates_category ON admin_quiz_templates(category);
CREATE INDEX IF NOT EXISTS idx_admin_quiz_templates_status ON admin_quiz_templates(status);

-- Enable RLS
ALTER TABLE admin_content_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_quiz_template_questions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for content uploads
CREATE POLICY "Only admins can insert content" ON admin_content_uploads
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ));

CREATE POLICY "Only admins can update content" ON admin_content_uploads
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ));

CREATE POLICY "Only admins can manage quiz templates" ON admin_quiz_templates
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ));

CREATE POLICY "Only admins can manage quiz questions" ON admin_quiz_template_questions
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  ));

-- Triggers
CREATE TRIGGER update_admin_content_uploads_updated_at
  BEFORE UPDATE ON admin_content_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_quiz_templates_updated_at
  BEFORE UPDATE ON admin_quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_quiz_template_questions_updated_at
  BEFORE UPDATE ON admin_quiz_template_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();