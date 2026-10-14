-- One row per completed session for descriptive graphs and exploratory models.
CREATE OR REPLACE VIEW public.kinship_session_analysis AS
SELECT
  s.id AS session_id,
  s.participant_id,
  s.game_version,
  s.playtest_condition,
  s.gender,
  s.age_band,
  s.game_experience,
  s.first_game,
  s.final_turn AS turns_survived,
  s.victory,
  s.end_reason,
  s.legacy_chips,
  COUNT(t.session_id) AS turns_recorded,
  AVG(t.threat) AS mean_threat_faced,
  AVG(t.food_workers) AS mean_food_workers,
  AVG(t.hunt_workers) AS mean_hunt_workers,
  AVG(t.kinship_workers) AS mean_kinship_workers,
  AVG(t.technology_workers) AS mean_technology_workers,
  AVG(t.worship_workers) AS mean_worship_workers,
  SUM(t.projects_started) AS projects_started,
  SUM(CASE WHEN t.protected THEN 1 ELSE 0 END) AS protections_used,
  SUM(CASE WHEN t.hunt_outcome = 'Success' THEN 1 ELSE 0 END) AS successful_hunts,
  MAX(t.innovation_end) AS peak_innovation,
  MAX(t.people_end) AS peak_people,
  MAX(t.food_end) AS peak_food
FROM public.kinship_sessions s
LEFT JOIN public.kinship_turns t ON t.session_id = s.id
WHERE s.final_turn IS NOT NULL
GROUP BY s.id;

-- Early choices only: suitable for predicting later survival without using
-- decisions that happened after the outcome was already largely determined.
CREATE OR REPLACE VIEW public.kinship_session_analysis_first_10 AS
SELECT
  s.id AS session_id,
  s.participant_id,
  s.game_version,
  s.playtest_condition,
  s.gender,
  s.age_band,
  s.game_experience,
  s.first_game,
  s.final_turn AS turns_survived,
  s.victory,
  s.end_reason,
  AVG(t.threat) AS mean_threat_first_10,
  AVG(t.food_workers) AS mean_food_workers_first_10,
  AVG(t.hunt_workers) AS mean_hunt_workers_first_10,
  AVG(t.kinship_workers) AS mean_kinship_workers_first_10,
  AVG(t.technology_workers) AS mean_technology_workers_first_10,
  AVG(t.worship_workers) AS mean_worship_workers_first_10,
  SUM(t.projects_started) AS projects_started_first_10,
  SUM(CASE WHEN t.protected THEN 1 ELSE 0 END) AS protections_used_first_10,
  SUM(CASE WHEN t.hunt_outcome = 'Success' THEN 1 ELSE 0 END) AS successful_hunts_first_10,
  MAX(t.innovation_end) AS innovation_at_turn_10,
  MAX(t.people_end) FILTER (WHERE t.turn_number = 10) AS people_at_turn_10,
  MAX(t.food_end) FILTER (WHERE t.turn_number = 10) AS food_at_turn_10
FROM public.kinship_sessions s
JOIN public.kinship_turns t
  ON t.session_id = s.id
  AND t.turn_number <= 10
WHERE s.final_turn >= 10
GROUP BY s.id;
