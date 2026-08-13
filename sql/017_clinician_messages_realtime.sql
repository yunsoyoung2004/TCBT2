-- Adds clinician_messages to the supabase_realtime publication (see
-- sql/010_enable_realtime.sql for the original set) -- a message thread
-- is exactly the kind of thing worth seeing update live, and RLS (sql/016)
-- is already in place, which is the actual prerequisite for turning this
-- on safely.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE clinician_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
