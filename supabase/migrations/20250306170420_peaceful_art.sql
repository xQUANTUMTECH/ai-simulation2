/*
  # Quiz System Implementation

  1. New Tables
    - `quiz_templates` - Template di quiz riutilizzabili
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `category` (text)
      - `difficulty` (text)
      - `created_by` (uuid)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quiz_template_questions` - Domande associate ai template
      - `id` (uuid, primary key)
      - `template_id` (uuid)
      - `question` (text)
      - `type` (text)
      - `options` (jsonb)
      - `correct_answer` (text)
      - `explanation` (text)
      - `points` (integer)
      - `order` (integer)

  2. Security
    - Enable RLS su tutte le tabelle
    - Policies per:
      - Lettura pubblica dei template pubblicati
      - Creazione/modifica solo per admin
      - Accesso completo per il creatore

  3. Changes
    - Aggiunta campi per tracking e analytics
    - Supporto per diversi tipi di domande
    - Sistema di punteggio flessibile
*/

-- Quiz Templates
CREATE TABLE IF NOT EXISTS quiz_templates (
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

-- Quiz Template Questions
CREATE TABLE IF NOT EXISTS quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'open_text', 'matching')),
  options jsonb,
  correct_answer text,
  explanation text,
  points integer DEFAULT 1,
  "order" integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Instances (quando un template viene assegnato)
CREATE TABLE IF NOT EXISTS quiz_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quiz_templates(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  time_limit integer, -- in minutes
  passing_score integer DEFAULT 70,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES quiz_instances(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score integer,
  passed boolean,
  answers jsonb,
  feedback jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

-- Enable RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for quiz_templates
CREATE POLICY "Quiz templates are viewable by everyone" 
  ON quiz_templates
  FOR SELECT 
  USING (status = 'published' OR auth.uid() = created_by);

CREATE POLICY "Only admins can create quiz templates" 
  ON quiz_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can update quiz templates" 
  ON quiz_templates
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

-- Policies for quiz_template_questions
CREATE POLICY "Questions are viewable with template" 
  ON quiz_template_questions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM quiz_templates
      WHERE quiz_templates.id = template_id
      AND (quiz_templates.status = 'published' OR quiz_templates.created_by = auth.uid())
    )
  );

CREATE POLICY "Only admins can manage questions" 
  ON quiz_template_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Policies for quiz_instances
CREATE POLICY "Quiz instances are viewable by participants" 
  ON quiz_instances
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
      AND (
        courses.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_progress
          WHERE user_progress.course_id = courses.id
          AND user_progress.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Only admins can manage quiz instances" 
  ON quiz_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Policies for quiz_attempts
CREATE POLICY "Users can view own attempts" 
  ON quiz_attempts
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own attempts" 
  ON quiz_attempts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attempts" 
  ON quiz_attempts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_quiz_templates_updated_at
  BEFORE UPDATE ON quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_template_questions_updated_at
  BEFORE UPDATE ON quiz_template_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_instances_updated_at
  BEFORE UPDATE ON quiz_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_attempts_updated_at
  BEFORE UPDATE ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();