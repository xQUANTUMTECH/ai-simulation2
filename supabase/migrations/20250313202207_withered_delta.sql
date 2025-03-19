-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view public dashboards" ON analytics_dashboards;
  DROP POLICY IF EXISTS "Users can manage own dashboards" ON analytics_dashboards;
  DROP POLICY IF EXISTS "Users can view own reports" ON analytics_reports;
  DROP POLICY IF EXISTS "Users can manage own reports" ON analytics_reports;
  DROP POLICY IF EXISTS "Users can view own exports" ON analytics_exports;
  DROP POLICY IF EXISTS "Users can create own exports" ON analytics_exports;
  DROP POLICY IF EXISTS "Users can view metrics" ON analytics_metrics;
  DROP POLICY IF EXISTS "Admins can manage metrics" ON analytics_metrics;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create analytics_dashboards table if not exists
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

-- Create analytics_reports table if not exists
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

-- Create analytics_exports table if not exists
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

-- Create analytics_metrics table if not exists
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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_dashboards' 
    AND policyname = 'analytics_dashboards_view_policy'
  ) THEN
    CREATE POLICY "analytics_dashboards_view_policy"
      ON analytics_dashboards
      FOR SELECT
      USING (is_public OR auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_dashboards' 
    AND policyname = 'analytics_dashboards_manage_policy'
  ) THEN
    CREATE POLICY "analytics_dashboards_manage_policy"
      ON analytics_dashboards
      FOR ALL
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_reports' 
    AND policyname = 'analytics_reports_view_policy'
  ) THEN
    CREATE POLICY "analytics_reports_view_policy"
      ON analytics_reports
      FOR SELECT
      USING (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_reports' 
    AND policyname = 'analytics_reports_manage_policy'
  ) THEN
    CREATE POLICY "analytics_reports_manage_policy"
      ON analytics_reports
      FOR ALL
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_exports' 
    AND policyname = 'analytics_exports_view_policy'
  ) THEN
    CREATE POLICY "analytics_exports_view_policy"
      ON analytics_exports
      FOR SELECT
      USING (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_exports' 
    AND policyname = 'analytics_exports_insert_policy'
  ) THEN
    CREATE POLICY "analytics_exports_insert_policy"
      ON analytics_exports
      FOR INSERT
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_metrics' 
    AND policyname = 'analytics_metrics_view_policy'
  ) THEN
    CREATE POLICY "analytics_metrics_view_policy"
      ON analytics_metrics
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analytics_metrics' 
    AND policyname = 'analytics_metrics_manage_policy'
  ) THEN
    CREATE POLICY "analytics_metrics_manage_policy"
      ON analytics_metrics
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_dashboards_created_by ON analytics_dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_created_by ON analytics_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_report_id ON analytics_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_category ON analytics_metrics(category);

-- Create updated_at triggers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_analytics_dashboards_updated_at'
  ) THEN
    CREATE TRIGGER update_analytics_dashboards_updated_at
      BEFORE UPDATE ON analytics_dashboards
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_analytics_reports_updated_at'
  ) THEN
    CREATE TRIGGER update_analytics_reports_updated_at
      BEFORE UPDATE ON analytics_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_analytics_metrics_updated_at'
  ) THEN
    CREATE TRIGGER update_analytics_metrics_updated_at
      BEFORE UPDATE ON analytics_metrics
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;