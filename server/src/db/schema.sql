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
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interviews (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode          VARCHAR(20) NOT NULL CHECK (mode IN ('Technical','HR')),
  domain        VARCHAR(100) NOT NULL,
  difficulty    VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress','completed','cancelled')),
  total_score   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);

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