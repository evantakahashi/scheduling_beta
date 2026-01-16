-- Attribute definitions (static reference)
CREATE TABLE attributes (
  id TEXT PRIMARY KEY,           -- 'str', 'int', 'cha', 'foc', 'vit', 'cre'
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL            -- Hex color for radar chart
);

-- Seed data
INSERT INTO attributes VALUES
  ('str', 'Strength', '💪', 'Physical power and endurance', '#ff6b6b'),
  ('int', 'Intellect', '🧠', 'Mental acuity and learning', '#4ecdc4'),
  ('cha', 'Charisma', '🗣️', 'Social influence and communication', '#ffe66d'),
  ('foc', 'Focus', '🎯', 'Concentration and discipline', '#95e1d3'),
  ('vit', 'Vitality', '❤️', 'Health and wellbeing', '#f38181'),
  ('cre', 'Creativity', '🎨', 'Innovation and artistic expression', '#aa96da');

-- Junction table for quest attributes (many-to-many)
CREATE TABLE quest_attributes (
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES attributes(id),
  PRIMARY KEY (quest_id, attribute_id)
);

-- User attribute totals (denormalized for performance)
CREATE TABLE user_attributes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES attributes(id),
  total_xp INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, attribute_id)
);

-- Indexes
CREATE INDEX idx_quest_attributes_quest ON quest_attributes(quest_id);
CREATE INDEX idx_user_attributes_user ON user_attributes(user_id);

-- RLS
ALTER TABLE quest_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own quest attributes" ON quest_attributes
  FOR ALL USING (quest_id IN (SELECT id FROM quests WHERE user_id = auth.uid()));
CREATE POLICY "Own user attributes" ON user_attributes
  FOR ALL USING (auth.uid() = user_id);

-- RPC function to increment attribute XP (atomic upsert)
CREATE OR REPLACE FUNCTION increment_attribute_xp(
  p_user_id UUID,
  p_attribute_id TEXT,
  p_xp_amount INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_attributes (user_id, attribute_id, total_xp)
  VALUES (p_user_id, p_attribute_id, p_xp_amount)
  ON CONFLICT (user_id, attribute_id)
  DO UPDATE SET total_xp = user_attributes.total_xp + p_xp_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
