-- Async patient<->clinician messaging -- benchmarked from BetterHelp/
-- Talkspace's core feature: a channel for short messages between
-- sessions, separate from both the AI roleplay transcript
-- (runtime_messages) and clinician-only notes (longitudinal memory's
-- clinician_note entries, never patient-visible). One flat thread per
-- participant -- no separate "thread" entity needed, the thread IS every
-- row for that participant_id, ordered by created_at.
--
-- sender_role/sender_user_id are always SERVER-derived from the caller's
-- own session (see src/app/api/clinician-messages/store/route.ts), never
-- taken from the request body -- a patient must never be able to send a
-- message that claims to be from a clinician.

CREATE TABLE IF NOT EXISTS clinician_messages (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  sender_role text NOT NULL,
  sender_user_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS clinician_messages_participant_idx ON clinician_messages (participant_id, created_at);
