-- Links a runtime_participants row to the Supabase Auth user that owns it,
-- now that patients sign up for real accounts instead of always resolving
-- to the single hardcoded demo participant (see participant-api.ts's
-- getOrCreateParticipantForUser). Additive-only, matching every other file
-- in this directory -- never edit an already-applied migration.
ALTER TABLE runtime_participants ADD COLUMN IF NOT EXISTS auth_user_id text;

-- Partial unique index (not a plain UNIQUE column) because existing/demo
-- rows have no auth_user_id yet and would otherwise collide on NULL --
-- Postgres treats NULLs as distinct for uniqueness, but a partial index
-- makes that explicit rather than relying on that behavior implicitly.
CREATE UNIQUE INDEX IF NOT EXISTS runtime_participants_auth_user_id_idx
  ON runtime_participants (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
