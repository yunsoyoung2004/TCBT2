-- Protocol Studio domain: audit log for clinician-facing protocol/asset/extraction
-- authoring actions. The multi-protocol validate->publish->release-version pipeline
-- has been intentionally removed (see versions-page.tsx deletion and protocol-page.tsx
-- publish UI removal) -- TCBT is now a single canonical protocol, edited directly.
-- This table replaces the Dexie `auditEntries` table for these domains.
CREATE TABLE IF NOT EXISTS protocol_studio_audit_entries (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  version TEXT,
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_protocol_studio_audit_timestamp ON protocol_studio_audit_entries (timestamp DESC);
