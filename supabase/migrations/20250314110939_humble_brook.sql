/*
  # UI/UX Improvement Features

  1. New Tables
    - `user_preferences`: Store user UI preferences
    - `ui_themes`: Custom theme definitions
    - `ui_layouts`: Custom layout configurations
    - `ui_components`: Reusable component settings

  2. Changes
    - Add user preference tracking
    - Add theme management
    - Add layout customization
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  layout_config jsonb DEFAULT '{}',
  accessibility_settings jsonb DEFAULT '{}',
  sidebar_collapsed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create ui_themes table
CREATE TABLE IF NOT EXISTS ui_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  colors jsonb NOT NULL,
  typography jsonb NOT NULL,
  spacing jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ui_layouts table
CREATE TABLE IF NOT EXISTS ui_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  layout_config jsonb NOT NULL,
  component_config jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ui_components table
CREATE TABLE IF NOT EXISTS ui_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  component_type text NOT NULL,
  default_config jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_components ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view themes"
  ON ui_themes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage themes"
  ON ui_themes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view layouts"
  ON ui_layouts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage layouts"
  ON ui_layouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Anyone can view components"
  ON ui_components
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage components"
  ON ui_components
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
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_ui_themes_name ON ui_themes(name);
CREATE INDEX idx_ui_layouts_name ON ui_layouts(name);
CREATE INDEX idx_ui_components_type ON ui_components(component_type);

-- Create triggers
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_themes_updated_at
  BEFORE UPDATE ON ui_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_layouts_updated_at
  BEFORE UPDATE ON ui_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_components_updated_at
  BEFORE UPDATE ON ui_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default theme
INSERT INTO ui_themes (
  name,
  description,
  colors,
  typography,
  spacing,
  is_default
) VALUES (
  'default',
  'Default application theme',
  '{
    "primary": "#6B46C1",
    "secondary": "#4A5568",
    "background": "#F7FAFC",
    "text": "#2D3748"
  }',
  '{
    "fontFamily": "Inter, system-ui, sans-serif",
    "baseSize": "16px",
    "lineHeight": "1.5"
  }',
  '{
    "base": "4px",
    "small": "8px",
    "medium": "16px",
    "large": "24px"
  }',
  true
) ON CONFLICT (name) DO NOTHING;