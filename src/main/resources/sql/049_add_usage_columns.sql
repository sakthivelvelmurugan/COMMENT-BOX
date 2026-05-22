-- Migration: add usage tracking to users
ALTER TABLE users
  ADD COLUMN daily_generate_count INT NOT NULL DEFAULT 0,
  ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;

-- Migration: add sharing columns to comment_history
ALTER TABLE comment_history
  ADD COLUMN IF NOT EXISTS share_uuid VARCHAR(36) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
