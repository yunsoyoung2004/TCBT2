-- Row Level Security for every clinically-sensitive table.
--
-- WHY THIS EXISTS: the app itself (src/lib/db/pg-pool.ts, every
-- src/lib/server/*-store.ts file) connects using the project's postgres
-- superuser role via DATABASE_URL, which bypasses RLS automatically -- so
-- this migration changes NOTHING about how the app's own RPC routes behave
-- (src/app/api/*/store/route.ts keep doing their own authorization checks
-- exactly as before, e.g. session-store/route.ts's isDeniedForPatient).
--
-- What this DOES close: until now, nothing stopped a client connecting as
-- the anon/authenticated Postgres role (Supabase Realtime's postgres_changes
-- CDC feed, or any future direct-from-browser Supabase-client read) from
-- seeing every row in these tables, regardless of whose data it is -- there
-- was no RLS at all, so that layer had zero enforcement of its own. These
-- policies are a second, database-level authorization layer underneath the
-- app-level one, required before Realtime can safely be enabled on any of
-- these tables (see the realtime-migration plan).
--
-- Pattern per table: clinicians (role stored in auth user_metadata at
-- signup, see src/lib/auth/auth-context.tsx) get unrestricted access,
-- matching the app's existing "shared pool" model (src/app/api/participants/
-- store/route.ts's own comment: "clinicians share one flat pool"). A patient
-- may only reach rows that trace back to their OWN runtime_participants row
-- (auth_user_id = auth.uid(), see sql/008_link_participants_to_auth.sql).
--
-- Safe to re-run: CREATE POLICY has no IF NOT EXISTS in Postgres, so every
-- policy is preceded by DROP POLICY IF EXISTS, matching this directory's
-- "safe to re-run" convention (see scripts/migrate-neon.mjs).

CREATE OR REPLACE FUNCTION is_clinician() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'clinician';
$$;

-- runtime_participants: direct ownership via auth_user_id.
ALTER TABLE runtime_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS runtime_participants_clinician_all ON runtime_participants;
CREATE POLICY runtime_participants_clinician_all ON runtime_participants
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS runtime_participants_patient_own ON runtime_participants;
CREATE POLICY runtime_participants_patient_own ON runtime_participants
  FOR ALL USING (auth_user_id = auth.uid()::text) WITH CHECK (auth_user_id = auth.uid()::text);

-- runtime_sessions: direct participant_id column.
ALTER TABLE runtime_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS runtime_sessions_clinician_all ON runtime_sessions;
CREATE POLICY runtime_sessions_clinician_all ON runtime_sessions
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS runtime_sessions_patient_own ON runtime_sessions;
CREATE POLICY runtime_sessions_patient_own ON runtime_sessions
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));

-- runtime_messages: via runtime_session_id -> runtime_sessions.participant_id.
ALTER TABLE runtime_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS runtime_messages_clinician_all ON runtime_messages;
CREATE POLICY runtime_messages_clinician_all ON runtime_messages
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS runtime_messages_patient_own ON runtime_messages;
CREATE POLICY runtime_messages_patient_own ON runtime_messages
  FOR ALL USING (runtime_session_id IN (
    SELECT rs.id FROM runtime_sessions rs JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ))
  WITH CHECK (runtime_session_id IN (
    SELECT rs.id FROM runtime_sessions rs JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ));

-- safety_events: direct participant_id column.
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS safety_events_clinician_all ON safety_events;
CREATE POLICY safety_events_clinician_all ON safety_events
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS safety_events_patient_own ON safety_events;
CREATE POLICY safety_events_patient_own ON safety_events
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));

-- homework_records: direct participant_id column.
ALTER TABLE homework_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS homework_records_clinician_all ON homework_records;
CREATE POLICY homework_records_clinician_all ON homework_records
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS homework_records_patient_own ON homework_records;
CREATE POLICY homework_records_patient_own ON homework_records
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));

-- homework_entries: via homework_record_id -> homework_records.participant_id.
ALTER TABLE homework_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS homework_entries_clinician_all ON homework_entries;
CREATE POLICY homework_entries_clinician_all ON homework_entries
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS homework_entries_patient_own ON homework_entries;
CREATE POLICY homework_entries_patient_own ON homework_entries
  FOR ALL USING (homework_record_id IN (
    SELECT hr.id FROM homework_records hr JOIN runtime_participants rp ON rp.id = hr.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ))
  WITH CHECK (homework_record_id IN (
    SELECT hr.id FROM homework_records hr JOIN runtime_participants rp ON rp.id = hr.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ));

-- worksheet_instances: via runtime_session_id -> runtime_sessions.participant_id.
ALTER TABLE worksheet_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS worksheet_instances_clinician_all ON worksheet_instances;
CREATE POLICY worksheet_instances_clinician_all ON worksheet_instances
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS worksheet_instances_patient_own ON worksheet_instances;
CREATE POLICY worksheet_instances_patient_own ON worksheet_instances
  FOR ALL USING (runtime_session_id IN (
    SELECT rs.id FROM runtime_sessions rs JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ))
  WITH CHECK (runtime_session_id IN (
    SELECT rs.id FROM runtime_sessions rs JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ));

-- worksheet_field_values: via instance_id -> worksheet_instances.runtime_session_id -> runtime_sessions.participant_id.
ALTER TABLE worksheet_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS worksheet_field_values_clinician_all ON worksheet_field_values;
CREATE POLICY worksheet_field_values_clinician_all ON worksheet_field_values
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS worksheet_field_values_patient_own ON worksheet_field_values;
CREATE POLICY worksheet_field_values_patient_own ON worksheet_field_values
  FOR ALL USING (instance_id IN (
    SELECT wi.id FROM worksheet_instances wi
    JOIN runtime_sessions rs ON rs.id = wi.runtime_session_id
    JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ))
  WITH CHECK (instance_id IN (
    SELECT wi.id FROM worksheet_instances wi
    JOIN runtime_sessions rs ON rs.id = wi.runtime_session_id
    JOIN runtime_participants rp ON rp.id = rs.participant_id
    WHERE rp.auth_user_id = auth.uid()::text
  ));
