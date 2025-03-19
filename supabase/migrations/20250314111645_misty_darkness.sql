/*
  # Advanced Features Schema

  1. AI System
    - Model configurations
    - Training jobs
    - Usage tracking
    - Performance metrics

  2. Analytics System
    - Performance metrics
    - Usage statistics
    - Query tracking
    - Report generation

  3. Security System
    - Session management
    - Login attempts tracking
    - Security events
    - Access logs

  4. Compliance System
    - Data retention
    - Consent tracking
    - Audit logging
    - Privacy controls
*/

-- Create compliance_settings table
CREATE TABLE IF NOT EXISTS compliance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_retention_days integer DEFAULT 365,
  require_privacy_consent boolean DEFAULT true,
  require_terms_acceptance boolean DEFAULT true,
  gdpr_enabled boolean DEFAULT true,
  data_export_enabled boolean DEFAULT true,
  audit_logging_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  measured_at timestamptz DEFAULT now()
);

-- Create user_consent_log table
CREATE TABLE IF NOT EXISTS user_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy', 'terms', 'marketing')),
  accepted boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consent_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can manage compliance settings"
  ON compliance_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can view all security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view own security events"
  ON security_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all metrics"
  ON performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view own consent log"
  ON user_consent_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type, metric_name);
CREATE INDEX idx_user_consent_log_user ON user_consent_log(user_id);

-- Create function to log security event
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_severity text,
  p_details jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    severity,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    p_details,
    current_setting('request.headers', true)::jsonb->>'x-real-ip',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record performance metric
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_type text,
  p_name text,
  p_value numeric,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO performance_metrics (
    metric_type,
    metric_name,
    value,
    metadata
  ) VALUES (
    p_type,
    p_name,
    p_value,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record user consent
CREATE OR REPLACE FUNCTION record_user_consent(
  p_user_id uuid,
  p_consent_type text,
  p_accepted boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_consent_log (
    user_id,
    consent_type,
    accepted,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_consent_type,
    p_accepted,
    current_setting('request.headers', true)::jsonb->>'x-real-ip',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );

  -- Update user profile
  IF p_consent_type IN ('privacy', 'terms') THEN
    UPDATE users
    SET 
      terms_accepted = p_accepted,
      terms_accepted_at = CASE WHEN p_accepted THEN now() ELSE NULL END
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
DECLARE
  retention_days integer;
BEGIN
  -- Get retention period from settings
  SELECT data_retention_days INTO retention_days
  FROM compliance_settings
  LIMIT 1;

  -- Default to 365 days if not set
  retention_days := COALESCE(retention_days, 365);

  -- Delete old data
  DELETE FROM analytics
  WHERE created_at < now() - (retention_days || ' days')::interval;

  DELETE FROM security_events
  WHERE created_at < now() - (retention_days || ' days')::interval;

  DELETE FROM performance_metrics
  WHERE measured_at < now() - (retention_days || ' days')::interval;

  -- Log cleanup
  PERFORM log_security_event(
    NULL,
    'data_cleanup',
    'low',
    jsonb_build_object(
      'retention_days', retention_days,
      'cleanup_time', now()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;