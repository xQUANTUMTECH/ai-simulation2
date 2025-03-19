/*
  # Add Advanced AI Model Features

  1. New Tables
    - `ai_model_versions`
      - Tracks different versions of AI models
      - Stores performance metrics and training data
    - `ai_model_training_jobs`
      - Manages custom training jobs
      - Tracks training progress and results
    - `ai_batch_jobs`
      - Handles batch processing requests
      - Tracks job status and results

  2. Changes
    - Add new columns to `ai_model_configs`
      - `version_id` reference to current model version
      - `training_config` for custom training settings
      - `batch_config` for batch processing settings

  3. Security
    - Enable RLS on new tables
    - Add policies for admin access
*/

-- Create ai_model_versions table
CREATE TABLE IF NOT EXISTS ai_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL REFERENCES ai_model_configs(model_name),
  version_number text NOT NULL,
  training_data jsonb DEFAULT '{}',
  performance_metrics jsonb DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;

-- Create ai_model_training_jobs table
CREATE TABLE IF NOT EXISTS ai_model_training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL REFERENCES ai_model_configs(model_name),
  status text NOT NULL CHECK (status IN ('pending', 'training', 'completed', 'failed')),
  training_config jsonb NOT NULL DEFAULT '{}',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result_metrics jsonb DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE ai_model_training_jobs ENABLE ROW LEVEL SECURITY;

-- Create ai_batch_jobs table
CREATE TABLE IF NOT EXISTS ai_batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL REFERENCES ai_model_configs(model_name),
  job_type text NOT NULL CHECK (job_type IN ('document_analysis', 'quiz_generation', 'content_recommendation')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  input_data jsonb NOT NULL,
  output_data jsonb,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message text,
  priority integer DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE ai_batch_jobs ENABLE ROW LEVEL SECURITY;

-- Add new columns to ai_model_configs
ALTER TABLE ai_model_configs 
ADD COLUMN IF NOT EXISTS current_version_id uuid REFERENCES ai_model_versions(id),
ADD COLUMN IF NOT EXISTS training_config jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS batch_config jsonb DEFAULT '{}';

-- Create policies for ai_model_versions
CREATE POLICY "Admins can manage model versions"
  ON ai_model_versions
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ));

CREATE POLICY "Everyone can view active model versions"
  ON ai_model_versions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create policies for ai_model_training_jobs
CREATE POLICY "Admins can manage training jobs"
  ON ai_model_training_jobs
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ));

CREATE POLICY "Users can view own training jobs"
  ON ai_model_training_jobs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Create policies for ai_batch_jobs
CREATE POLICY "Admins can manage batch jobs"
  ON ai_batch_jobs
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN'
  ));

CREATE POLICY "Users can view own batch jobs"
  ON ai_batch_jobs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());
