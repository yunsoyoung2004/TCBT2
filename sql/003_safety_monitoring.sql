-- Clinician-facing safety monitoring store (Neon Postgres). Replaces the
-- Dexie (browser IndexedDB) tables of the same purpose in
-- src/lib/db/tbct-local-db.ts -- safetyEvents, safetyStatusTransitions,
-- safetyTriageRecords, humanInterventionRecords, safetyFollowUpTasks,
-- runtimeClinicians, safetyNotifications, safetyReports,
-- clinicianHandoffRecords, sessionResumeRequests, safetyTriggerSuppressions.
--
-- This is the operational source of truth for BOTH the patient-facing
-- runtime (which creates/reads safety events while a session is in
-- progress, via src/lib/api/runtime-execution-api.ts) and the clinician
-- safety-monitoring screens covered by this migration pass -- keeping a
-- single backend for both sides is what lets clinicians see events created
-- during real patient sessions. Every table follows the same "document row"
-- shape used by sql/002_runtime_store.sql: a handful of indexed scalar
-- columns plus a `data jsonb` column holding the full serialized record.

CREATE TABLE IF NOT EXISTS safety_events (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  runtime_session_id text NOT NULL,
  severity text NOT NULL,
  urgency text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_events_session_idx ON safety_events (runtime_session_id);
CREATE INDEX IF NOT EXISTS safety_events_participant_idx ON safety_events (participant_id);
CREATE INDEX IF NOT EXISTS safety_events_created_at_idx ON safety_events (created_at DESC);
CREATE INDEX IF NOT EXISTS safety_events_status_idx ON safety_events (status);

CREATE TABLE IF NOT EXISTS safety_status_transitions (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_status_transitions_event_idx ON safety_status_transitions (safety_event_id, created_at);

CREATE TABLE IF NOT EXISTS safety_triage_records (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_triage_records_event_idx ON safety_triage_records (safety_event_id, created_at);

CREATE TABLE IF NOT EXISTS human_intervention_records (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS human_intervention_records_event_idx ON human_intervention_records (safety_event_id, created_at);

CREATE TABLE IF NOT EXISTS safety_follow_up_tasks (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  participant_id text NOT NULL,
  status text NOT NULL,
  updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_follow_up_tasks_event_idx ON safety_follow_up_tasks (safety_event_id);
CREATE INDEX IF NOT EXISTS safety_follow_up_tasks_updated_at_idx ON safety_follow_up_tasks (updated_at DESC);

CREATE TABLE IF NOT EXISTS runtime_clinicians (
  id text PRIMARY KEY,
  role text NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS safety_notifications (
  id text PRIMARY KEY,
  clinician_id text,
  created_at timestamptz NOT NULL,
  read_at timestamptz,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_notifications_created_at_idx ON safety_notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS safety_reports (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  participant_id text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_reports_event_idx ON safety_reports (safety_event_id);
CREATE INDEX IF NOT EXISTS safety_reports_created_at_idx ON safety_reports (created_at DESC);

CREATE TABLE IF NOT EXISTS clinician_handoff_records (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  to_clinician_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS clinician_handoff_records_event_idx ON clinician_handoff_records (safety_event_id);
CREATE INDEX IF NOT EXISTS clinician_handoff_records_to_clinician_idx ON clinician_handoff_records (to_clinician_id, status);

CREATE TABLE IF NOT EXISTS session_resume_requests (
  id text PRIMARY KEY,
  safety_event_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS session_resume_requests_event_idx ON session_resume_requests (safety_event_id, created_at);

CREATE TABLE IF NOT EXISTS safety_trigger_suppressions (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS safety_trigger_suppressions_session_idx ON safety_trigger_suppressions (runtime_session_id, expires_at);
