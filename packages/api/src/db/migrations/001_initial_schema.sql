CREATE TABLE topics (
  id           TEXT PRIMARY KEY,
  abbr         TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL,
  icon         TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  color        TEXT NOT NULL DEFAULT 'blue',
  description  TEXT NOT NULL DEFAULT '',
  objectives   JSONB NOT NULL DEFAULT '[]',
  key_topics   JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subtopics (
  id           SERIAL PRIMARY KEY,
  topic_id     TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,
  scenario_id  TEXT,
  visualizer   TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  explanation  TEXT NOT NULL DEFAULT '',
  use_cases    JSONB NOT NULL DEFAULT '[]',
  real_world   TEXT NOT NULL DEFAULT '',
  complexity   JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, slug)
);

CREATE TABLE tabs (
  id           SERIAL PRIMARY KEY,
  subtopic_id  INTEGER NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  explanation  TEXT NOT NULL DEFAULT '',
  use_cases    JSONB NOT NULL DEFAULT '[]',
  real_world   TEXT NOT NULL DEFAULT '',
  complexity   JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX idx_subtopics_slug     ON subtopics(topic_id, slug);
CREATE INDEX idx_subtopics_scenario ON subtopics(scenario_id) WHERE scenario_id IS NOT NULL;
CREATE INDEX idx_tabs_subtopic_id   ON tabs(subtopic_id);
CREATE INDEX idx_topics_abbr        ON topics(abbr);
