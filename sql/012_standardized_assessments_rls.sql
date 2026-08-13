-- Extends sql/009_row_level_security.sql's RLS coverage to
-- standardized_assessment_responses (sql/011), added after 009. Same
-- reasoning as that migration's own header: the app's own server code
-- connects as the postgres superuser and bypasses RLS entirely, so this
-- changes nothing about how src/app/api/standardized-assessments/store/
-- route.ts behaves -- it only closes the same Realtime/direct-client gap
-- for this table. Arguably more important here than most of 009's tables:
-- this one carries PHQ-9 self-harm ideation answers directly.

-- standardized_assessment_responses: direct participant_id column, same
-- pattern as safety_events/homework_records in sql/009.
ALTER TABLE standardized_assessment_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS standardized_assessment_responses_clinician_all ON standardized_assessment_responses;
CREATE POLICY standardized_assessment_responses_clinician_all ON standardized_assessment_responses
  FOR ALL USING (is_clinician()) WITH CHECK (is_clinician());
DROP POLICY IF EXISTS standardized_assessment_responses_patient_own ON standardized_assessment_responses;
CREATE POLICY standardized_assessment_responses_patient_own ON standardized_assessment_responses
  FOR ALL USING (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text))
  WITH CHECK (participant_id IN (SELECT id FROM runtime_participants WHERE auth_user_id = auth.uid()::text));
