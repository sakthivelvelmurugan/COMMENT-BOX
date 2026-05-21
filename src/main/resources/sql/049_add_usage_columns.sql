-- Migration: add usage tracking to users
ALTER TABLE users
  ADD COLUMN daily_generate_count INT NOT NULL DEFAULT 0,
  ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;
