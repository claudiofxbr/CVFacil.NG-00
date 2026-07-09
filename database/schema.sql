-- CVFacil.NG — Schema Neon PostgreSQL
-- Execute no painel SQL do Neon: https://console.neon.tech

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Usuário',  -- 'Usuário' | 'Administrador'
  plan          TEXT NOT NULL DEFAULT 'Free',      -- 'Free' | 'Básico' | 'Padrão' | 'Premium'
  status        TEXT NOT NULL DEFAULT 'Ativo',     -- 'Ativo' | 'Inativo'
  credits       INT  NOT NULL DEFAULT 0,
  avatar        TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id   TEXT NOT NULL DEFAULT 'original',
  theme_mode    TEXT NOT NULL DEFAULT 'light',
  full_name     TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  linkedin      TEXT NOT NULL DEFAULT '',
  portfolio     TEXT NOT NULL DEFAULT '',
  summary       TEXT NOT NULL DEFAULT '',
  experiences   JSONB NOT NULL DEFAULT '[]',
  education     JSONB NOT NULL DEFAULT '[]',
  skills        JSONB NOT NULL DEFAULT '[]',
  languages     JSONB NOT NULL DEFAULT '[]',
  hobbies       JSONB NOT NULL DEFAULT '[]',
  avatar_url    TEXT,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_imported   BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
