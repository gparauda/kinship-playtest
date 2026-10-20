-- One row records the player's response to each scheduled decision event.
-- Delayed choices (Season of Plenty and Distant Hearths expeditions) receive
-- their later result in resolved_turn and resolution_details.
CREATE TABLE IF NOT EXISTS public.kinship_choice_events (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.kinship_sessions(id) ON DELETE CASCADE,
  turn_number integer NOT NULL CHECK (turn_number >= 1),
  era integer NOT NULL CHECK (era BETWEEN 1 AND 5),
  event_id text NOT NULL,
  event_title text NOT NULL,
  option_id text NOT NULL,
  response_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_turn integer CHECK (resolved_turn IS NULL OR resolved_turn >= turn_number),
  resolution_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kinship_choice_events_session_idx
  ON public.kinship_choice_events (session_id, turn_number);

CREATE INDEX IF NOT EXISTS kinship_choice_events_event_idx
  ON public.kinship_choice_events (event_id, option_id);
