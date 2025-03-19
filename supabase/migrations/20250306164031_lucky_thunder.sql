/*
  # Add Quiz System

  1. New Tables
    - `quizzes`: Stores quiz metadata
    - `quiz_questions`: Stores quiz questions
    - `quiz_answers`: Stores possible answers for questions
    - `user_quiz_answers`: Stores user's answers to questions
    - `user_quiz_results`: Stores overall quiz results

  2. Security
    - Enable RLS on all tables
    - Add policies for appropriate access control
    - Ensure data integrity with foreign keys

  3. Changes
    - Add quiz-related tables and relationships
    - Add necessary indexes for performance
    - Add RLS policies for security
*/

-- Create quizzes table if not exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create quiz_questions table if not exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    question text NOT NULL,
    question_type text CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN')),
    order_in_quiz integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create quiz_answers table if not exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS quiz_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer text NOT NULL,
    is_correct boolean,
    order_in_question integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create user_quiz_answers table if not exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS user_quiz_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_id uuid REFERENCES quiz_answers(id) ON DELETE CASCADE,
    open_answer text,
    is_correct boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, question_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create user_quiz_results table if not exists
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS user_quiz_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    score integer,
    passed boolean,
    completed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, quiz_id)
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create indexes if not exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
  CREATE INDEX IF NOT EXISTS idx_quizzes_video_id ON quizzes(video_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);
  CREATE INDEX IF NOT EXISTS idx_user_quiz_results_quiz_id ON user_quiz_results(quiz_id);
  CREATE INDEX IF NOT EXISTS idx_user_quiz_results_user_id ON user_quiz_results(user_id);
END $$;

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_results ENABLE ROW LEVEL SECURITY;

-- Create policies for quizzes
DO $$ BEGIN
  CREATE POLICY "quizzes_select_all"
    ON quizzes
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "quizzes_insert_admin"
    ON quizzes
    FOR INSERT
    TO public
    WITH CHECK (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create policies for quiz questions and answers
DO $$ BEGIN
  CREATE POLICY "quiz_questions_select_all"
    ON quiz_questions
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "quiz_answers_select_all"
    ON quiz_answers
    FOR SELECT
    TO public
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create policies for user quiz answers
DO $$ BEGIN
  CREATE POLICY "user_quiz_answers_insert_own"
    ON user_quiz_answers
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "user_quiz_answers_select_own"
    ON user_quiz_answers
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create policies for user quiz results
DO $$ BEGIN
  CREATE POLICY "user_quiz_results_insert_own"
    ON user_quiz_results
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "user_quiz_results_select_own"
    ON user_quiz_results
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create updated_at triggers if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quizzes_updated_at'
  ) THEN
    CREATE TRIGGER update_quizzes_updated_at
      BEFORE UPDATE ON quizzes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quiz_questions_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_questions_updated_at
      BEFORE UPDATE ON quiz_questions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_quiz_answers_updated_at'
  ) THEN
    CREATE TRIGGER update_quiz_answers_updated_at
      BEFORE UPDATE ON quiz_answers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_user_quiz_answers_updated_at'
  ) THEN
    CREATE TRIGGER update_user_quiz_answers_updated_at
      BEFORE UPDATE ON user_quiz_answers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_user_quiz_results_updated_at'
  ) THEN
    CREATE TRIGGER update_user_quiz_results_updated_at
      BEFORE UPDATE ON user_quiz_results
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;