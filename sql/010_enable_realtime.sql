-- Adds the tables the Realtime-migration (see src/lib/supabase/use-realtime-invalidate.ts)
-- actually subscribes to into Supabase's `supabase_realtime` publication --
-- without this, Postgres never emits CDC events for these tables at all,
-- regardless of the RLS policies in sql/009 or any client-side subscription
-- code. Must run AFTER sql/009 (RLS is the authorization layer; this is
-- just "turn the CDC feed on" for the same already-protected tables).
--
-- Idempotent: ADD TABLE fails if the table is already a publication member,
-- so each is wrapped in a DO block that ignores "already a member" errors,
-- keeping this file safe to re-run like every other file in this directory.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE runtime_sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE runtime_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE safety_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE homework_records;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE worksheet_instances;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE worksheet_field_values;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
