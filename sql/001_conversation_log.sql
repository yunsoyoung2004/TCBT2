-- Conversation log accumulation store (Neon Postgres).
--
-- This schema is a best-effort, append-friendly mirror of patient <-> assistant
-- runtime conversations. It is NOT the operational source of truth for the app
-- (that remains the local IndexedDB runtime session store) -- it exists so
-- conversation history accumulates outside the browser/app bundle instead of
-- growing local storage indefinitely, and so it can be queried later without
-- re-sending full history through prompts.
--
-- No foreign key constraints on purpose: writes here are fire-and-forget side
-- effects and must never fail/block the real conversation flow because of
-- ordering races or a missing parent row.

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  protocol_id text NOT NULL,
  release_id text NOT NULL,
  session_definition_id text NOT NULL,
  patient_alias text,
  locale text,
  status text NOT NULL,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS conversation_sessions_participant_idx
  ON conversation_sessions (participant_id);

CREATE INDEX IF NOT EXISTS conversation_sessions_updated_at_idx
  ON conversation_sessions (updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  status text,
  node_id text,
  prompt_item_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL,
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS conversation_messages_session_idx
  ON conversation_messages (runtime_session_id, created_at);
