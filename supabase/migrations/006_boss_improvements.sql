-- Migration: Boss HP Improvements
-- Time-based HP calculation and photo proof for accountability

-- Add estimated hours (used to calculate HP: hours × 10)
ALTER TABLE bosses ADD COLUMN estimated_hours INTEGER;

-- Add proof image URL for accountability when manually defeating
ALTER TABLE bosses ADD COLUMN proof_image_url TEXT;

-- Backfill estimated_hours for existing bosses based on total_hp
UPDATE bosses SET estimated_hours = CEIL(total_hp / 10.0) WHERE estimated_hours IS NULL;
