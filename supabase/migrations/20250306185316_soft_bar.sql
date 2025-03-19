/*
  # Analytics System Implementation

  1. New Tables
    - `video_analytics`: Tracks video viewing statistics and completion rates
    - `quiz_analytics`: Stores quiz performance metrics
    - `learning_time_analytics`: Tracks time spent on different learning activities
    - `resource_analytics`: Monitors resource usage patterns

  2. Security
    - RLS enabled on all tables
    - User-specific access policies
    - Data privacy controls

  3. Features
    - Automatic tracking triggers
    - Progress aggregation views
    - Performance analysis functions
*/

-- Video Analytics Table
CREATE TABLE IF NOT EXISTS video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  watch_time integer DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 0,
  last_position integer DEFAULT 0,
  play_count integer DEFAULT 0,
  pause_count integer DEFAULT 0,
  seek_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video analytics"
  ON video_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own video analytics"
  ON video_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quiz Analytics Table
CREATE TABLE IF NOT EXISTS quiz_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  attempt_count integer DEFAULT 0,
  best_score numeric(5,2) DEFAULT 0,
  average_score numeric(5,2) DEFAULT 0,
  completion_time integer DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

ALTER TABLE quiz_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz analytics"
  ON quiz_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz analytics"
  ON quiz_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Learning Time Analytics Table
CREATE TABLE IF NOT EXISTS learning_time_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_time integer DEFAULT 0,
  video_time integer DEFAULT 0,
  quiz_time integer DEFAULT 0,
  resource_time integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE learning_time_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning time"
  ON learning_time_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own learning time"
  ON learning_time_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Resource Usage Analytics Table
CREATE TABLE IF NOT EXISTS resource_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_accessed timestamptz,
  total_time integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE resource_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resource analytics"
  ON resource_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own resource analytics"
  ON resource_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update Triggers
CREATE OR REPLACE FUNCTION update_video_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO video_analytics (user_id, video_id)
  VALUES (NEW.user_id, NEW.video_id)
  ON CONFLICT (user_id, video_id) DO UPDATE
  SET 
    watch_time = video_analytics.watch_time + 
      LEAST(NEW.last_position - COALESCE(OLD.last_position, 0), 30),
    completion_rate = LEAST(
      (video_analytics.watch_time + 
        LEAST(NEW.last_position - COALESCE(OLD.last_position, 0), 30)
      )::numeric / 
      (SELECT duration FROM videos WHERE id = NEW.video_id) * 100,
      100
    ),
    last_position = NEW.last_position,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_video_analytics_on_progress
  AFTER INSERT OR UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_video_analytics();

-- Analytics Views
CREATE OR REPLACE VIEW user_learning_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT va.video_id) as videos_watched,
  ROUND(AVG(va.completion_rate), 2) as avg_completion_rate,
  SUM(va.watch_time) as total_watch_time,
  COUNT(DISTINCT qa.quiz_id) as quizzes_taken,
  ROUND(AVG(qa.average_score), 2) as avg_quiz_score,
  COUNT(DISTINCT ra.resource_id) as resources_accessed,
  SUM(ra.download_count) as total_downloads
FROM 
  users u
  LEFT JOIN video_analytics va ON u.id = va.user_id
  LEFT JOIN quiz_analytics qa ON u.id = qa.user_id
  LEFT JOIN resource_analytics ra ON u.id = ra.user_id
GROUP BY 
  u.id, u.email;

-- Function to get user progress summary
CREATE OR REPLACE FUNCTION get_user_progress_summary(user_uuid uuid)
RETURNS TABLE (
  metric text,
  value numeric,
  change_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH last_week AS (
    SELECT 
      SUM(total_time) as total_time,
      SUM(video_time) as video_time,
      COUNT(DISTINCT date) as active_days
    FROM learning_time_analytics
    WHERE 
      user_id = user_uuid AND
      date >= CURRENT_DATE - INTERVAL '7 days'
  ),
  previous_week AS (
    SELECT 
      SUM(total_time) as total_time,
      SUM(video_time) as video_time,
      COUNT(DISTINCT date) as active_days
    FROM learning_time_analytics
    WHERE 
      user_id = user_uuid AND
      date >= CURRENT_DATE - INTERVAL '14 days' AND
      date < CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT 
    metric,
    current_value as value,
    ROUND(((current_value - previous_value) / NULLIF(previous_value, 0) * 100), 2) as change_percentage
  FROM (
    VALUES 
      ('Total Learning Time', 
        (SELECT total_time FROM last_week), 
        (SELECT total_time FROM previous_week)),
      ('Video Watch Time',
        (SELECT video_time FROM last_week),
        (SELECT video_time FROM previous_week)),
      ('Active Days',
        (SELECT active_days FROM last_week),
        (SELECT active_days FROM previous_week))
  ) as stats(metric, current_value, previous_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;