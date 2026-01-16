-- Migration: Loot System
-- Rewards linked to bosses that drop on defeat

-- Rewards linked to bosses
CREATE TABLE boss_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boss_id UUID NOT NULL REFERENCES bosses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🎁',
  estimated_cost DECIMAL(10,2),
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track all earned rewards (history)
CREATE TABLE reward_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES boss_rewards(id) ON DELETE CASCADE,
  boss_title TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  reward_icon TEXT NOT NULL DEFAULT '🎁',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_boss_rewards_boss ON boss_rewards(boss_id);
CREATE INDEX idx_boss_rewards_user ON boss_rewards(user_id);
CREATE INDEX idx_reward_history_user ON reward_history(user_id);

-- RLS
ALTER TABLE boss_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own boss rewards" ON boss_rewards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reward history" ON reward_history
  FOR ALL USING (auth.uid() = user_id);
