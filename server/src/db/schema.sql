-- ======================================================================
-- PrepNova - PostgreSQL Schema
-- Run via: npm run db:migrate   (creates <PGDATABASE> tables if absent)
-- ======================================================================

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  preferred_domain VARCHAR(100),
  target_skills   TEXT[] NOT NULL DEFAULT '{}',
  role            VARCHAR(20) NOT NULL DEFAULT 'user',
  login_count     INTEGER NOT NULL DEFAULT 0,
  last_login_at   TIMESTAMPTZ,
  headline        VARCHAR(160),
  experience_level VARCHAR(30),
  location        VARCHAR(120),
  state           VARCHAR(120),
  country         VARCHAR(120),
  target_role     VARCHAR(160),
  bio             TEXT,
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS login_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_events_logged_in_at ON login_events(logged_in_at);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(140) NOT NULL,
  message     TEXT NOT NULL,
  link        VARCHAR(255),
  dedupe_key  VARCHAR(180) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ,
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;

-- Registration signs users in immediately, so count that initial session for
-- accounts created before registration began recording login events.
INSERT INTO login_events (user_id, logged_in_at)
SELECT users.id, users.created_at
FROM users
WHERE users.role = 'user'
  AND users.login_count = 0
  AND users.last_login_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM login_events WHERE login_events.user_id = users.id
  );

UPDATE users
SET login_count = 1, last_login_at = created_at
WHERE role = 'user'
  AND login_count = 0
  AND last_login_at IS NULL
  AND EXISTS (
    SELECT 1 FROM login_events
    WHERE login_events.user_id = users.id
      AND login_events.logged_in_at = users.created_at
  );

CREATE TABLE IF NOT EXISTS interviews (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode          VARCHAR(20) NOT NULL CHECK (mode IN ('Technical','HR')),
  domain        VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  target_role   VARCHAR(160),
  job_description TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','completed','cancelled')),
  total_score   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS target_role VARCHAR(160);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS job_description TEXT;

CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);

-- Store the active leaderboard epoch without deleting interview history.
CREATE TABLE IF NOT EXISTS leaderboard_control (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reset_at TIMESTAMPTZ,
  reset_by INTEGER
);

INSERT INTO leaderboard_control (id, reset_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS questions (
  id            SERIAL PRIMARY KEY,
  mode          VARCHAR(20) NOT NULL DEFAULT 'Technical',
  domain        VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(20) NOT NULL DEFAULT 'Medium'
                CHECK (difficulty IN ('Easy','Medium','Hard')),
  question_text TEXT NOT NULL UNIQUE,
  sample_answer TEXT,
  category      VARCHAR(80)
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN NOT NULL DEFAULT false;

-- These three behavioral prompts are part of every interview, regardless of
-- the selected mode or domain. Upsert them so existing question banks migrate safely.
INSERT INTO questions (mode, domain, difficulty, question_text, category, is_compulsory)
VALUES
  ('Both', 'General', 'Easy', 'Tell me about yourself.', 'Core behavioral', true),
  ('Both', 'General', 'Medium', 'What are your greatest strengths, and how have you used them?', 'Core behavioral', true),
  ('Both', 'General', 'Medium', 'What is one weakness you are working to improve, and what steps are you taking to overcome it?', 'Core behavioral', true),
  ('HR', 'HR / Behavioral', 'Medium', 'Why should we hire you for this role?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What motivates you in your work?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a mistake you made and what you learned from it.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Describe a time you handled pressure at work or school.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a time you received critical feedback and applied it.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you prioritize when you have multiple deadlines?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What kind of work environment helps you do your best work?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Tell me about a time you took initiative on a project.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you handle disagreements with a teammate?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What professional accomplishment are you most proud of?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you adapt when priorities change unexpectedly?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Easy', 'What are you looking for in your next role?', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'Describe working with someone whose style differed from yours.', 'Behavioral', false),
  ('HR', 'HR / Behavioral', 'Medium', 'How do you build trust with new teammates?', 'Behavioral', false)
ON CONFLICT (question_text) DO UPDATE
SET mode = EXCLUDED.mode,
    domain = EXCLUDED.domain,
    difficulty = EXCLUDED.difficulty,
    category = EXCLUDED.category,
    is_compulsory = EXCLUDED.is_compulsory;

CREATE TABLE IF NOT EXISTS answers (
  id                 SERIAL PRIMARY KEY,
  interview_id       INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id        INTEGER NOT NULL REFERENCES questions(id),
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text        TEXT,
  answer_mode        VARCHAR(10) NOT NULL DEFAULT 'typed'
                     CHECK (answer_mode IN ('typed','voice')),
  time_taken_seconds INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (interview_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_interview ON answers(interview_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id                        SERIAL PRIMARY KEY,
  interview_id              INTEGER NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  overall_score             INTEGER,
  summary                   TEXT,
  strengths                 TEXT[] NOT NULL DEFAULT '{}',
  weaknesses                TEXT[] NOT NULL DEFAULT '{}',
  improvements              TEXT[] NOT NULL DEFAULT '{}',
  question_evaluations_json JSONB,
  raw_ai_response           JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
