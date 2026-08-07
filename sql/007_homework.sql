-- Patient-facing homework / follow-up activity store (Neon Postgres).
-- One shared, generic pair of tables backs all eight sessions' follow-up
-- activities (S1 Weekly Examples, S2 Check-in, S3 Review Intra-TR, S4 Action
-- Plan, S5 Review Grid, S6 Practice, S7 Decision Plan, S8 Appeal Record) --
-- the per-session UI/behavior differences live entirely in application code
-- (src/lib/api/homework-api.ts and the per-session page components), not in
-- separate schemas, since every session's follow-up activity reduces to the
-- same shape: one "record" (the container + top-level state) with zero or
-- more time-stamped "entries" (repeatable log rows for the ongoing-type
-- sessions: S1 examples, S6 practice tries, S8 daily appeals).
--
-- Same "document row" pattern as sql/002_runtime_store.sql: a handful of
-- indexed scalar columns plus a `data jsonb` column holding the full
-- serialized record.

CREATE TABLE IF NOT EXISTS homework_records (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  session_definition_id text NOT NULL,
  participant_id text NOT NULL,
  status text NOT NULL,
  updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS homework_records_session_idx ON homework_records (runtime_session_id);
CREATE INDEX IF NOT EXISTS homework_records_participant_idx ON homework_records (participant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS homework_entries (
  id text PRIMARY KEY,
  homework_record_id text NOT NULL,
  entry_type text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS homework_entries_record_idx ON homework_entries (homework_record_id, created_at);
