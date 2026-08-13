-- Adds appointments to the supabase_realtime publication (see
-- sql/010_enable_realtime.sql) -- a patient's own appointment list should
-- update live when a clinician books/cancels one, same reasoning as
-- clinician_messages (sql/017). RLS (sql/021) is already in place.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
