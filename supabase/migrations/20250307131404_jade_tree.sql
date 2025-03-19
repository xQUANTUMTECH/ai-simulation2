/*
  # Enable RLS and Add Security Policies

  1. Changes
    - Enable RLS on tables that have policies but RLS disabled
    - Add missing RLS policies for proper access control
    - Fix user_learning_summary view to use correct quiz metrics

  2. Tables Modified
    - ai_conversations
    - ai_messages
    - courses
    - user_progress
    - user_settings
    - videos
    - analytics
    - ai_prompts

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Fix user_learning_summary view
*/

-- Enable RLS on tables
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Fix user_learning_summary view to use correct quiz metrics
CREATE OR REPLACE VIEW public.user_learning_summary AS
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
  public.users u
  LEFT JOIN public.video_analytics va ON va.user_id = u.id
  LEFT JOIN public.user_quiz_results qr ON qr.user_id = u.id
  LEFT JOIN public.resource_analytics ra ON ra.user_id = u.id
GROUP BY 
  u.id, u.email;

-- Add or update policies for ai_conversations
CREATE POLICY "Users can view own conversations" ON public.ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Add or update policies for ai_messages
CREATE POLICY "Users can view own messages" ON public.ai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
      AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON public.ai_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
      AND ac.user_id = auth.uid()
    )
  );

-- Add or update policies for courses
CREATE POLICY "Anyone can view published courses" ON public.courses
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Add or update policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Add or update policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Add or update policies for videos
CREATE POLICY "Anyone can view videos" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage videos" ON public.videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Add or update policies for analytics
CREATE POLICY "Users can view own analytics" ON public.analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" ON public.analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add or update policies for ai_prompts
CREATE POLICY "Anyone can view prompts" ON public.ai_prompts
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage prompts" ON public.ai_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );