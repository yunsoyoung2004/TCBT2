-- Extends sql/009_row_level_security.sql's RLS coverage to appointments
-- (sql/020). Same reasoning as every other migration in this series.

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointments_clinician_all ON appointments;
CREATE POLICY appointments_clinician_all ON appointments
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS appointments_patient_own ON appointments;
CREATE POLICY appointments_patient_own ON appointments
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));
