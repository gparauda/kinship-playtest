-- Link repeat plays without collecting email addresses or other direct identifiers.
CREATE TABLE IF NOT EXISTS public.kinship_participants (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 32),
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  age_band text NOT NULL CHECK (age_band IN ('17_or_below', '18_24', '25_39', '40_55', '56_plus')),
  game_experience text NOT NULL CHECK (game_experience IN ('never', 'few_times_a_year', 'monthly', 'weekly_or_more')),
  survey_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kinship_participant_achievements (
  participant_id uuid NOT NULL REFERENCES public.kinship_participants(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (participant_id, achievement_id)
);

ALTER TABLE public.kinship_sessions
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.kinship_participants(id),
  ADD COLUMN IF NOT EXISTS game_version text NOT NULL DEFAULT '2026-10-14',
  ADD COLUMN IF NOT EXISTS end_reason text;

ALTER TABLE public.kinship_turns
  ADD COLUMN IF NOT EXISTS projects_started integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS kinship_sessions_participant_id_idx
  ON public.kinship_sessions(participant_id);
