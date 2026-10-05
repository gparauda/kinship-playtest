-- Persist the saved Technology-set currency for each recorded Kinship turn.
ALTER TABLE public.kinship_turns
  ADD COLUMN IF NOT EXISTS innovation_start integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS innovation_end integer NOT NULL DEFAULT 0;
