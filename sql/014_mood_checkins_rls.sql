-- Extends sql/009_row_level_security.sql's RLS coverage to mood_checkins
-- (sql/013, added after 009/012). Same reasoning as those migrations: the
-- app's own server code bypasses RLS via the postgres superuser role, so
-- this only closes the Realtime/direct-client gap, matching every other
-- participant-scoped table.

ALTER TABLE mood_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mood_checkins_clinician_all ON mood_checkins;
CREATE POLICY mood_checkins_clinician_all ON mood_checkins
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS mood_checkins_patient_own ON mood_checkins;
CREATE POLICY mood_checkins_patient_own ON mood_checkins
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));
