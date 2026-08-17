-- Real appointment scheduling -- a different signal from the "haven't
-- been active in N days" reminders in sql/007/cron/reminders: this is a
-- specific scheduled time a clinician books with a participant, with its
-- own reminder email (see src/app/api/cron/appointment-reminders/route.ts).
--
-- V1 scope, deliberately: clinician-created only (no patient self-
-- scheduling), a flat list/date-grouped UI rather than a calendar grid,
-- one reminder per appointment (the day before, not a live countdown).

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  clinician_user_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'scheduled',
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS appointments_participant_idx ON appointments (participant_id, scheduled_at);
CREATE INDEX IF NOT EXISTS appointments_scheduled_at_idx ON appointments (scheduled_at) WHERE status = 'scheduled';
