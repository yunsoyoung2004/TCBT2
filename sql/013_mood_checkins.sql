-- Daily mood check-ins -- a lightweight, 1-tap-a-day signal, deliberately
-- separate from the PHQ-9/GAD-7 standardized screenings (sql/011): those
-- are periodic clinical instruments, this is the Daylio/Youper/Wysa-style
-- "how are you feeling today" habit-loop that drives daily engagement.
-- One row per participant per calendar day -- the UNIQUE constraint makes
-- a same-day resubmission an update, not a duplicate (see
-- src/lib/server/mood-checkin-store.ts's upsert).

CREATE TABLE IF NOT EXISTS mood_checkins (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  checkin_date date NOT NULL,
  mood integer NOT NULL CHECK (mood BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  UNIQUE (participant_id, checkin_date)
);
CREATE INDEX IF NOT EXISTS mood_checkins_participant_idx ON mood_checkins (participant_id, checkin_date DESC);
