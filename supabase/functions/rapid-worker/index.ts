import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

      const gender = String(body.gender ?? "prefer_not_to_say").trim();
      const age = Number(body.age);
      const firstGame = body.firstGame;
      if (typeof firstGame !== "boolean") {
        return reply({ error: "Please answer whether this is your first Kinship game." }, 400);
      }


      if (!Number.isInteger(age) || age < 18 || age > 100) {
        return reply({ error: "Please enter a valid age from 18 to 100." }, 400);
      }
      const gameExperience = String(body.gameExperience ?? "").trim();

      const validGenders = ["male", "female", "prefer_not_to_say"];
      const validAgeRanges = [
        "under_18",
        "18_24",
        "25_49",
        "50_64",
        "65_plus",
        "prefer_not_to_say",
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

      if (!validGenders.includes(gender)) {
        return reply({ error: "Invalid gender response." }, 400);
      }


      if (!validExperience.includes(gameExperience)) {
        return reply({ error: "Invalid game-experience response." }, 400);
      }

      const { data, error } = await supabase
        .from("kinship_sessions")
        .insert({
          player_name: playerName,
          playtest_condition: condition || null,
          opening_notes: openingNotes || null,
          gender,
          age: age,
          game_experience: gameExperience,
          first_game: firstGame,
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

      const { data: leaderboard, error: leaderboardReadError } = await supabase
        .from("kinship_leaderboard")
        .select("player_name, best_turn")
        .order("best_turn", { ascending: false })
        .limit(10);

      if (leaderboardReadError) throw leaderboardReadError;

      return reply({ saved: true, leaderboard });
    }

    if (action === "get_leaderboard") {
      const { data, error } = await supabase
        .from("kinship_leaderboard")
        .select("player_name, best_turn")
        .order("best_turn", { ascending: false })
        .limit(10);

      if (error) throw error;

      return reply({ leaderboard: data });
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
