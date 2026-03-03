export const SCHEMA_SQL = `
-- Runs
CREATE TABLE IF NOT EXISTS runs (
  id              TEXT PRIMARY KEY,
  spec_id         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  skip_change_eval INTEGER NOT NULL DEFAULT 0,
  max_parallel    INTEGER NOT NULL DEFAULT 4,
  budget_usd      REAL NOT NULL DEFAULT 50.0,
  cost_usd        REAL NOT NULL DEFAULT 0.0,
  tokens_used     INTEGER NOT NULL DEFAULT 0,
  current_phase   TEXT,
  iteration       INTEGER NOT NULL DEFAULT 0,
  max_iterations  INTEGER NOT NULL DEFAULT 3,
  config          TEXT NOT NULL DEFAULT '{}',
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  role            TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  pid             INTEGER,
  module_id       TEXT,
  buildplan_id    TEXT REFERENCES buildplans(id),
  worktree_path   TEXT,
  branch_name     TEXT,
  session_id      TEXT,
  system_prompt   TEXT,
  tdd_phase       TEXT,
  tdd_cycles      INTEGER NOT NULL DEFAULT 0,
  cost_usd        REAL NOT NULL DEFAULT 0.0,
  tokens_used     INTEGER NOT NULL DEFAULT 0,
  queue_wait_ms   INTEGER NOT NULL DEFAULT 0,
  total_active_ms INTEGER NOT NULL DEFAULT 0,
  last_heartbeat  TEXT,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_run ON agents(run_id);
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Specs
CREATE TABLE IF NOT EXISTS specs (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  file_path       TEXT NOT NULL,
  content_hash    TEXT NOT NULL DEFAULT '',
  parent_spec_id  TEXT REFERENCES specs(id),
  scenario_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_specs_status ON specs(status);
CREATE INDEX IF NOT EXISTS idx_specs_parent ON specs(parent_spec_id);

-- Buildplans
CREATE TABLE IF NOT EXISTS buildplans (
  id                    TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL REFERENCES runs(id),
  spec_id               TEXT NOT NULL,
  architect_agent_id    TEXT NOT NULL REFERENCES agents(id),
  version               INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'draft',
  plan                  TEXT NOT NULL,
  module_count          INTEGER NOT NULL,
  contract_count        INTEGER NOT NULL,
  max_parallel          INTEGER NOT NULL,
  critical_path_modules TEXT,
  estimated_duration_min INTEGER,
  estimated_cost_usd    REAL,
  estimated_tokens      INTEGER,
  reviewed_by           TEXT,
  review_notes          TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_buildplans_run ON buildplans(run_id);
CREATE INDEX IF NOT EXISTS idx_buildplans_spec ON buildplans(spec_id);
CREATE INDEX IF NOT EXISTS idx_buildplans_status ON buildplans(status);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  buildplan_id    TEXT NOT NULL REFERENCES buildplans(id),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  format          TEXT NOT NULL DEFAULT 'typescript',
  content         TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_run ON contracts(run_id);
CREATE INDEX IF NOT EXISTS idx_contracts_buildplan ON contracts(buildplan_id);

-- Contract Bindings
CREATE TABLE IF NOT EXISTS contract_bindings (
  id              TEXT PRIMARY KEY,
  contract_id     TEXT NOT NULL REFERENCES contracts(id),
  agent_id        TEXT NOT NULL REFERENCES agents(id),
  module_id       TEXT NOT NULL,
  role            TEXT NOT NULL,
  acknowledged    INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_bindings_contract ON contract_bindings(contract_id);
CREATE INDEX IF NOT EXISTS idx_bindings_agent ON contract_bindings(agent_id);

-- Builder Dependencies
CREATE TABLE IF NOT EXISTS builder_dependencies (
  id                      TEXT PRIMARY KEY,
  run_id                  TEXT NOT NULL REFERENCES runs(id),
  builder_id              TEXT NOT NULL REFERENCES agents(id),
  depends_on_builder_id   TEXT REFERENCES agents(id),
  depends_on_module_id    TEXT NOT NULL,
  dependency_type         TEXT NOT NULL,
  satisfied               INTEGER NOT NULL DEFAULT 0,
  satisfied_at            TEXT,
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_deps_builder ON builder_dependencies(builder_id);
CREATE INDEX IF NOT EXISTS idx_deps_run ON builder_dependencies(run_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  from_agent_id   TEXT NOT NULL,
  to_agent_id     TEXT,
  to_role         TEXT,
  to_contract_id  TEXT,
  body            TEXT NOT NULL,
  read            INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_run ON messages(run_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_role ON messages(to_role);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  agent_id        TEXT,
  type            TEXT NOT NULL,
  data            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  capacity        INTEGER NOT NULL DEFAULT 0,
  in_use          INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Merge Queue
CREATE TABLE IF NOT EXISTS merge_queue (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  position        INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'waiting',
  enqueued_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  started_at      TEXT,
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_merge_queue_run ON merge_queue(run_id);
CREATE INDEX IF NOT EXISTS idx_merge_queue_status ON merge_queue(status);
CREATE INDEX IF NOT EXISTS idx_merge_queue_position ON merge_queue(position);

-- Research Artifacts
CREATE TABLE IF NOT EXISTS research_artifacts (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL REFERENCES runs(id),
  agent_id        TEXT NOT NULL,
  label           TEXT NOT NULL,
  type            TEXT NOT NULL,
  content         TEXT,
  file_path       TEXT,
  module_id       TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_research_run ON research_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_research_agent ON research_artifacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_research_module ON research_artifacts(module_id);

-- Parallel Build Progress View
CREATE VIEW IF NOT EXISTS parallel_build_progress AS
SELECT
  bp.run_id,
  bp.spec_id,
  json_each.value AS module_json,
  json_extract(json_each.value, '$.id') AS module_id,
  a.id AS agent_id,
  a.name AS agent_name,
  a.status AS agent_status,
  a.tdd_phase,
  a.tdd_cycles,
  a.cost_usd,
  a.tokens_used,
  a.queue_wait_ms,
  a.total_active_ms,
  (SELECT COUNT(*) FROM builder_dependencies bd
   WHERE bd.builder_id = a.id AND bd.satisfied = 1) AS deps_satisfied,
  (SELECT COUNT(*) FROM builder_dependencies bd
   WHERE bd.builder_id = a.id) AS deps_total,
  (SELECT COUNT(*) FROM contract_bindings cb
   WHERE cb.agent_id = a.id AND cb.acknowledged = 1) AS contracts_acknowledged,
  (SELECT COUNT(*) FROM contract_bindings cb
   WHERE cb.agent_id = a.id) AS contracts_total
FROM buildplans bp,
     json_each(bp.plan, '$.modules')
LEFT JOIN agents a ON a.module_id = json_extract(json_each.value, '$.id')
    AND a.run_id = bp.run_id
WHERE bp.status = 'active';
`;
