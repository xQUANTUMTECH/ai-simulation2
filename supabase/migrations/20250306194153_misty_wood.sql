/*
  # Course enrollment and progress tracking
  
  1. New Tables
    - course_enrollments: Tracks user enrollment in courses
    - course_progress: Tracks individual resource progress
  
  2. Indexes
    - Optimized queries for user and course lookups
    - Progress tracking optimization
  
  3. Security
    - RLS enabled on all tables
    - Policies for user access control
    
  4. Triggers
    - Automatic progress calculation
    - Updated timestamp management
*/

-- Create course_enrollments table if not exists
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

-- Create course_progress table if not exists
CREATE TABLE IF NOT EXISTS public.course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.course_resources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed timestamptz DEFAULT now(),
  completion_time integer DEFAULT 0, -- in seconds
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, resource_id)
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_enrollment ON public.course_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_resource ON public.course_progress(resource_id);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can enroll in courses" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can update own enrollment" ON public.course_enrollments;
  DROP POLICY IF EXISTS "Users can view own progress" ON public.course_progress;
  DROP POLICY IF EXISTS "Users can update own progress" ON public.course_progress;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies for course_enrollments
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollment" ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for course_progress
CREATE POLICY "Users can view own progress" ON public.course_progress
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.id = course_progress.enrollment_id
    AND course_enrollments.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own progress" ON public.course_progress
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.id = course_progress.enrollment_id
    AND course_enrollments.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.id = course_progress.enrollment_id
    AND course_enrollments.user_id = auth.uid()
  ));

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_enrollment_progress();

-- Create function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_resources INTEGER;
  completed_resources INTEGER;
  new_progress INTEGER;
BEGIN
  -- Get total number of resources
  SELECT COUNT(*) INTO total_resources
  FROM public.course_resources cr
  JOIN public.course_sections cs ON cs.id = cr.section_id
  WHERE cs.course_id = (
    SELECT course_id FROM public.course_enrollments WHERE id = NEW.enrollment_id
  );

  -- Get completed resources
  SELECT COUNT(*) INTO completed_resources
  FROM public.course_progress cp
  WHERE cp.enrollment_id = NEW.enrollment_id
  AND cp.status = 'completed';

  -- Calculate new progress
  IF total_resources > 0 THEN
    new_progress := (completed_resources * 100) / total_resources;
  ELSE
    new_progress := 0;
  END IF;

  -- Update enrollment progress
  UPDATE public.course_enrollments
  SET 
    progress = new_progress,
    status = CASE 
      WHEN new_progress = 100 THEN 'completed'
      ELSE 'active'
    END,
    completed_at = CASE 
      WHEN new_progress = 100 THEN now()
      ELSE null
    END,
    updated_at = now()
  WHERE id = NEW.enrollment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_enrollment_progress_trigger ON public.course_progress;
DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON public.course_enrollments;
DROP TRIGGER IF EXISTS update_course_progress_updated_at ON public.course_progress;

-- Create trigger for progress updates
CREATE TRIGGER update_enrollment_progress_trigger
AFTER INSERT OR UPDATE ON public.course_progress
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_progress();

-- Create triggers for updated_at
CREATE TRIGGER update_course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();