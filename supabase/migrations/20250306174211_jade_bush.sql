/*
  # AI Model Tracking Schema

  1. New Tables
    - `ai_model_usage`
      - Tracks usage of different AI models
      - Records performance metrics
      - Stores error rates and fallback instances
    - `ai_model_configs`
      - Stores model configurations
      - Manages fallback settings
      - Defines model preferences

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- AI Model Usage Table
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

-- AI Model Configurations
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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_configs ENABLE ROW LEVEL SECURITY;

-- Policies for ai_model_usage
CREATE POLICY "Admins can view all usage"
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

CREATE POLICY "Users can view own usage"
  ON ai_model_usage
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Policies for ai_model_configs
CREATE POLICY "Admins can manage configs"
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

CREATE POLICY "Everyone can view enabled models"
  ON ai_model_configs
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- Insert default configurations
INSERT INTO ai_model_configs 
  (model_name, priority, max_tokens, temperature, fallback_model)
VALUES
  ('mistral', 1, 4096, 0.7, 'mistralai/mistral-7b-instruct'),
  ('llama2', 2, 4096, 0.7, 'meta-llama/llama-2-70b-chat'),
  ('codellama', 3, 4096, 0.7, 'codellama/codellama-34b-instruct');

-- Add updated_at trigger
CREATE TRIGGER update_ai_model_configs_updated_at
  BEFORE UPDATE ON ai_model_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();