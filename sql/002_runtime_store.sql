-- Runtime conversation store (Neon Postgres) -- this is now the operational
-- source of truth for patient <-> assistant runtime sessions, replacing the
-- local IndexedDB (Dexie) tables of the same name. Every table follows a
-- "document row" shape: a handful of indexed scalar columns (mirroring the
-- Dexie compound indexes they replace) plus a `data jsonb` column holding the
-- full serialized record, so the TypeScript shape never has to be split
-- across normalized columns.
--
-- Supersedes the 001_conversation_log.sql mirror tables (dropped below) --
-- those held a lossy subset of fields for best-effort mirroring; this schema
-- is authoritative and complete.

DROP TABLE IF EXISTS conversation_messages;
DROP TABLE IF EXISTS conversation_sessions;

CREATE TABLE IF NOT EXISTS runtime_sessions (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  protocol_id text NOT NULL,
  release_id text NOT NULL,
  status text NOT NULL,
  updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_sessions_participant_idx ON runtime_sessions (participant_id);
CREATE INDEX IF NOT EXISTS runtime_sessions_updated_at_idx ON runtime_sessions (updated_at DESC);

CREATE TABLE IF NOT EXISTS runtime_messages (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL,
  delivered_at timestamptz,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_messages_session_idx ON runtime_messages (runtime_session_id, created_at);

CREATE TABLE IF NOT EXISTS runtime_session_logs (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  stage text NOT NULL,
  status text NOT NULL,
  "timestamp" timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_session_logs_session_idx ON runtime_session_logs (runtime_session_id, "timestamp");

CREATE TABLE IF NOT EXISTS runtime_checkpoints (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_checkpoints_session_idx ON runtime_checkpoints (runtime_session_id, sequence);

CREATE TABLE IF NOT EXISTS runtime_escalations (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  protocol_id text,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_escalations_session_idx ON runtime_escalations (runtime_session_id, created_at);
CREATE INDEX IF NOT EXISTS runtime_escalations_created_at_idx ON runtime_escalations (created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_provider_events (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_provider_events_session_idx ON runtime_provider_events (runtime_session_id, created_at);

CREATE TABLE IF NOT EXISTS runtime_validation_events (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_validation_events_session_idx ON runtime_validation_events (runtime_session_id, created_at);

CREATE TABLE IF NOT EXISTS runtime_execution_traces (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  "timestamp" timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_execution_traces_session_idx ON runtime_execution_traces (runtime_session_id, "timestamp");
