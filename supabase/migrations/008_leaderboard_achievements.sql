-- Replace the successful-hunts ranking with each participant's total
-- permanently earned achievements.  The count is intentionally participant-
-- level, so it includes achievements earned across returning players' sessions.
CREATE OR REPLACE VIEW public.kinship_leaderboard_metrics AS
SELECT
  s.id AS session_id,
  s.player_name,
  s.final_turn AS turns_survived,
  s.victory,
  s.legacy_chips,
  s.final_people,
  s.final_food,
  COALESCE(
    (
      SELECT COUNT(*)
      FROM public.kinship_participant_achievements pa
      WHERE pa.participant_id = s.participant_id
    ),
    0
  )::integer AS total_achievements,
  COALESCE(
    SUM(
      CASE
        WHEN t.hunt_outcome = 'Failed' AND COALESCE(t.hunt_skulls, 0) > 0 THEN 1
        ELSE 0
      END
    ),
    0
  )::integer AS hunt_deaths,
  COALESCE(MAX(t.innovation_end), 0)::integer AS peak_innovation
FROM public.kinship_sessions s
LEFT JOIN public.kinship_turns t ON t.session_id = s.id
WHERE s.final_turn IS NOT NULL
GROUP BY
  s.id,
  s.participant_id,
  s.player_name,
  s.final_turn,
  s.victory,
  s.legacy_chips,
  s.final_people,
  s.final_food;
