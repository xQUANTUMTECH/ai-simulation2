/*
  # Avatar System Implementation

  1. New Tables
    - `avatar_templates`
      - Base templates for AI avatars with predefined characteristics
    - `avatar_instances`
      - Specific instances of avatars used in simulations
    - `avatar_behaviors`
      - Behavior patterns and responses for avatars
    - `avatar_interactions`
      - History of avatar interactions and responses

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for admin users

  3. Changes
    - Add avatar-related fields to existing tables
    - Add behavior tracking capabilities
*/

-- Avatar Templates
CREATE TABLE IF NOT EXISTS avatar_templates (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Avatar Instances
CREATE TABLE IF NOT EXISTS avatar_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES avatar_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  current_simulation uuid REFERENCES simulations(id) ON DELETE SET NULL,
  learning_data jsonb DEFAULT '{}',
  interaction_count integer DEFAULT 0,
  last_active timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT avatar_instances_status_check CHECK (status IN ('active', 'inactive', 'learning', 'error'))
);

-- Avatar Behaviors
CREATE TABLE IF NOT EXISTS avatar_behaviors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id uuid REFERENCES avatar_instances(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_condition jsonb,
  response_type text NOT NULL,
  response_data jsonb,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT avatar_behaviors_trigger_type_check CHECK (
    trigger_type IN ('event', 'state', 'interaction', 'time', 'condition')
  ),
  CONSTRAINT avatar_behaviors_response_type_check CHECK (
    response_type IN ('speech', 'action', 'emotion', 'decision')
  )
);

-- Avatar Interactions
CREATE TABLE IF NOT EXISTS avatar_interactions (
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT avatar_interactions_type_check CHECK (
    interaction_type IN ('dialogue', 'action', 'decision', 'observation')
  )
);

-- Enable RLS
ALTER TABLE avatar_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for avatar_templates
CREATE POLICY "Users can view all templates"
  ON avatar_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create templates"
  ON avatar_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update own templates"
  ON avatar_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
    AND created_by = auth.uid()
  );

-- Policies for avatar_instances
CREATE POLICY "Users can view own instances"
  ON avatar_instances
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create instances"
  ON avatar_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own instances"
  ON avatar_instances
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policies for avatar_behaviors
CREATE POLICY "Users can view behaviors of own avatars"
  ON avatar_behaviors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avatar_instances
      WHERE avatar_instances.id = avatar_behaviors.avatar_id
      AND avatar_instances.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage behaviors of own avatars"
  ON avatar_behaviors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avatar_instances
      WHERE avatar_instances.id = avatar_behaviors.avatar_id
      AND avatar_instances.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM avatar_instances
      WHERE avatar_instances.id = avatar_behaviors.avatar_id
      AND avatar_instances.created_by = auth.uid()
    )
  );

-- Policies for avatar_interactions
CREATE POLICY "Users can view interactions of own avatars"
  ON avatar_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM avatar_instances
      WHERE avatar_instances.id = avatar_interactions.avatar_id
      AND avatar_instances.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create interactions with avatars"
  ON avatar_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM avatar_instances
      WHERE avatar_instances.id = avatar_interactions.avatar_id
      AND avatar_instances.current_simulation IS NOT NULL
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_avatar_templates_updated_at
  BEFORE UPDATE ON avatar_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avatar_instances_updated_at
  BEFORE UPDATE ON avatar_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avatar_behaviors_updated_at
  BEFORE UPDATE ON avatar_behaviors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_avatar_templates_role ON avatar_templates(role);
CREATE INDEX idx_avatar_instances_template ON avatar_instances(template_id);
CREATE INDEX idx_avatar_instances_simulation ON avatar_instances(current_simulation);
CREATE INDEX idx_avatar_behaviors_avatar ON avatar_behaviors(avatar_id);
CREATE INDEX idx_avatar_interactions_avatar ON avatar_interactions(avatar_id);
CREATE INDEX idx_avatar_interactions_simulation ON avatar_interactions(simulation_id);