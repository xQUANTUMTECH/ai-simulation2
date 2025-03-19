/*
  # Advanced Analytics System

  1. New Tables
    - `analytics_dashboards` - Custom dashboard configurations
    - `analytics_reports` - Scheduled report definitions
    - `analytics_exports` - Export job tracking
    - `analytics_metrics` - Custom metric definitions

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create analytics_dashboards table
CREATE TABLE IF NOT EXISTS analytics_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  layout jsonb NOT NULL DEFAULT '{}',
  widgets jsonb[] NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analytics_reports table
CREATE TABLE IF NOT EXISTS analytics_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  query_definition jsonb NOT NULL,
  schedule text, -- Cron expression
  last_run_at timestamptz,
  next_run_at timestamptz,
  recipients jsonb DEFAULT '[]',
  format text DEFAULT 'csv',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create analytics_exports table
CREATE TABLE IF NOT EXISTS analytics_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES analytics_reports(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  format text NOT NULL,
  file_url text,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create analytics_metrics table
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  query text NOT NULL,
  category text NOT NULL,
  refresh_interval interval,
  last_refresh_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view public dashboards"
  ON analytics_dashboards
  FOR SELECT
  USING (is_public OR auth.uid() = created_by);

CREATE POLICY "Users can manage own dashboards"
  ON analytics_dashboards
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own reports"
  ON analytics_reports
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can manage own reports"
  ON analytics_reports
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own exports"
  ON analytics_exports
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own exports"
  ON analytics_exports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view metrics"
  ON analytics_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage metrics"
  ON analytics_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Create indexes
CREATE INDEX idx_analytics_dashboards_created_by ON analytics_dashboards(created_by);
CREATE INDEX idx_analytics_reports_created_by ON analytics_reports(created_by);
CREATE INDEX idx_analytics_exports_report_id ON analytics_exports(report_id);
CREATE INDEX idx_analytics_metrics_category ON analytics_metrics(category);

-- Create updated_at triggers
CREATE TRIGGER update_analytics_dashboards_updated_at
  BEFORE UPDATE ON analytics_dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_reports_updated_at
  BEFORE UPDATE ON analytics_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_metrics_updated_at
  BEFORE UPDATE ON analytics_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();