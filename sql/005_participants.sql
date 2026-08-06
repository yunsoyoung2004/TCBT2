-- Clinician-facing participant roster + longitudinal memories (clinician
-- notes) store (Neon Postgres). Replaces the Dexie (browser IndexedDB)
-- tables of the same purpose in src/lib/db/tbct-local-db.ts --
-- runtimeParticipants, longitudinalMemories.
--
-- Root cause this migration fixes: RuntimeParticipant records (patient
-- roster entries such as display name/alias) were only ever written to the
-- browser's local IndexedDB, so a participant created from the patient-
-- facing screen in one browser was invisible from the clinician's Patient
-- Monitoring screen in a different browser/session -- even though
-- runtime_sessions (sql/002_runtime_store.sql) had already been migrated to
-- this same Neon database. Moving participants and clinician notes to Neon
-- too gives both sides a single shared source of truth. Same "document
-- row" shape as the other migrations: indexed scalar columns + `data jsonb`.

CREATE TABLE IF NOT EXISTS runtime_participants (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  alias text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS runtime_participants_project_idx ON runtime_participants (project_id);
CREATE INDEX IF NOT EXISTS runtime_participants_updated_at_idx ON runtime_participants (updated_at DESC);

CREATE TABLE IF NOT EXISTS longitudinal_memories (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  memory_type text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS longitudinal_memories_participant_idx ON longitudinal_memories (participant_id);
CREATE INDEX IF NOT EXISTS longitudinal_memories_type_idx ON longitudinal_memories (memory_type);
