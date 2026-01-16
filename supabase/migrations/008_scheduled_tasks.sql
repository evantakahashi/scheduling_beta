-- Migration: Scheduled Time Slots for Build Templates
-- Allows tasks to have fixed start times (e.g., "gym at 12:00")

-- Add scheduled_start to build_quest_templates
-- NULL = flexible task (fills gaps), TIME = fixed time slot
ALTER TABLE build_quest_templates ADD COLUMN scheduled_start TIME;
