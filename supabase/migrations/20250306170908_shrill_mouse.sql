/*
  # Course Management Schema

  1. New Tables
    - `course_enrollments`: Gestisce le iscrizioni ai corsi
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `course_id` (uuid, foreign key) 
      - `status` (text): stato iscrizione
      - `enrolled_at` (timestamp)
      - `completed_at` (timestamp)
      - `progress` (integer): percentuale completamento
      
    - `course_sections`: Organizzazione contenuti del corso
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `order` (integer)
      
    - `course_resources`: Risorse del corso
      - `id` (uuid, primary key)
      - `section_id` (uuid, foreign key)
      - `title` (text)
      - `type` (text): tipo risorsa
      - `url` (text)
      - `order` (integer)
      
  2. Security
    - Enable RLS su tutte le tabelle
    - Policies per gestione accessi
    
  3. Changes
    - Aggiunta campi a `courses` per info base
*/

-- Aggiunta campi a courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites text[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS objectives text[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience text[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_duration interval;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 50;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_start_date timestamptz;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS enrollment_end_date timestamptz;

-- Course Enrollments
CREATE TABLE course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'dropped')),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);

-- Course Sections
CREATE TABLE course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_in_course integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_course_sections_course ON course_sections(course_id);

-- Course Resources
CREATE TABLE course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('video', 'document', 'quiz', 'link')),
  url text,
  order_in_section integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_course_resources_section ON course_resources(section_id);

-- Enable RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_resources ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment progress"
  ON course_enrollments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Course sections are viewable by enrolled users"
  ON course_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_sections.course_id
      AND course_enrollments.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_sections.course_id
      AND courses.created_by = auth.uid()
    )
  );

CREATE POLICY "Course resources are viewable by enrolled users"
  ON course_resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN course_sections cs ON cs.course_id = ce.course_id
      WHERE cs.id = course_resources.section_id
      AND ce.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = course_resources.section_id
      AND c.created_by = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_sections_updated_at
  BEFORE UPDATE ON course_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_resources_updated_at
  BEFORE UPDATE ON course_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();