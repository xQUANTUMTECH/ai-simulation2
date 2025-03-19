/*
  # Testing and QA Features

  1. New Tables
    - `test_cases`: Store test case definitions
    - `test_runs`: Track test execution
    - `test_results`: Store test results
    - `test_coverage`: Track test coverage

  2. Changes
    - Add test tracking
    - Add coverage reporting
    - Add quality metrics
*/

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  test_type text NOT NULL,
  test_suite text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  prerequisites text[],
  steps jsonb NOT NULL,
  expected_results jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test_runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid REFERENCES test_cases(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'failed', 'blocked')),
  environment text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  executed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  execution_time interval,
  error_message text,
  screenshots text[],
  created_at timestamptz DEFAULT now()
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  actual_result jsonb,
  error_message text,
  screenshot_url text,
  created_at timestamptz DEFAULT now()
);

-- Create test_coverage table
CREATE TABLE IF NOT EXISTS test_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  coverage_type text NOT NULL,
  coverage_percentage numeric NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  uncovered_items jsonb,
  last_updated timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_coverage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view test cases"
  ON test_cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test cases"
  ON test_cases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view test runs"
  ON test_runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test runs"
  ON test_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view test results"
  ON test_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test results"
  ON test_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view test coverage"
  ON test_coverage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage test coverage"
  ON test_coverage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_test_cases_suite ON test_cases(test_suite);
CREATE INDEX idx_test_runs_case_id ON test_runs(test_case_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_results_run_id ON test_results(test_run_id);
CREATE INDEX idx_test_coverage_entity ON test_coverage(entity_type, entity_id);

-- Create triggers
CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate test coverage
CREATE OR REPLACE FUNCTION calculate_test_coverage(
  entity_type text,
  entity_id uuid
)
RETURNS numeric AS $$
DECLARE
  total_items integer;
  covered_items integer;
  coverage numeric;
BEGIN
  -- This is a placeholder function that would be implemented
  -- based on specific coverage calculation requirements
  RETURN 0;
END;
$$ LANGUAGE plpgsql;