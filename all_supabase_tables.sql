-- Tabelle estratte da migrazioni Supabase
-- Convertite per SQLite

-- Tabella: academy_courses
CREATE TABLE academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT academy_courses_status_check 
    CHECK (status IN ('draft', 'published'))
);

-- Tabella: academy_documents
CREATE TABLE academy_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  content_text text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: academy_video_progress
CREATE TABLE academy_video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  last_position integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT progress_range CHECK (progress >= 0 AND progress <= 100)
);

-- Tabella: academy_videos
CREATE TABLE academy_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  duration integer,
  "order" integer,
  transcript text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: activities
CREATE TABLE  activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('user', 'course', 'video', 'document', 'certificate', 'alert', 'admin', 'system')),
  message TEXT NOT NULL,
  details TEXT DEFAULT '{}'::jsonb,
  user_id TEXT REFERENCES auth.users(id) ON DELETE SET NULL,
  related_id TEXT, -- ID generico relativo all'elemento coinvolto
  importance TEXT NOT NULL CHECK (importance IN ('low', 'medium', 'high')),
  created_at DATETIMETZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: activity_reads
CREATE TABLE  activity_reads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
  read INTEGER NOT NULL DEFAULT false,
  read_at DATETIMETZ,
  UNIQUE(activity_id, user_id)
);

-- Tabella: admin_audit_log
CREATE TABLE  admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: admin_content_uploads
CREATE TABLE  admin_content_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('video', 'document', 'presentation')),
  file_size integer,
  mime_type text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata jsonb DEFAULT '{}'::jsonb,
  version integer DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: admin_permissions
CREATE TABLE  admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: admin_quiz_template_questions
CREATE TABLE  admin_quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES admin_quiz_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'open_text', 'matching')),
  options jsonb,
  correct_answer text,
  explanation text,
  points integer DEFAULT 1,
  order_number integer,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: admin_quiz_templates
CREATE TABLE  admin_quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: ai_batch_jobs
CREATE TABLE  ai_batch_jobs (
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
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabella: ai_model_configs
CREATE TABLE  ai_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  priority integer NOT NULL,
  max_tokens integer,
  temperature numeric,
  fallback_model text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabella: ai_model_training_jobs
CREATE TABLE  ai_model_training_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL REFERENCES ai_model_configs(model_name),
  status text NOT NULL CHECK (status IN ('pending', 'training', 'completed', 'failed')),
  training_config jsonb NOT NULL DEFAULT '{}',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result_metrics jsonb DEFAULT '{}',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabella: ai_model_usage
CREATE TABLE  ai_model_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  request_type text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  response_time integer,
  tokens_used integer,
  error_message text,
  fallback_used boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabella: ai_model_versions
CREATE TABLE  ai_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL REFERENCES ai_model_configs(model_name),
  version_number text NOT NULL,
  training_data jsonb DEFAULT '{}',
  performance_metrics jsonb DEFAULT '{}',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabella: analysis_metrics
CREATE TABLE  analysis_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('communication', 'clinical', 'technical', 'leadership')),
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: analytics_dashboards
CREATE TABLE  analytics_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  layout jsonb NOT NULL DEFAULT '{}',
  widgets jsonb[] NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: analytics_exports
CREATE TABLE  analytics_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES analytics_reports(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  format text NOT NULL,
  file_url text,
  error_message text,
  started_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: analytics_metrics
CREATE TABLE  analytics_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  query text NOT NULL,
  category text NOT NULL,
  refresh_interval interval,
  last_refresh_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: analytics_reports
CREATE TABLE  analytics_reports (
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
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: audio_zones
CREATE TABLE audio_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb NOT NULL DEFAULT '{
    "volume": 1.0,
    "radius": 50,
    "falloff": "linear"
  }',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT audio_zones_type_check CHECK (
    type IN ('ambient', 'conversation', 'presentation')
  )
);

-- Tabella: auth_sessions
CREATE TABLE  auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info jsonb,
  ip_address text,
  last_active timestamptz DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz,
  is_valid boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: auth_settings
CREATE TABLE  auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  redirect_urls text[] DEFAULT ARRAY[]::text[],
  email_templates jsonb DEFAULT '{}'::jsonb,
  security_settings jsonb DEFAULT '{
    "minimum_password_length": 8,
    "require_email_confirmation": true,
    "allow_multiple_sessions": true,
    "session_expiry_days": 30,
    "max_failed_attempts": 5,
    "lockout_duration_minutes": 30
  }'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: avatar_behaviors
CREATE TABLE  avatar_behaviors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id uuid REFERENCES avatar_instances(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_condition jsonb,
  response_type text NOT NULL,
  response_data jsonb,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT avatar_behaviors_trigger_type_check CHECK (
    trigger_type IN ('event', 'state', 'interaction', 'time', 'condition')
  ),
  CONSTRAINT avatar_behaviors_response_type_check CHECK (
    response_type IN ('speech', 'action', 'emotion', 'decision')
  )
);

-- Tabella: avatar_instances
CREATE TABLE  avatar_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES avatar_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  current_simulation uuid REFERENCES simulations(id) ON DELETE SET NULL,
  learning_data jsonb DEFAULT '{}',
  interaction_count integer DEFAULT 0,
  last_active timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT avatar_instances_status_check CHECK (status IN ('active', 'inactive', 'learning', 'error'))
);

-- Tabella: avatar_interactions
CREATE TABLE  avatar_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id uuid REFERENCES avatar_instances(id) ON DELETE CASCADE,
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  input text,
  response text,
  context jsonb,
  metrics jsonb DEFAULT '{
    "accuracy": null,
    "appropriateness": null,
    "timing": null
  }'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT avatar_interactions_type_check CHECK (
    interaction_type IN ('dialogue', 'action', 'decision', 'observation')
  )
);

-- Tabella: avatar_templates
CREATE TABLE  avatar_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  specialization text,
  personality jsonb DEFAULT '{
    "openness": 0.5,
    "conscientiousness": 0.5,
    "extraversion": 0.5,
    "agreeableness": 0.5,
    "neuroticism": 0.5
  }'::jsonb,
  capabilities text[] DEFAULT '{}',
  base_prompt text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: certificates
CREATE TABLE  certificates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    template_html TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: chat_messages
CREATE TABLE  chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'file', 'system')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: collaboration_participants
CREATE TABLE  collaboration_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('host', 'participant', 'observer')),
  joined_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  left_at timestamptz,
  UNIQUE(room_id, user_id)
);

-- Tabella: collaboration_rooms
CREATE TABLE  collaboration_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('whiteboard', 'chat', 'video')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  ended_at timestamptz
);

-- Tabella: compliance_settings
CREATE TABLE  compliance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_retention_days integer DEFAULT 365,
  require_privacy_consent boolean DEFAULT true,
  require_terms_acceptance boolean DEFAULT true,
  gdpr_enabled boolean DEFAULT true,
  data_export_enabled boolean DEFAULT true,
  audit_logging_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: conversation_records
CREATE TABLE conversation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  emotion text,
  timestamp timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}',
  
  CONSTRAINT conversation_records_emotion_check CHECK (
    emotion IN ('neutral', 'happy', 'sad', 'angry')
  )
);

-- Tabella: course_enrollments
CREATE TABLE course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'dropped')),
  enrolled_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, course_id)
);

-- Tabella: course_progress
CREATE TABLE  course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES course_enrollments(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES course_resources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  last_accessed timestamptz DEFAULT CURRENT_TIMESTAMP,
  completion_time integer DEFAULT 0, -- in seconds
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(enrollment_id, resource_id)
);

-- Tabella: course_resources
CREATE TABLE course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('video', 'document', 'quiz', 'link')),
  url text,
  order_in_section integer NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: course_sections
CREATE TABLE course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_in_course integer NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: document_avatars
CREATE TABLE  document_avatars (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    avatar_id TEXT REFERENCES avatars(id) ON DELETE CASCADE,
    relationship_type TEXT,
    metadata TEXT DEFAULT '{}'::jsonb,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: document_scenarios
CREATE TABLE  document_scenarios (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    scenario_id TEXT REFERENCES scenarios(id) ON DELETE CASCADE,
    relationship_type TEXT,
    metadata TEXT DEFAULT '{}'::jsonb,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: documents
CREATE TABLE  documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size bigint NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing',
  metadata jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: failed_login_attempts
CREATE TABLE  failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  attempt_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  attempt_count integer DEFAULT 1
);

-- Tabella: interaction_events
CREATE TABLE  interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: learning_analytics
CREATE TABLE  learning_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  subtopic text,
  mastery_level integer CHECK (mastery_level BETWEEN 0 AND 100),
  correct_answers integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  last_quiz_date timestamptz,
  next_review_date timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: learning_time_analytics
CREATE TABLE  learning_time_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_time integer DEFAULT 0,
  video_time integer DEFAULT 0,
  quiz_time integer DEFAULT 0,
  resource_time integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Tabella: notifications
CREATE TABLE  notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  notification_type text CHECK (notification_type IN ('COURSE', 'QUIZ', 'CERTIFICATE', 'SYSTEM')),
  related_id uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: password_reset_tokens
CREATE TABLE  password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: performance_metrics
CREATE TABLE  performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  measured_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: quiz_analytics
CREATE TABLE quiz_analytics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      quiz_id uuid REFERENCES quiz_instances(id) ON DELETE CASCADE,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      total_attempts integer DEFAULT 0,
      average_score numeric(5,2),
      best_score integer,
      completion_time integer,
      difficulty_rating numeric(3,2),
      engagement_metrics jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(quiz_id, user_id)
    );

-- Tabella: quiz_answers
CREATE TABLE  quiz_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer text NOT NULL,
    is_correct boolean,
    order_in_question integer,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
  );

-- Tabella: quiz_attempts
CREATE TABLE  quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES quiz_instances(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,
  score integer,
  passed boolean,
  answers jsonb,
  feedback jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instance_id, user_id)
);

-- Tabella: quiz_instances
CREATE TABLE  quiz_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quiz_templates(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  time_limit integer, -- in minutes
  passing_score integer DEFAULT 70,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: quiz_questions
CREATE TABLE  quiz_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    question text NOT NULL,
    question_type text CHECK (question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN')),
    order_in_quiz integer,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
  );

-- Tabella: quiz_results
CREATE TABLE  quiz_results (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id TEXT REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    time_spent INTEGER, -- in seconds
    completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    answers TEXT DEFAULT '[]'::jsonb,
    feedback TEXT DEFAULT '{}'::jsonb,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: quiz_template_questions
CREATE TABLE  quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'open_text', 'matching')),
  options jsonb,
  correct_answer text,
  explanation text,
  points integer DEFAULT 1,
  "order" integer,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: quiz_templates
CREATE TABLE  quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: quizzes
CREATE TABLE  quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
    video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
  );

-- Tabella: recording_segments
CREATE TABLE  recording_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES recordings(id) ON DELETE CASCADE,
  start_time bigint NOT NULL,
  end_time bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('video', 'audio', 'screen', 'events')),
  file_path text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: recordings
CREATE TABLE  recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time timestamptz,
  duration integer,
  size integer,
  status text NOT NULL CHECK (status IN ('recording', 'processing', 'ready', 'error')),
  metadata jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: resource_analytics
CREATE TABLE  resource_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  last_accessed timestamptz,
  total_time integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resource_id)
);

-- Tabella: review_recommendations
CREATE TABLE  review_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_id uuid REFERENCES learning_analytics(id) ON DELETE CASCADE,
  recommendation_type text CHECK (recommendation_type IN ('quiz', 'review', 'practice')),
  priority integer CHECK (priority BETWEEN 1 AND 5),
  content text NOT NULL,
  resources jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  effectiveness integer,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz
);

-- Tabella: role_assignment_requests
CREATE TABLE  role_assignment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('USER', 'ADMIN')),
  previous_role text NOT NULL CHECK (previous_role IN ('USER', 'ADMIN')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: role_assignments
CREATE TABLE  role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_role text NOT NULL CHECK (assigned_role IN ('USER', 'ADMIN')),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz,
  reason text,
  metadata jsonb DEFAULT '{}'
);

-- Tabella: role_hierarchy
CREATE TABLE  role_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role text NOT NULL CHECK (parent_role IN ('USER', 'ADMIN')),
  child_role text NOT NULL CHECK (child_role IN ('USER', 'ADMIN')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_role, child_role),
  CHECK (parent_role != child_role)
);

-- Tabella: role_permissions
CREATE TABLE  role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('USER', 'ADMIN')), -- Reference roles directly
  permission_id uuid REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_id)
);

-- Tabella: security_events
CREATE TABLE  security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: simulation_metrics
CREATE TABLE  simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES simulation_participants(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('communication', 'decision_making', 'technical_skill')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  feedback text,
  recorded_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: simulation_notes
CREATE TABLE  simulation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id uuid NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('observation', 'feedback', 'action')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: simulation_participants
CREATE TABLE  simulation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('observer', 'participant', 'instructor')),
  joined_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  left_at timestamptz,
  UNIQUE(simulation_id, user_id)
);

-- Tabella: simulations
CREATE TABLE  simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('medical', 'emergency', 'surgical')),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: system_alerts
CREATE TABLE  system_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  message TEXT NOT NULL,
  details TEXT DEFAULT '{}'::jsonb,
  category TEXT NOT NULL CHECK (
    category IN (
      'system', 'security', 'performance', 'storage', 'network',
      'application', 'database', 'user', 'content', 'ai'
    )
  ),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at DATETIMETZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIMETZ,
  resolved_by TEXT REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_resolve INTEGER NOT NULL DEFAULT false,
  resolve_by DATETIMETZ, -- Data di scadenza per la risoluzione automatica
  assigned_to TEXT REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT -- Origine dell'avviso (servizio, componente, etc.)
);

-- Tabella: test_cases
CREATE TABLE  test_cases (
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
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: test_coverage
CREATE TABLE  test_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  coverage_type text NOT NULL,
  coverage_percentage numeric NOT NULL CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  uncovered_items jsonb,
  last_updated timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: test_results
CREATE TABLE  test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid REFERENCES test_runs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  actual_result jsonb,
  error_message text,
  screenshot_url text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: test_runs
CREATE TABLE  test_runs (
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
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: thumbnail_jobs
CREATE TABLE  thumbnail_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES admin_content_uploads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  sizes integer[] DEFAULT '{120,320,640,1280}',
  format text DEFAULT 'jpeg',
  quality integer DEFAULT 80,
  time_offset integer, -- Changed from timestamp to time_offset
  error_message text,
  output_urls jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: ui_components
CREATE TABLE  ui_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  component_type text NOT NULL,
  default_config jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: ui_layouts
CREATE TABLE  ui_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  layout_config jsonb NOT NULL,
  component_config jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: ui_themes
CREATE TABLE  ui_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  colors jsonb NOT NULL,
  typography jsonb NOT NULL,
  spacing jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: user_certificates
CREATE TABLE  user_certificates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_id TEXT REFERENCES certificates(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
    completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    score INTEGER,
    metadata TEXT DEFAULT '{}'::jsonb,
    certificate_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: user_consent_log
CREATE TABLE  user_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy', 'terms', 'marketing')),
  accepted boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: user_preferences
CREATE TABLE  user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  layout_config jsonb DEFAULT '{}',
  accessibility_settings jsonb DEFAULT '{}',
  sidebar_collapsed boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Tabella: user_quiz_answers
CREATE TABLE  user_quiz_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_id uuid REFERENCES quiz_answers(id) ON DELETE CASCADE,
    open_answer text,
    is_correct boolean,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
  );

-- Tabella: user_quiz_results
CREATE TABLE  user_quiz_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
    score integer,
    passed boolean,
    completed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quiz_id)
  );

-- Tabella: user_settings
CREATE TABLE  user_settings (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications INTEGER DEFAULT true,
    language TEXT DEFAULT 'it',
    theme TEXT DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: users
CREATE TABLE  users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text NOT NULL,
  full_name text,
  department text,
  role text NOT NULL DEFAULT 'USER'::text CHECK (role IN ('USER', 'ADMIN')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  last_active timestamptz DEFAULT CURRENT_TIMESTAMP,
  email_verified boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  terms_accepted_at timestamptz,
  profile_picture text,
  last_login timestamptz,
  session_data jsonb,
  account_status text DEFAULT 'active'::text CHECK (account_status IN ('active', 'suspended', 'deleted')),
  failed_login_count integer DEFAULT 0,
  locked_until timestamptz,
  last_password_change timestamptz,
  force_password_change boolean DEFAULT false,
  account_deletion_requested boolean DEFAULT false,
  account_deletion_requested_at timestamptz
);

-- Tabella: video_analytics
CREATE TABLE  video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  watch_time integer DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 0,
  last_position integer DEFAULT 0,
  play_count integer DEFAULT 0,
  pause_count integer DEFAULT 0,
  seek_count integer DEFAULT 0,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id)
);

-- Tabella: video_formats
CREATE TABLE video_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  codec text NOT NULL,
  container text NOT NULL,
  resolution text NOT NULL,
  bitrate integer NOT NULL,
  fps integer NOT NULL,
  quality_preset text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT video_formats_quality_preset_check 
    CHECK (quality_preset IN ('low', 'medium', 'high', 'ultra'))
);

-- Tabella: video_knowledge_base
CREATE TABLE  video_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  content_text text NOT NULL,
  processed_content jsonb,
  keywords text[],
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: video_processing_jobs
CREATE TABLE video_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES admin_content_uploads(id) ON DELETE CASCADE,
  format_id uuid REFERENCES video_formats(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  progress integer DEFAULT 0,
  output_url text,
  error_message text,
  processing_settings jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT video_processing_jobs_status_check 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT video_processing_jobs_progress_check 
    CHECK (progress >= 0 AND progress <= 100)
);

-- Tabella: video_quiz_attempts
CREATE TABLE  video_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES academy_videos(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE,
  video_completed boolean DEFAULT false,
  video_watched_duration integer DEFAULT 0,
  video_total_duration integer NOT NULL,
  started_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,
  score integer,
  passed boolean,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: video_resources
CREATE TABLE  video_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: video_sections
CREATE TABLE  video_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_number integer NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: virtual_rooms
CREATE TABLE  virtual_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('web', 'unreal')),
  status text NOT NULL CHECK (status IN ('waiting', 'active', 'ended')),
  max_participants integer NOT NULL DEFAULT 10,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: voice_profiles
CREATE TABLE voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{
    "pitch": 1.0,
    "rate": 1.0,
    "volume": 1.0,
    "voice": null
  }',
  emotion_settings jsonb NOT NULL DEFAULT '{
    "happy": {"pitch": 1.1, "rate": 1.1},
    "sad": {"pitch": 0.9, "rate": 0.9},
    "angry": {"pitch": 1.2, "rate": 1.2},
    "neutral": {"pitch": 1.0, "rate": 1.0}
  }',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: web_room_participants
CREATE TABLE web_room_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position jsonb DEFAULT '{"x": 0, "y": 0}',
  status text NOT NULL DEFAULT 'active',
  media_state jsonb DEFAULT '{"audio": false, "video": false}',
  joined_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  left_at timestamptz,
  
  CONSTRAINT web_room_participants_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT web_room_participants_unique UNIQUE (room_id, user_id)
);

-- Tabella: web_room_zones
CREATE TABLE web_room_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES web_rooms(id) ON DELETE CASCADE,
  type text NOT NULL,
  position jsonb NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT web_room_zones_type_check CHECK (type IN ('presentation', 'discussion', 'quiet'))
);

-- Tabella: web_rooms
CREATE TABLE web_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  layout jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  max_participants integer NOT NULL DEFAULT 50,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT web_rooms_status_check CHECK (status IN ('active', 'inactive'))
);

-- Tabella: whiteboard_cursors
CREATE TABLE  whiteboard_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0}',
  last_updated timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);

-- Tabella: whiteboard_data
CREATE TABLE  whiteboard_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('path', 'shape', 'text', 'image')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: whiteboard_elements
CREATE TABLE  whiteboard_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES collaboration_rooms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('path', 'shape', 'text', 'image')),
  data jsonb NOT NULL DEFAULT '{}',
  position jsonb NOT NULL DEFAULT '{"x": 0, "y": 0}',
  style jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

