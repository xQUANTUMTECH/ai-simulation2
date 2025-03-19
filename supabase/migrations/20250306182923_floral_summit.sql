/*
  # Quiz System Schema

  1. Tables
    - quiz_templates: Base templates for quizzes
    - quiz_template_questions: Questions for quiz templates
    - quiz_instances: Actual quiz instances from templates
    - quiz_attempts: User attempts at quizzes
    - quiz_analytics: Analytics data for quiz performance

  2. Security
    - RLS enabled on all tables
    - Policies for admin management and user access
    - Secure data access patterns

  3. Changes
    - Initial quiz system schema creation
    - RLS policies for all tables
    - Update triggers for timestamp management
*/

-- Check and create tables
DO $$ 
BEGIN
  -- Quiz Templates
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_templates') THEN
    CREATE TABLE quiz_templates (
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

    ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Quiz Template Questions
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_template_questions') THEN
    CREATE TABLE quiz_template_questions (
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

    ALTER TABLE quiz_template_questions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Quiz Instances
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_instances') THEN
    CREATE TABLE quiz_instances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid REFERENCES quiz_templates(id) ON DELETE SET NULL,
      course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
      start_date timestamptz,
      end_date timestamptz,
      time_limit integer,
      passing_score integer DEFAULT 70,
      created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    ALTER TABLE quiz_instances ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Quiz Attempts
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_attempts') THEN
    CREATE TABLE quiz_attempts (
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

    ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Quiz Analytics
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quiz_analytics') THEN
    CREATE TABLE quiz_analytics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quiz_id uuid REFERENCES quiz_instances(id) ON DELETE CASCADE,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      total_attempts integer DEFAULT 0,
      average_score numeric(5,2),
      best_score integer,
      completion_time integer,
      difficulty_rating numeric(3,2),
      engagement_metrics jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(quiz_id, user_id)
    );

    ALTER TABLE quiz_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create triggers if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quiz_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_templates_updated_at
      BEFORE UPDATE ON quiz_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quiz_template_questions_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_template_questions_updated_at
      BEFORE UPDATE ON quiz_template_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quiz_instances_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_instances_updated_at
      BEFORE UPDATE ON quiz_instances
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quiz_attempts_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_attempts_updated_at
      BEFORE UPDATE ON quiz_attempts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_quiz_analytics_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_analytics_updated_at
      BEFORE UPDATE ON quiz_analytics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Only admins can create quiz templates" ON quiz_templates;
  DROP POLICY IF EXISTS "Only admins can update quiz templates" ON quiz_templates;
  DROP POLICY IF EXISTS "Quiz templates are viewable by everyone" ON quiz_templates;
  DROP POLICY IF EXISTS "Only admins can manage questions" ON quiz_template_questions;
  DROP POLICY IF EXISTS "Questions are viewable with template" ON quiz_template_questions;
  DROP POLICY IF EXISTS "Only admins can manage quiz instances" ON quiz_instances;
  DROP POLICY IF EXISTS "Quiz instances are viewable by participants" ON quiz_instances;
  DROP POLICY IF EXISTS "Users can create own attempts" ON quiz_attempts;
  DROP POLICY IF EXISTS "Users can update own attempts" ON quiz_attempts;
  DROP POLICY IF EXISTS "Users can view own attempts" ON quiz_attempts;
  DROP POLICY IF EXISTS "Users can view own analytics" ON quiz_analytics;
  DROP POLICY IF EXISTS "Admins can view all analytics" ON quiz_analytics;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
DO $$
BEGIN
  -- Quiz Templates Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can create quiz templates') THEN
    CREATE POLICY "Only admins can create quiz templates" ON quiz_templates
      FOR INSERT TO public
      WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can update quiz templates') THEN
    CREATE POLICY "Only admins can update quiz templates" ON quiz_templates
      FOR UPDATE TO public
      USING (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quiz templates are viewable by everyone') THEN
    CREATE POLICY "Quiz templates are viewable by everyone" ON quiz_templates
      FOR SELECT TO public
      USING ((status = 'published') OR (auth.uid() = created_by));
  END IF;

  -- Quiz Template Questions Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage questions') THEN
    CREATE POLICY "Only admins can manage questions" ON quiz_template_questions
      FOR ALL TO public
      USING (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Questions are viewable with template') THEN
    CREATE POLICY "Questions are viewable with template" ON quiz_template_questions
      FOR SELECT TO public
      USING (EXISTS (
        SELECT 1 FROM quiz_templates
        WHERE quiz_templates.id = quiz_template_questions.template_id
        AND (quiz_templates.status = 'published' OR quiz_templates.created_by = auth.uid())
      ));
  END IF;

  -- Quiz Instances Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can manage quiz instances') THEN
    CREATE POLICY "Only admins can manage quiz instances" ON quiz_instances
      FOR ALL TO public
      USING (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Quiz instances are viewable by participants') THEN
    CREATE POLICY "Quiz instances are viewable by participants" ON quiz_instances
      FOR SELECT TO public
      USING (EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = quiz_instances.course_id
        AND (
          courses.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM user_progress
            WHERE user_progress.course_id = courses.id
            AND user_progress.user_id = auth.uid()
          )
        )
      ));
  END IF;

  -- Quiz Attempts Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own attempts') THEN
    CREATE POLICY "Users can create own attempts" ON quiz_attempts
      FOR INSERT TO public
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own attempts') THEN
    CREATE POLICY "Users can update own attempts" ON quiz_attempts
      FOR UPDATE TO public
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own attempts') THEN
    CREATE POLICY "Users can view own attempts" ON quiz_attempts
      FOR SELECT TO public
      USING (user_id = auth.uid());
  END IF;

  -- Quiz Analytics Policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own analytics') THEN
    CREATE POLICY "Users can view own analytics" ON quiz_analytics
      FOR SELECT TO public
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all analytics') THEN
    CREATE POLICY "Admins can view all analytics" ON quiz_analytics
      FOR SELECT TO public
      USING (EXISTS (
        SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'ADMIN'
      ));
  END IF;
END $$;
