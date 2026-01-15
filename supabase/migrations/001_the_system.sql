-- The System - Database Schema
-- Gamified Productivity Application

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE quest_type AS ENUM ('main', 'side');
CREATE TYPE quest_status AS ENUM ('pending', 'active', 'completed', 'sacrificed', 'failed');
CREATE TYPE boss_status AS ENUM ('active', 'defeated', 'failed');

-- Profiles (Character Sheet)
-- Extends Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  display_name TEXT NOT NULL,

  -- Vision System
  vision TEXT NOT NULL,                    -- "I am a successful indie developer..."
  anti_vision TEXT NOT NULL,               -- "I am broke, dependent, unfulfilled..."
  one_year_mission TEXT NOT NULL,          -- "Launch 3 profitable products"

  -- Game Stats
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  accuracy_score DECIMAL(5,2) DEFAULT 0,   -- Lifetime schedule accuracy %

  -- Preferences
  default_bedtime TIME NOT NULL DEFAULT '22:00',
  default_wake_time TIME NOT NULL DEFAULT '07:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Missions (Yearly Goals)
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,                     -- "Launch 3 Products"
  description TEXT,
  year INTEGER NOT NULL,                   -- 2024

  target_value INTEGER,                    -- 3 (for measurable goals)
  current_value INTEGER DEFAULT 0,         -- 1

  is_active BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bosses (Monthly Projects)
CREATE TABLE bosses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,

  title TEXT NOT NULL,                     -- "Ship MVP of App X"
  description TEXT,

  -- Boss HP System
  total_hp INTEGER NOT NULL DEFAULT 100,   -- Total effort required
  current_hp INTEGER NOT NULL DEFAULT 100, -- Remaining effort

  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status boss_status NOT NULL DEFAULT 'active',
  defeated_at TIMESTAMPTZ,

  -- Rewards
  xp_reward INTEGER NOT NULL DEFAULT 500,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Days (Daily Instance)
CREATE TABLE days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  bedtime TIME,                            -- Override default
  wake_time TIME,

  -- Daily Stats (calculated at end of day)
  xp_earned INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,2),             -- Today's accuracy
  quests_completed INTEGER DEFAULT 0,
  quests_sacrificed INTEGER DEFAULT 0,

  -- Anti-Vision Intensity (0-100)
  -- Higher = more failures today, triggers UI darkness
  darkness_level INTEGER DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Quests (Tasks)
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id UUID REFERENCES bosses(id) ON DELETE SET NULL, -- Links to monthly boss

  title TEXT NOT NULL,
  description TEXT,

  -- Quest Type
  quest_type quest_type NOT NULL DEFAULT 'side',

  -- Time Planning
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  planned_start TIMESTAMPTZ NOT NULL,
  planned_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Queue Position
  position INTEGER NOT NULL,

  -- Status
  status quest_status NOT NULL DEFAULT 'pending',

  -- XP Calculation
  base_xp INTEGER NOT NULL DEFAULT 10,     -- XP if perfect accuracy
  earned_xp INTEGER DEFAULT 0,             -- Actual XP earned
  accuracy DECIMAL(5,2),                   -- This quest's accuracy %

  -- Boss Damage (for main quests linked to boss)
  boss_damage INTEGER DEFAULT 0,           -- HP dealt to boss on completion

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(day_id, position)
);

-- Indexes for common queries
CREATE INDEX idx_quests_day ON quests(day_id);
CREATE INDEX idx_quests_user ON quests(user_id);
CREATE INDEX idx_quests_boss ON quests(boss_id);
CREATE INDEX idx_quests_position ON quests(day_id, position);
CREATE INDEX idx_bosses_user ON bosses(user_id);
CREATE INDEX idx_bosses_status ON bosses(status);
CREATE INDEX idx_days_user_date ON days(user_id, date);
CREATE INDEX idx_missions_user ON missions(user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER missions_updated_at BEFORE UPDATE ON missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bosses_updated_at BEFORE UPDATE ON bosses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER days_updated_at BEFORE UPDATE ON days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER quests_updated_at BEFORE UPDATE ON quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bosses ENABLE ROW LEVEL SECURITY;
ALTER TABLE days ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Missions: users can only access their own missions
CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions"
  ON missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions"
  ON missions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own missions"
  ON missions FOR DELETE USING (auth.uid() = user_id);

-- Bosses: users can only access their own bosses
CREATE POLICY "Users can view own bosses"
  ON bosses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bosses"
  ON bosses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bosses"
  ON bosses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bosses"
  ON bosses FOR DELETE USING (auth.uid() = user_id);

-- Days: users can only access their own days
CREATE POLICY "Users can view own days"
  ON days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own days"
  ON days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own days"
  ON days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own days"
  ON days FOR DELETE USING (auth.uid() = user_id);

-- Quests: users can only access their own quests
CREATE POLICY "Users can view own quests"
  ON quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quests"
  ON quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quests"
  ON quests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quests"
  ON quests FOR DELETE USING (auth.uid() = user_id);

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, vision, anti_vision, one_year_mission)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Player'),
    '',  -- Will be filled during onboarding
    '',
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
