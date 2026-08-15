-- Patient self-service data deletion requests -- deliberately a REQUEST,
-- not an automatic delete: this is a live clinical tool with real
-- record-keeping obligations, so an admin/clinician reviews and actions
-- each one by hand (see src/app/api/admin/deletion-requests/route.ts).
-- Data EXPORT (the read-your-own-data half of this feature) has no table
-- of its own -- it's a live read straight from the existing stores, see
-- src/app/api/patient-data-export/route.ts.

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id text PRIMARY KEY,
  participant_id text NOT NULL,
  requested_by_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  created_at timestamptz NOT NULL,
  resolved_at timestamptz,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS data_deletion_requests_participant_idx ON data_deletion_requests (participant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS data_deletion_requests_status_idx ON data_deletion_requests (status, created_at DESC);
