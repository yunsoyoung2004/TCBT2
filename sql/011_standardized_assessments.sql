-- Standardized clinical screening check-ins (PHQ-9 depression, GAD-7
-- anxiety) -- a different signal from the belief-%/intensity-% worksheet
-- progress tracked in sql/006_worksheets.sql: those are session-specific
-- CBT constructs, these are validated, session-independent clinical
-- instruments a patient can complete anytime (see
-- src/lib/assessment/standardized-assessments.ts for the item text/scoring
-- and src/lib/api/standardized-assessment-api.ts for the write path).
--
-- Same "document row" pattern as every other store in this app: a handful
-- of indexed scalar columns plus a `data jsonb` column holding the answers.

CREATE TABLE IF NOT EXISTS standardized_assessment_responses (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  instrument text NOT NULL, -- 'phq9' | 'gad7'
  total_score integer NOT NULL,
  severity text NOT NULL,
  submitted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS standardized_assessment_responses_participant_idx
  ON standardized_assessment_responses (participant_id, submitted_at DESC);
