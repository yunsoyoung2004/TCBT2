-- Session worksheet persistence (Neon Postgres). Adds a normalized,
-- per-field-value store layered on top of the existing runtime pipeline.
--
-- ARCHITECTURAL NOTE: every other table in this app (sql/001-005) is a
-- "document row" -- a few scalar columns + one `data jsonb` blob holding the
-- whole serialized object, with RuntimeContext.fields itself living as an
-- untyped Record<string, unknown> nested inside that blob (see
-- src/types/runtime-session.ts, src/lib/runtime/runtime-context.ts). This is
-- the first normalized, per-field-row schema in the codebase: each clinical
-- field of a session gets its own row with its own status/provenance/
-- confirmation timestamp, so the worksheet UI can show per-field state
-- (draft vs. confirmed, who supplied it, when) without diffing a JSON blob.
--
-- Canonical source of truth is NOT moved here. RuntimeContext.fields in
-- runtime_sessions.data remains canonical; worksheet_field_values is a
-- typed, queryable PROJECTION of it (see worksheet-binding-registry.ts /
-- worksheet-projection.ts), refreshed after every turn and after every
-- worksheet-originated edit (which round-trips through the same runtime
-- validation/update path before being projected back). See root comment in
-- src/lib/worksheet/worksheet-projection.ts for the write-path contract.

CREATE TABLE IF NOT EXISTS worksheet_templates (
  id text PRIMARY KEY,
  session_definition_id text NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL
);

-- One row per published revision of a template's field layout. Versioned
-- separately from the template row itself so a worksheet_instance can pin
-- the exact version it was rendered against (source-fidelity discipline:
-- never let a live instance silently follow a template edit).
CREATE TABLE IF NOT EXISTS worksheet_template_versions (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES worksheet_templates (id),
  version integer NOT NULL,
  source_text_hash text NOT NULL,
  status text NOT NULL, -- draft | published | deprecated
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL, -- layout metadata (visual grouping, section order)
  UNIQUE (template_id, version)
);

-- Static definition of one worksheet field. canonical_field_key must match
-- an actual PromptItem.outputFields[0] entry from source-fidelity-catalog.ts
-- -- see worksheet-binding-registry.ts, which is the only place these rows
-- are authored (never hand-inserted).
CREATE TABLE IF NOT EXISTS worksheet_field_definitions (
  id text PRIMARY KEY,
  template_version_id text NOT NULL REFERENCES worksheet_template_versions (id),
  canonical_field_key text NOT NULL,
  worksheet_field_key text NOT NULL,
  value_type text NOT NULL,
  participant_owned boolean NOT NULL,
  assistant_must_not_supply boolean NOT NULL,
  confirmation_required boolean NOT NULL,
  visual_element_id text NOT NULL,
  display_order integer NOT NULL,
  source_section text,
  UNIQUE (template_version_id, worksheet_field_key)
);
CREATE INDEX IF NOT EXISTS worksheet_field_definitions_template_version_idx ON worksheet_field_definitions (template_version_id);

-- One row per (runtime session, template version) -- the participant's
-- actual worksheet for their run of that session.
CREATE TABLE IF NOT EXISTS worksheet_instances (
  id text PRIMARY KEY,
  runtime_session_id text NOT NULL,
  template_version_id text NOT NULL REFERENCES worksheet_template_versions (id),
  status text NOT NULL, -- in_progress | completed | abandoned
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS worksheet_instances_session_idx ON worksheet_instances (runtime_session_id);

-- Current value of one field on one instance. Overwritten in place;
-- history lives in worksheet_field_revisions. This is the row the UI reads
-- to render a box/cell -- always a PROJECTION of the canonical runtime
-- field, never an independent write target (see worksheet-projection.ts).
CREATE TABLE IF NOT EXISTS worksheet_field_values (
  id text PRIMARY KEY,
  instance_id text NOT NULL REFERENCES worksheet_instances (id),
  field_definition_id text NOT NULL REFERENCES worksheet_field_definitions (id),
  status text NOT NULL,
  provenance text NOT NULL,
  confidence real,
  source_turn_id text,
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL,
  data jsonb NOT NULL, -- { value, displayValue?, participantVerbatim? }
  UNIQUE (instance_id, field_definition_id)
);
CREATE INDEX IF NOT EXISTS worksheet_field_values_instance_idx ON worksheet_field_values (instance_id);

-- Ordered-list-shaped fields (evidenceFor, problems, symptomItems, ...)
-- get one row per collected item instead of one jsonb array in
-- worksheet_field_values.data, so an individual item can carry its own
-- provenance/confirmation state (e.g. one piece of evidence confirmed,
-- another still draft).
CREATE TABLE IF NOT EXISTS worksheet_collection_items (
  id text PRIMARY KEY,
  field_value_id text NOT NULL REFERENCES worksheet_field_values (id),
  position integer NOT NULL,
  status text NOT NULL,
  provenance text NOT NULL,
  source_turn_id text,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL -- { value, displayValue? }
);
CREATE INDEX IF NOT EXISTS worksheet_collection_items_field_value_idx ON worksheet_collection_items (field_value_id);

-- Append-only history of every value a field has held. Written on every
-- projection refresh and every participant edit -- this is the audit trail
-- the spec requires ("reliable session resume and auditability").
CREATE TABLE IF NOT EXISTS worksheet_field_revisions (
  id text PRIMARY KEY,
  field_value_id text NOT NULL REFERENCES worksheet_field_values (id),
  status text NOT NULL,
  provenance text NOT NULL,
  source_turn_id text,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL -- snapshot of the value at this revision
);
CREATE INDEX IF NOT EXISTS worksheet_field_revisions_field_value_idx ON worksheet_field_revisions (field_value_id);

-- Coarse event log for the worksheet UI itself (field shown, field
-- confirmed, field edited, instance completed) -- distinct from
-- runtime_session_logs, which logs the runtime pipeline's own stages.
CREATE TABLE IF NOT EXISTS worksheet_events (
  id text PRIMARY KEY,
  instance_id text NOT NULL REFERENCES worksheet_instances (id),
  event_type text NOT NULL,
  created_at timestamptz NOT NULL,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS worksheet_events_instance_idx ON worksheet_events (instance_id);
