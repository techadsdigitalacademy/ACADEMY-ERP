-- Supabase Migration: Add monthly_targets JSONB column to staff table
-- This allows storing month-specific sales targets (e.g. {"2026-08": 150000, "2026-07": 120000})

ALTER TABLE staff ADD COLUMN IF NOT EXISTS monthly_targets JSONB DEFAULT '{}'::jsonb;
