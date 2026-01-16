-- Character classes (templates for new users)
CREATE TABLE character_classes (
  id TEXT PRIMARY KEY,           -- 'founder', 'scholar', etc.
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  default_wake_time TIME NOT NULL DEFAULT '07:00',
  default_bedtime TIME NOT NULL DEFAULT '22:00',
  primary_attributes TEXT[] NOT NULL DEFAULT '{}'
);

-- Seed character classes
INSERT INTO character_classes (id, name, icon, description, primary_attributes) VALUES
  ('founder', 'The Founder', '🚀', 'Build products, lead teams, scale businesses', ARRAY['int', 'cha']),
  ('scholar', 'The Scholar', '📚', 'Pursue knowledge, master skills, share wisdom', ARRAY['int', 'foc']),
  ('athlete', 'The Athlete', '🏃', 'Train hard, compete harder, recover smarter', ARRAY['str', 'vit']),
  ('monk', 'The Monk', '🧘', 'Cultivate mindfulness, embrace simplicity', ARRAY['foc', 'vit']),
  ('creator', 'The Creator', '🎨', 'Design, write, build beautiful things', ARRAY['cre', 'int']),
  ('custom', 'Custom', '⚙️', 'Define your own path', ARRAY[]::TEXT[]);

-- Class quest templates (pre-filled quests for each class)
CREATE TABLE class_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES character_classes(id),
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL DEFAULT 'side',
  duration_minutes INTEGER NOT NULL,
  attribute_ids TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true
);

-- Seed class quest templates
INSERT INTO class_quest_templates (class_id, title, quest_type, duration_minutes, attribute_ids, position) VALUES
  -- Founder
  ('founder', 'Morning Planning', 'main', 30, ARRAY['foc'], 0),
  ('founder', 'Deep Work Block', 'main', 120, ARRAY['int', 'foc'], 1),
  ('founder', 'Team Standup', 'side', 30, ARRAY['cha'], 2),
  ('founder', 'Product Review', 'main', 60, ARRAY['int'], 3),
  ('founder', 'Email & Comms', 'side', 30, ARRAY['cha'], 4),
  -- Scholar
  ('scholar', 'Morning Reading', 'main', 60, ARRAY['int'], 0),
  ('scholar', 'Study Session', 'main', 120, ARRAY['int', 'foc'], 1),
  ('scholar', 'Note Review', 'side', 30, ARRAY['int'], 2),
  ('scholar', 'Practice Problems', 'main', 90, ARRAY['int', 'foc'], 3),
  -- Athlete
  ('athlete', 'Morning Workout', 'main', 60, ARRAY['str', 'vit'], 0),
  ('athlete', 'Skill Training', 'main', 90, ARRAY['str', 'foc'], 1),
  ('athlete', 'Recovery & Stretch', 'side', 30, ARRAY['vit'], 2),
  ('athlete', 'Nutrition Prep', 'side', 30, ARRAY['vit'], 3),
  -- Monk
  ('monk', 'Morning Meditation', 'main', 30, ARRAY['foc', 'vit'], 0),
  ('monk', 'Mindful Practice', 'main', 60, ARRAY['foc'], 1),
  ('monk', 'Journaling', 'side', 30, ARRAY['foc', 'cre'], 2),
  ('monk', 'Evening Reflection', 'main', 30, ARRAY['foc', 'vit'], 3),
  -- Creator
  ('creator', 'Morning Freewrite', 'side', 30, ARRAY['cre'], 0),
  ('creator', 'Creative Block', 'main', 120, ARRAY['cre', 'foc'], 1),
  ('creator', 'Skill Development', 'main', 60, ARRAY['int', 'cre'], 2),
  ('creator', 'Portfolio Work', 'main', 90, ARRAY['cre'], 3);

-- User's custom schedule builds
CREATE TABLE schedule_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📋',
  description TEXT,
  wake_time TIME,
  bedtime TIME,
  default_days INTEGER[] DEFAULT '{}', -- 0=Sun, 1=Mon, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Build quest templates (quests that belong to a build)
CREATE TABLE build_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES schedule_builds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL DEFAULT 'side',
  duration_minutes INTEGER NOT NULL,
  attribute_ids TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL
);

-- Add class_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS class_id TEXT REFERENCES character_classes(id);

-- Indexes
CREATE INDEX idx_class_templates_class ON class_quest_templates(class_id);
CREATE INDEX idx_build_templates_build ON build_quest_templates(build_id);
CREATE INDEX idx_schedule_builds_user ON schedule_builds(user_id);

-- RLS
ALTER TABLE schedule_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own builds" ON schedule_builds
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own build templates" ON build_quest_templates
  FOR ALL USING (build_id IN (SELECT id FROM schedule_builds WHERE user_id = auth.uid()));

-- character_classes and class_quest_templates are public read
ALTER TABLE character_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read classes" ON character_classes
  FOR SELECT USING (true);
CREATE POLICY "Public read class templates" ON class_quest_templates
  FOR SELECT USING (true);
