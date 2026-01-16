-- Migration: Add difficulty mode to profiles
-- Sprint 1: Difficulty Settings

-- Add difficulty_mode column with constraint
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS difficulty_mode TEXT NOT NULL DEFAULT 'normal'
CHECK (difficulty_mode IN ('story', 'normal', 'hardcore'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.difficulty_mode IS 'Game difficulty: story (no penalties), normal (default), hardcore (1.5x XP, strict streaks)';
