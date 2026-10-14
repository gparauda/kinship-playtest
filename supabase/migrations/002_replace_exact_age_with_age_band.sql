-- Store a less identifying age category for formal data collection.
-- Run this after clearing the test sessions. Exact ages are no longer collected.
ALTER TABLE public.kinship_sessions
  ADD COLUMN IF NOT EXISTS age_band text;

ALTER TABLE public.kinship_sessions
  ALTER COLUMN age DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kinship_sessions_age_band_check'
      AND conrelid = 'public.kinship_sessions'::regclass
  ) THEN
    ALTER TABLE public.kinship_sessions
      ADD CONSTRAINT kinship_sessions_age_band_check
      CHECK (age_band IN ('17_or_below', '18_24', '25_39', '40_55', '56_plus'));
  END IF;
END $$;

ALTER TABLE public.kinship_sessions
  ALTER COLUMN age_band SET NOT NULL;
