-- Migration: Endurance Quests
-- For tasks like studying/meditation where taking longer is better

-- Add endurance flag to quests
ALTER TABLE quests ADD COLUMN is_endurance BOOLEAN DEFAULT FALSE;
