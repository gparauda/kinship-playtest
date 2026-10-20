import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const participantIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const achievementIds = new Set([
  "fifteen-people",
  "devout-heretic",
  "fifty-food",
  "ten-material",
  "five-upgrades",
  "fifteen-upgrades",
  "twenty-five-upgrades",
  "turn-25",
  "turn-50",
  "turn-100",
  "first-era-claim",
  "five-skulls",
  "face-five-upgrades",
  "lost-turn-two",
  "last-convert",
]);
const leaderboardSorts = {
  survival: {
    column: "turns_survived",
    tieBreakers: ["victory", "legacy_chips", "final_people", "final_food"],
  },
  successful_hunts: { column: "successful_hunts", tieBreakers: ["turns_survived"] },
  hunt_deaths: { column: "hunt_deaths", tieBreakers: ["turns_survived"] },
  legacy_chips: { column: "legacy_chips", tieBreakers: ["turns_survived"] },
  peak_innovation: { column: "peak_innovation", tieBreakers: ["turns_survived"] },
} as const;

function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "start_session") {
      const playerName = String(body.playerName ?? "").trim();
      const condition = String(body.condition ?? "").trim();
      const openingNotes = String(body.openingNotes ?? "").trim();
      const participantId = String(body.participantId ?? "").trim();

      const gender = String(body.gender ?? "prefer_not_to_say").trim();
      const ageBand = String(body.ageBand ?? "").trim();
      const firstGame = body.firstGame;
      if (typeof firstGame !== "boolean") {
        return reply({ error: "Please answer whether this is your first Kinship game." }, 400);
      }

      const gameExperience = String(body.gameExperience ?? "").trim();

      const validGenders = ["male", "female", "prefer_not_to_say"];
      const validAgeBands = [
        "17_or_below",
        "18_24",
        "25_39",
        "40_55",
        "56_plus",
      ];
      const validExperience = [
        "never",
        "few_times_a_year",
        "monthly",
        "weekly_or_more",
      ];

      if (!playerName || playerName.length > 32) {
        return reply(
          { error: "A display name between 1 and 32 characters is required." },
          400
        );
      }

      if (!participantIdPattern.test(participantId)) {
        return reply({ error: "Invalid participant profile." }, 400);
      }

      if (!validGenders.includes(gender)) {
        return reply({ error: "Invalid gender response." }, 400);
      }

      if (!validAgeBands.includes(ageBand)) {
        return reply({ error: "Please choose an age range." }, 400);
      }


      if (!validExperience.includes(gameExperience)) {
        return reply({ error: "Invalid game-experience response." }, 400);
      }

      const { error: participantError } = await supabase
        .from("kinship_participants")
        .upsert(
          {
            id: participantId,
            display_name: playerName,
            gender,
            age_band: ageBand,
            game_experience: gameExperience,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (participantError) throw participantError;

      const { count: priorSessions, error: priorSessionsError } = await supabase
        .from("kinship_sessions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", participantId);

      if (priorSessionsError) throw priorSessionsError;

      const { data, error } = await supabase
        .from("kinship_sessions")
        .insert({
          player_name: playerName,
          playtest_condition: condition || null,
          opening_notes: openingNotes || null,
          gender,
          age_band: ageBand,
          game_experience: gameExperience,
          first_game: (priorSessions ?? 0) === 0,
          participant_id: participantId,
          game_version: "2026-10-20-choice-events-v1",
        })
        .select("id")
        .single();

      if (error) throw error;

      return reply({ sessionId: data.id });
    }

    if (action === "record_turn") {
      const { sessionId, turn } = body;

      if (!sessionId || !turn) {
        return reply({ error: "Missing session or turn data." }, 400);
      }

      const row = {
        session_id: sessionId,
        turn_number: turn.turn,
        era: turn.era,
        event_title: turn.event,
        threat: turn.threat,
        protected: turn.protected === "Yes",
        protection_cost: turn.protectionCost ?? 0,

        food_workers: turn.foodWorkers ?? 0,
        kinship_workers: turn.kinshipWorkers ?? 0,
        hunt_workers: turn.huntWorkers ?? 0,
        technology_workers: turn.technologyWorkers ?? 0,
        worship_workers: turn.worshipWorkers ?? 0,

        people_start: turn.peopleStart,
        food_start: turn.foodStart,
        prayer_start: turn.prayerStart,
        innovation_start: turn.innovationStart ?? 0,
        people_end: turn.peopleEnd,
        food_end: turn.foodEnd,
        prayer_end: turn.prayerEnd,
        innovation_end: turn.innovationEnd ?? 0,

        food_rolls: turn.foodRolls ?? [],
        hunt_rolls: turn.huntRolls ?? [],
        technology_rolls: turn.technologyRolls ?? [],
        worship_rolls: turn.worshipRolls ?? [],
        projects_started: turn.projectsStarted ?? 0,
        upgrades_chosen: turn.upgradesChosen ?? [],
        sacrifice_rewards: turn.sacrificeRewards ?? [],

        hunt_skulls: turn.huntSkulls ?? null,
        hunt_total: turn.huntTotal ?? null,
        hunt_outcome: turn.huntOutcome ?? null,
        hunt_target: turn.huntTarget ?? null,
        result_summary: turn.result ?? null,
      };

      const { error } = await supabase
        .from("kinship_turns")
        .upsert(row, { onConflict: "session_id,turn_number" });

      if (error) throw error;

      return reply({ saved: true });
    }

    if (action === "finish_session") {
      const {
        sessionId,
        status,
        finalTurn,
        finalPeople,
        finalFood,
        finalPrayer,
        legacyChips,
        victory,
        playerName,
        endReason,
      } = body;

      if (!sessionId || !playerName) {
        return reply({ error: "Missing final session data." }, 400);
      }

      const { error: sessionError } = await supabase
        .from("kinship_sessions")
        .update({
          ended_at: new Date().toISOString(),
          status: status === "ended_early" ? "ended_early" : "completed",
          final_turn: finalTurn,
          final_people: finalPeople,
          final_food: finalFood,
          final_prayer: finalPrayer,
          legacy_chips: legacyChips,
          victory: Boolean(victory),
          end_reason: String(endReason ?? "").trim() || null,
        })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      const { error: leaderboardError } = await supabase
        .from("kinship_leaderboard")
        .upsert(
          {
            session_id: sessionId,
            player_name: String(playerName).trim(),
            best_turn: finalTurn,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "session_id" }
        );

      if (leaderboardError) throw leaderboardError;

      return reply({ saved: true });
    }

    if (action === "record_choice_event") {
      const sessionId = String(body.sessionId ?? "").trim();
      const choice = body.choice ?? {};
      const choiceId = String(choice.id ?? "").trim();
      const eventId = String(choice.eventId ?? "").trim();
      const eventTitle = String(choice.eventTitle ?? "").trim();
      const optionId = String(choice.optionId ?? "").trim();
      const turn = Number(choice.turn);
      const era = Number(choice.era);

      if (
        !participantIdPattern.test(sessionId) ||
        !participantIdPattern.test(choiceId) ||
        !eventId ||
        !eventTitle ||
        !optionId ||
        !Number.isInteger(turn) ||
        !Number.isInteger(era)
      ) {
        return reply({ error: "Invalid choice-event data." }, 400);
      }

      const { error } = await supabase.from("kinship_choice_events").insert({
        id: choiceId,
        session_id: sessionId,
        turn_number: turn,
        era,
        event_id: eventId,
        event_title: eventTitle,
        option_id: optionId,
        response_details:
          choice.details && typeof choice.details === "object" ? choice.details : {},
      });

      if (error) throw error;
      return reply({ saved: true });
    }

    if (action === "resolve_choice_event") {
      const sessionId = String(body.sessionId ?? "").trim();
      const choiceId = String(body.choiceId ?? "").trim();
      const resolvedTurn = Number(body.resolvedTurn);

      if (
        !participantIdPattern.test(sessionId) ||
        !participantIdPattern.test(choiceId) ||
        !Number.isInteger(resolvedTurn)
      ) {
        return reply({ error: "Invalid choice-event resolution." }, 400);
      }

      const { error } = await supabase
        .from("kinship_choice_events")
        .update({
          resolved_turn: resolvedTurn,
          resolution_details:
            body.resolution && typeof body.resolution === "object"
              ? body.resolution
              : {},
        })
        .eq("id", choiceId)
        .eq("session_id", sessionId);

      if (error) throw error;
      return reply({ saved: true });
    }

    if (action === "sync_achievements") {
      const participantId = String(body.participantId ?? "").trim();
      const ids = Array.isArray(body.achievementIds) ? body.achievementIds : [];
      const validIds = [...new Set(ids.map(String))].filter((id) => achievementIds.has(id));

      if (!participantIdPattern.test(participantId)) {
        return reply({ error: "Invalid participant profile." }, 400);
      }

      if (validIds.length === 0) return reply({ saved: true });

      const { error } = await supabase
        .from("kinship_participant_achievements")
        .upsert(
          validIds.map((achievement_id) => ({
            participant_id: participantId,
            achievement_id,
          })),
          { onConflict: "participant_id,achievement_id", ignoreDuplicates: true }
        );

      if (error) throw error;

      return reply({ saved: true });
    }

    if (action === "get_achievements") {
      const participantId = String(body.participantId ?? "").trim();
      if (!participantIdPattern.test(participantId)) {
        return reply({ error: "Invalid participant profile." }, 400);
      }

      const { data, error } = await supabase
        .from("kinship_participant_achievements")
        .select("achievement_id")
        .eq("participant_id", participantId);

      if (error) throw error;

      return reply({ achievementIds: (data ?? []).map((row) => row.achievement_id) });
    }

    if (action === "get_analysis") {
      const dashboardPassword = String(body.dashboardPassword ?? "");
      const expectedPassword = Deno.env.get("RESEARCH_DASHBOARD_PASSWORD");
      const analysisView =
        body.dataset === "first_10"
          ? "kinship_session_analysis_first_10"
          : "kinship_session_analysis";

      if (!expectedPassword || dashboardPassword !== expectedPassword) {
        return reply({ error: "Researcher access is required." }, 401);
      }

      const { data, error } = await supabase
        .from(analysisView)
        .select("*")
        .order("session_id", { ascending: true })
        .limit(5000);

      if (error) throw error;

      const sessions = (data ?? []).map(({ participant_id, ...session }) => session);
      return reply({ sessions });
    }

    if (action === "get_leaderboard") {
      const requestedMetric = String(body.metric ?? "survival");
      const sort = leaderboardSorts[
        requestedMetric as keyof typeof leaderboardSorts
      ] ?? leaderboardSorts.survival;

      let query = supabase
        .from("kinship_leaderboard_metrics")
        .select(
          "player_name, turns_survived, victory, legacy_chips, final_people, final_food, successful_hunts, hunt_deaths, peak_innovation"
        )
        .order(sort.column, { ascending: false });

      sort.tieBreakers.forEach((column) => {
        query = query.order(column, { ascending: false });
      });

      const { data, error } = await query.limit(10);

      if (error) throw error;

      return reply({ leaderboard: data, metric: requestedMetric });
    }

    return reply({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error(error);

    return reply(
      {
        error:
          error instanceof Error ? error.message : "Unexpected server error.",
      },
      500
    );
  }
});
