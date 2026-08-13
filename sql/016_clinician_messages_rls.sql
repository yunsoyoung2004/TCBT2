-- Extends sql/009_row_level_security.sql's RLS coverage to
-- clinician_messages (sql/015). Same reasoning as every other migration
-- in this series: the app's own server code bypasses RLS via the
-- postgres superuser role, so this only closes the Realtime/direct-client
-- gap for this table specifically.

ALTER TABLE clinician_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinician_messages_clinician_all ON clinician_messages;
CREATE POLICY clinician_messages_clinician_all ON clinician_messages
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS clinician_messages_patient_own ON clinician_messages;
CREATE POLICY clinician_messages_patient_own ON clinician_messages
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));
