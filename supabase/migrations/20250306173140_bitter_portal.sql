/*
  # Add quiz generation system

  1. New Tables
    - `quiz_templates` - Stores quiz templates generated from documents
    - `quiz_template_questions` - Stores questions for quiz templates
    - `quiz_instances` - Stores quiz instances for specific courses/videos
    - `quiz_attempts` - Stores user quiz attempts and results

  2. Security
    - Enable RLS on all tables
    - Tables will use existing policies
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

-- Quiz Instances
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