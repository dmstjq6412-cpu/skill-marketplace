CREATE TABLE IF NOT EXISTS skills (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL,
    version         TEXT    NOT NULL DEFAULT '1.0.0',
    author          TEXT    NOT NULL,
    description     TEXT,
    readme          TEXT,
    filename        TEXT    NOT NULL,
    file_type       TEXT    NOT NULL DEFAULT 'md',
    file_data       BYTEA,
    downloads       INTEGER NOT NULL DEFAULT 0,
    owner_github_id BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);

CREATE TABLE IF NOT EXISTS skill_files (
    id          SERIAL PRIMARY KEY,
    skill_id    INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    file_path   TEXT    NOT NULL,
    file_data   TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_files_skill_id ON skill_files(skill_id);

CREATE TABLE IF NOT EXISTS harness_logs (
    date        TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS harness_blueprints (
    id          SERIAL PRIMARY KEY,
    skill       TEXT NOT NULL,
    date        TEXT NOT NULL,
    change      TEXT NOT NULL,
    reason      TEXT,
    issues      JSONB NOT NULL DEFAULT '[]',
    articles    JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(skill, date)
);

CREATE INDEX IF NOT EXISTS idx_harness_blueprints_skill ON harness_blueprints(skill);
CREATE INDEX IF NOT EXISTS idx_harness_blueprints_date ON harness_blueprints(date DESC);

CREATE TABLE IF NOT EXISTS harness_viz (
    name        TEXT PRIMARY KEY,
    content     TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS harness_analysis (
    id          SERIAL PRIMARY KEY,
    date        TEXT NOT NULL UNIQUE,
    branch      TEXT NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ NOT NULL,
    git         JSONB NOT NULL DEFAULT '{}',
    pr          JSONB,
    quality     JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harness_analysis_date ON harness_analysis(date DESC);

CREATE TABLE IF NOT EXISTS harness_references (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    url         TEXT NOT NULL UNIQUE,
    summary     TEXT,
    tags        JSONB NOT NULL DEFAULT '[]',
    skills      JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harness_references_created_at ON harness_references(created_at DESC);

CREATE TABLE IF NOT EXISTS harness_evaluations (
    id              SERIAL PRIMARY KEY,
    skill           TEXT NOT NULL,
    date            TEXT NOT NULL,
    article_title   TEXT NOT NULL,
    article_url     TEXT NOT NULL,
    gaps            JSONB NOT NULL DEFAULT '[]',
    suggestions     JSONB NOT NULL DEFAULT '[]',
    verdict         TEXT NOT NULL DEFAULT 'partial',
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harness_evaluations_skill ON harness_evaluations(skill);
CREATE INDEX IF NOT EXISTS idx_harness_evaluations_date ON harness_evaluations(date DESC);
