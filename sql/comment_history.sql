CREATE TABLE comment_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language    VARCHAR(20) NOT NULL,
  style       VARCHAR(20) NOT NULL,
  density     VARCHAR(20) NOT NULL,
  input_code  TEXT NOT NULL,
  output_code TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_history_user_created ON comment_history(user_id, created_at DESC);
