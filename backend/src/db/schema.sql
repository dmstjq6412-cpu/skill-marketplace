CREATE TABLE IF NOT EXISTS skills (
    id          SERIAL PRIMARY KEY,
    name        TEXT    NOT NULL,
    version     TEXT    NOT NULL DEFAULT '1.0.0',
    author      TEXT    NOT NULL,
    description TEXT,
    readme      TEXT,
    filename    TEXT    NOT NULL,
    file_type   TEXT    NOT NULL DEFAULT 'md',
    file_data   BYTEA,
    downloads   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);
