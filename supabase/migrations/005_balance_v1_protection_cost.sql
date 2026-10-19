-- Retain the Prayer cost paid for each protected event under balance v1.
ALTER TABLE public.kinship_turns
  ADD COLUMN IF NOT EXISTS protection_cost integer NOT NULL DEFAULT 0;
