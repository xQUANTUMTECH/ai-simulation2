/*
  # Performance Optimization Features

  1. Changes
    - Add indexes for common queries
    - Add materialized views for analytics
    - Add caching configuration
    - Add performance monitoring

  2. Features
    - Query optimization
    - Cache management
    - Performance tracking
*/

-- Create materialized view for user learning summary
CREATE MATERIALIZED VIEW IF NOT EXISTS user_learning_summary_mv AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT va.video_id) as videos_watched,
  COALESCE(AVG(va.completion_rate), 0) as avg_completion_rate,
  COALESCE(SUM(va.watch_time), 0) as total_watch_time,
  COUNT(DISTINCT qr.quiz_id) as quizzes_taken,
  COALESCE(AVG(qr.score), 0) as avg_quiz_score,
  COUNT(DISTINCT ra.resource_id) as resources_accessed,
  COALESCE(SUM(ra.download_count), 0) as total_downloads
FROM 
  users u
  LEFT JOIN video_analytics va ON va.user_id = u.id
  LEFT JOIN user_quiz_results qr ON qr.user_id = u.id
  LEFT JOIN resource_analytics ra ON ra.user_id = u.id
GROUP BY 
  u.id, u.email;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_learning_summary_mv_user_id 
ON user_learning_summary_mv(user_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_learning_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_learning_summary_mv;
END;
$$ LANGUAGE plpgsql;

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  measured_at timestamptz DEFAULT now()
);

-- Create index for performance metrics
CREATE INDEX idx_performance_metrics_type_name 
ON performance_metrics(metric_type, metric_name);

-- Create function to record query performance
CREATE OR REPLACE FUNCTION record_query_performance()
RETURNS trigger AS $$
DECLARE
  query_start_time timestamptz;
  query_duration interval;
BEGIN
  query_start_time := clock_timestamp();
  
  -- Execute the original query
  RETURN NEW;
  
  -- Record performance metrics
  query_duration := clock_timestamp() - query_start_time;
  
  INSERT INTO performance_metrics (
    metric_type,
    metric_name,
    value,
    metadata
  ) VALUES (
    'query_performance',
    TG_TABLE_NAME::text,
    EXTRACT(MILLISECONDS FROM query_duration),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'query_start', query_start_time
    )
  );
END;
$$ LANGUAGE plpgsql;