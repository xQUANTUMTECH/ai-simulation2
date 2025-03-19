/*
  # AI Model Management System

  1. Changes
    - Add AI model configuration tables
    - Add version tracking
    - Add usage analytics
    - Add batch processing support
*/

-- Drop existing triggers if they exist
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS update_ai_model_configs_updated_at ON ai_model_configs;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  priority integer NOT NULL,
  max_tokens integer,
  temperature numeric,
  fallback_model text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  current_version_id uuid,
  training_config jsonb DEFAULT '{}',
  batch_config jsonb DEFAULT '{}'
);

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

CREATE TABLE IF NOT EXISTS ai_model_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  request_type text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  response_time integer,
  tokens_used integer,
  error_message text,
  fallback_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE ai_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "ai_model_configs_admin_policy_v2"
  ON ai_model_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "ai_model_configs_view_policy_v2"
  ON ai_model_configs
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

CREATE POLICY "ai_model_versions_admin_policy_v2"
  ON ai_model_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "ai_model_versions_view_policy_v2"
  ON ai_model_versions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "ai_model_training_jobs_admin_policy_v2"
  ON ai_model_training_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "ai_model_training_jobs_view_policy_v2"
  ON ai_model_training_jobs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "ai_batch_jobs_admin_policy_v2"
  ON ai_batch_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "ai_batch_jobs_view_policy_v2"
  ON ai_batch_jobs
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "ai_model_usage_admin_policy_v2"
  ON ai_model_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "ai_model_usage_view_policy_v2"
  ON ai_model_usage
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_versions_model_name ON ai_model_versions(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_training_jobs_model_name ON ai_model_training_jobs(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_model_name ON ai_batch_jobs(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_model_name ON ai_model_usage(model_name);

-- Create updated_at trigger
CREATE TRIGGER update_ai_model_configs_updated_at_v2
  BEFORE UPDATE ON ai_model_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default models if they don't exist
INSERT INTO ai_model_configs (
  model_name,
  priority,
  max_tokens,
  temperature,
  fallback_model
) VALUES
  ('mistral', 1, 4096, 0.7, 'mistralai/mistral-7b-instruct'),
  ('llama2', 2, 4096, 0.7, 'meta-llama/llama-2-70b-chat'),
  ('codellama', 3, 4096, 0.7, 'codellama/codellama-34b-instruct')
ON CONFLICT (model_name) DO NOTHING;