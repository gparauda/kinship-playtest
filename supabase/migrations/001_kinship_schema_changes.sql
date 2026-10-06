-- Persist the saved Technology-set currency for each recorded Kinship turn.
ALTER TABLE public.kinship_turns
  ADD COLUMN IF NOT EXISTS innovation_start integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS innovation_end integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hunt_target text;

-- Record the required pre-playtest response for new sessions.
ALTER TABLE public.kinship_sessions
  ADD COLUMN IF NOT EXISTS first_game boolean;
