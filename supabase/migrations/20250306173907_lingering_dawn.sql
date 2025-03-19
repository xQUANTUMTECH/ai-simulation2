/*
  # Learning Analytics and Adaptive Quiz System

  1. New Tables
    - `learning_analytics`
      - Tracks user performance on quizzes
      - Stores topic mastery levels
      - Records learning patterns
      - Identifies areas needing review
    
    - `review_recommendations`
      - Stores AI-generated review suggestions
      - Links to relevant learning materials
      - Tracks recommendation effectiveness

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Admins can view aggregated analytics
*/

-- Learning Analytics Table
CREATE TABLE IF NOT EXISTS learning_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  subtopic text,
  mastery_level integer CHECK (mastery_level BETWEEN 0 AND 100),
  correct_answers integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  last_quiz_date timestamptz,
  next_review_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Review Recommendations Table
CREATE TABLE IF NOT EXISTS review_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_id uuid REFERENCES learning_analytics(id) ON DELETE CASCADE,
  recommendation_type text CHECK (recommendation_type IN ('quiz', 'review', 'practice')),
  priority integer CHECK (priority BETWEEN 1 AND 5),
  content text NOT NULL,
  resources jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  effectiveness integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own learning analytics"
  ON learning_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own learning analytics"
  ON learning_analytics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations"
  ON review_recommendations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON review_recommendations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_learning_analytics_user_topic ON learning_analytics(user_id, topic);
CREATE INDEX idx_learning_analytics_mastery ON learning_analytics(mastery_level);
CREATE INDEX idx_review_recommendations_user ON review_recommendations(user_id);
CREATE INDEX idx_review_recommendations_status ON review_recommendations(status);

-- Update Triggers
CREATE TRIGGER update_learning_analytics_updated_at
  BEFORE UPDATE ON learning_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();