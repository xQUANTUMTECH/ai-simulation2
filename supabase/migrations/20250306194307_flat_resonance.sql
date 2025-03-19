/*
  # Course Enrollment and Progress System

  1. New Tables
    - course_enrollments: Tracks student enrollment in courses
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - course_id (uuid, references courses)
      - status (text: pending, active, completed, dropped)
      - progress (integer 0-100)
      - timestamps (enrolled_at, completed_at, created_at, updated_at)
    
    - course_progress: Tracks individual resource completion
      - id (uuid, primary key)
      - enrollment_id (uuid, references course_enrollments)
      - resource_id (uuid)
      - status (text: not_started, in_progress, completed)
      - progress (integer 0-100)
      - completion_time (integer, seconds)
      - timestamps (last_accessed, created_at, updated_at)

  2. Security
    - RLS enabled on both tables
    - Policies for user access control
    - Users can only access their own enrollments and progress

  3. Performance
    - Indexes on frequently queried columns
    - Optimized for enrollment and progress lookups
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can enroll in courses" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can update own enrollment progress" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can update own progress" ON public.course_progress;
  DROP POLICY IF EXISTS "Users can view own progress" ON public.course_progress;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Course Enrollments Table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'dropped')),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Course Progress Table
CREATE TABLE IF NOT EXISTS public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed timestamptz DEFAULT now(),
  completion_time integer DEFAULT 0, -- Time spent in seconds
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_enrollment ON public.course_progress(enrollment_id);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Enrollment Policies
CREATE POLICY "Users can enroll in courses" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment progress" ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Progress Policies
CREATE POLICY "Users can update own progress" ON public.course_progress
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.id = course_progress.enrollment_id
    AND ce.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.id = course_progress.enrollment_id
    AND ce.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own progress" ON public.course_progress
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    WHERE ce.id = course_progress.enrollment_id
    AND ce.user_id = auth.uid()
  ));

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON public.course_enrollments;
DROP TRIGGER IF EXISTS update_course_progress_updated_at ON public.course_progress;

-- Triggers
CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();