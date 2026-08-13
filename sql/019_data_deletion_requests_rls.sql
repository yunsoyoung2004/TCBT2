-- Extends sql/009_row_level_security.sql's RLS coverage to
-- data_deletion_requests (sql/018). Same reasoning as every other
-- migration in this series -- closes the Realtime/direct-client gap
-- only, the app's own server code bypasses RLS via the postgres
-- superuser role.

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS data_deletion_requests_clinician_all ON data_deletion_requests;
CREATE POLICY data_deletion_requests_clinician_all ON data_deletion_requests
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS data_deletion_requests_patient_own ON data_deletion_requests;
CREATE POLICY data_deletion_requests_patient_own ON data_deletion_requests
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));
