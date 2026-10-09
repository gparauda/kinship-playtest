"use strict";

/*
  KINSHIP
  Player-facing wording is in GAME_TEXT, ACTIONS, EVENT_DECKS, and rulesHTML().
*/

const SAVE_KEY = "kinship-playtest-save-v3";
const ACHIEVEMENTS_KEY = "kinship-playtest-achievements-v1";

const GAME_TEXT = {
  firstTurnTitle: "First Turn",
  firstTurnDescription:
    "The community begins with a clear view of the road ahead. No event occurs this turn.",
  eventContinue: "Continue to allocation",
  protectEvent: "Spend 2 Prayer to protect the community",
  protectedEvent: "Prayer protects the community from this event.",
};

const ACTIONS = [
  {
    id: "F",
    icon: "🌾",
    name: "Food",
    description: "Roll for Food. Higher faces produce more Food.",
    meta: ["Food die"],
  },
  {
    id: "K",
    icon: "🤝",
    name: "Kinship",
    description: "Assign two people to begin a three-turn community project.",
    meta: ["2 people per project"],
  },
  {
    id: "H",
    icon: "🏹",
    name: "Hunt",
    description: "Roll against the current Threat. Skulls make a failed Hunt dangerous.",
    meta: ["Risk & reward"],
  },
  {
    id: "T",
    icon: "🛠",
    name: "Technology",
    description: "Roll materials. A Stick, Rope, and Rock create an upgrade.",
    meta: ["Build upgrades"],
  },
  {
    id: "W",
    icon: "🕯",
    name: "Worship",
    description: "Two sides are Sacrifice. The other four sides produce Prayer.",
    meta: ["Sacrifice / Prayer"],
  },
];

const ERA_NAMES = [
  "Era I · Foundation",
  "Era II · Growth",
  "Era III · Adaptation",
  "Era IV · Endurance",
  "Era V · Legacy",
];

const LEGACY_COSTS = [3, 5, 7, 9, 11];
const ACHIEVEMENTS = [
  { id: "fifteen-people", name: "Full House", shape: "hexagon", description: "Reach 15 people in one community." },
  { id: "twenty-five-prayer", name: "Votive Hoard", shape: "crescent", description: "Hold 25 Prayer at once." },
  { id: "fifty-food", name: "Winter Larder", shape: "shield", description: "Store 50 Food at once." },
  { id: "ten-material", name: "Tenfold Strand", shape: "knot", description: "Hold 10 of a single Technology material." },
  { id: "five-upgrades", name: "First Notch", shape: "diamond", description: "Make 5 upgrades in one game." },
  { id: "fifteen-upgrades", name: "Second Notch", shape: "diamond", description: "Make 15 upgrades in one game." },
  { id: "twenty-five-upgrades", name: "Third Notch", shape: "diamond", description: "Make 25 upgrades in one game." },
  { id: "turn-25", name: "Quarter Light", shape: "sun", description: "Reach Turn 25." },
  { id: "turn-50", name: "Half Light", shape: "sun", description: "Reach Turn 50." },
  { id: "turn-100", name: "Long Night", shape: "sun", description: "Reach Turn 100." },
  { id: "first-era-claim", name: "Doorstep", shape: "gate", description: "Claim an era's Prestige chip on its first turn." },
  { id: "lost-turn-two", name: "Empty Chair", shape: "eclipse", rare: true, ultraRare: true },
  { id: "five-skulls", name: "Fivefold Omen", shape: "star", rare: true },
  { id: "face-five-upgrades", name: "Patient Hammer", shape: "anvil", rare: true },
];

/*
  Food, Hunt, and Prayer modifiers apply ONCE to the action's final total.
  The Food and Hunt values below are the strengthened versions we agreed on.
*/
const EVENT_DECKS = [
  [
    {
      title: "Mild Winter",
      description:
        "Cold weather slows gathering. Your final Food total is reduced by 2 this turn.",
      threat: 4,
      food: -2,
    },
    {
      title: "Easy Trails",
      description:
        "Fresh tracks cut across the valley. Your final Hunt total gains +2 this turn.",
      threat: 5,
      hunt: 2,
    },
    {
      title: "Cold Rain",
      description: "The rain soaks kindling and stores. Lose 2 Food.",
      threat: 4,
      foodLoss: 2,
    },
    {
      title: "Rocky Terrain",
      description:
        "The hunt moves through difficult ground. Your final Hunt total is reduced by 3 this turn.",
      threat: 5,
      hunt: -3,
    },
    {
      title: "Broken Tools",
      description: "Gathering is slowed while tools are repaired. Your final Food total is reduced by 1 this turn.",
      threat: 5,
      food: -1,
    },
    {
      title: "Lost Path",
      description: "A familiar route vanishes beneath fallen branches. Kinship projects take 1 additional turn.",
      threat: 6,
      kinship: 1,
    },
    {
      title: "Foraging Patch",
      description: "A sheltered patch of roots is found. Your final Food total gains +1 this turn.",
      threat: 3,
      food: 1,
    },
  ],
  [
    {
      title: "Harsh Winter",
      description:
        "Gathering is slowed by bitter cold. Your final Food total is reduced by 3 this turn.",
      threat: 8,
      food: -3,
    },
    {
      title: "Predator Activity",
      description:
        "Hunters find signs of a dangerous rival. Your final Hunt total is reduced by 3 this turn.",
      threat: 9,
      hunt: -3,
    },
    {
      title: "Thin Forage",
      description:
        "The usual plants are sparse. Your final Food total is reduced by 2 this turn.",
      threat: 8,
      food: -2,
    },
    {
      title: "Spoiled Stores",
      description: "Part of the community's stored food is lost.",
      threat: 7,
      foodLoss: 5,
    },
    {
      title: "Restless Nights",
      description:
        "Anxious vigils disrupt the camp. Kinship projects take 1 additional turn.",
      threat: 9,
      kinship: 1,
    },
    {
      title: "Flash Frost",
      description: "A sudden frost spoils gathered plants. Your final Food total is reduced by 2 this turn.",
      threat: 8,
      food: -2,
    },
    {
      title: "Torn Nets",
      description: "The best hunting gear needs mending. Your final Hunt total is reduced by 2 this turn.",
      threat: 9,
      hunt: -2,
    },
  ],
  [
    {
      title: "Endless Winter",
      description:
        "Cold and hunger linger. Your final Food total is reduced by 3, and 4 stored Food is lost.",
      threat: 13,
      food: -3,
      foodLoss: 4,
    },
    {
      title: "Dwindling Herds",
      description:
        "Finding game requires a longer and riskier hunt. Your final Hunt total is reduced by 4 this turn.",
      threat: 15,
      hunt: -4,
    },
    {
      title: "Illness",
      description: "Caring for the sick delays community projects.",
      threat: 12,
      kinship: 1,
    },
    {
      title: "Great Flood",
      description: "Floodwater carries away stored supplies.",
      threat: 14,
      foodLoss: 8,
    },
    {
      title: "Sheltered Ritual",
      description:
        "A protected gathering strengthens resolve. Your final Prayer gain gets +1 this turn.",
      threat: 11,
      prayer: 1,
    },
    {
      title: "Wolf Pack",
      description: "Predators circle the hunting grounds. Your final Hunt total is reduced by 2 this turn.",
      threat: 15,
      hunt: -2,
    },
    {
      title: "Mudslide",
      description: "A slope gives way and buries part of the stores. Lose 5 Food.",
      threat: 13,
      foodLoss: 5,
    },
  ],
  [
    {
      title: "Deep Freeze",
      description:
        "The land becomes difficult to work. Your final Food total is reduced by 4 this turn.",
      threat: 15,
      food: -4,
    },
    {
      title: "Famine",
      description:
        "Even successful gathering brings back little. Your final Food total is reduced by 2 and 12 stored Food is lost.",
      threat: 17,
      food: -2,
      foodLoss: 12,
    },
    {
      title: "Predator Surge",
      description:
        "The hunt is shadowed by dangerous predators. Your final Hunt total is reduced by 5 this turn.",
      threat: 16,
      hunt: -5,
    },
    {
      title: "Widespread Illness",
      description:
        "Several projects slow while the community recovers.",
      threat: 15,
      kinship: 2,
    },
    {
      title: "Contested Ground",
      description: "Other groups force a long detour. Your final Hunt total is reduced by 3 this turn.",
      threat: 16,
      hunt: -3,
    },
    {
      title: "Ashfall",
      description: "Ash settles over the valley and smothers edible growth. Your final Food total is reduced by 3 this turn.",
      threat: 15,
      food: -3,
    },
    {
      title: "Fractured Trail",
      description: "Travel between camps becomes slow and uncertain. Kinship projects take 1 additional turn.",
      threat: 17,
      kinship: 1,
    },
  ],
  [
    {
      title: "Bitter Winter",
      description:
        "A final hard winter tests everything built. Your final Food total is reduced by 4 and 20 stored Food is lost.",
      threat: 18,
      food: -4,
      foodLoss: 20,
    },
    {
      title: "Great Famine",
      description: "Food stores are devastated.",
      threat: 19,
      foodLoss: 50,
    },
    {
      title: "Vanishing Herds",
      description:
        "The last familiar hunting grounds have emptied. Your final Hunt total is reduced by 7 this turn.",
      threat: 18,
      hunt: -7,
    },
    {
      title: "Plague",
      description:
        "Illness and scarcity strike at once. Your final Food total is reduced by 2 and Kinship projects take longer.",
      threat: 18,
      food: -2,
      kinship: 2,
    },
    {
      title: "Windfall Cache",
      description:
        "An old cache is uncovered before the storms. Your final Food total gains +2 this turn.",
      threat: 17,
      food: 2,
    },
    {
      title: "Blizzard",
      description: "Whiteout conditions halt most gathering. Your final Food total is reduced by 3 this turn.",
      threat: 19,
      food: -3,
    },
    {
      title: "Raided Stores",
      description: "Desperate rivals find the hidden stores. Lose 25 Food.",
      threat: 18,
      foodLoss: 25,
    },
  ],
];

let state = null;

const $ = (id) => document.getElementById(id);

function earnedAchievements() {
  try {
    return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || {};
  } catch {
    return {};
  }
}

function awardAchievements(ids) {
  const earned = earnedAchievements();
  let changed = false;

  ids.forEach((id) => {
    if (!earned[id]) {
      earned[id] = true;
      changed = true;
    }
  });

  if (changed) localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
}

function upgradesMade() {
  if (!state) return 0;
  return ["F", "H", "W"].reduce(
    (total, die) => total + state.upgrades[die].reduce((sum, level) => sum + level, 0),
    0
  );
}

function eraStartTurn(era = currentEraIndex()) {
  return [1, 8, 15, 31, 61][era];
}

function evaluateAchievements({ huntSkulls = 0 } = {}) {
  if (!state) return;

  const materialPeak = Math.max(...Object.values(state.materials));
  const upgradeTotal = upgradesMade();
  const faceUpgradedFiveTimes = ["F", "H", "W"].some((die) =>
    state.upgrades[die].some((level) => level >= 5)
  );

  awardAchievements([
    ...(state.people >= 15 ? ["fifteen-people"] : []),
    ...(state.prayer >= 25 ? ["twenty-five-prayer"] : []),
    ...(state.food >= 50 ? ["fifty-food"] : []),
    ...(materialPeak >= 10 ? ["ten-material"] : []),
    ...(upgradeTotal >= 5 ? ["five-upgrades"] : []),
    ...(upgradeTotal >= 15 ? ["fifteen-upgrades"] : []),
    ...(upgradeTotal >= 25 ? ["twenty-five-upgrades"] : []),
    ...(state.turn >= 25 ? ["turn-25"] : []),
    ...(state.turn >= 50 ? ["turn-50"] : []),
    ...(state.turn >= 100 ? ["turn-100"] : []),
    ...(huntSkulls >= 5 ? ["five-skulls"] : []),
    ...(faceUpgradedFiveTimes ? ["face-five-upgrades"] : []),
  ]);
}

function achievementHTML(achievement, earned) {
  const hidden = achievement.rare && !earned;
  return `
    <article class="achievement ${earned ? "earned" : "locked"} ${achievement.rare ? "rare" : ""}">
      <span class="achievement-badge shape-${achievement.shape}" aria-hidden="true">${earned ? "✦" : "?"}</span>
      <div>
        <strong>${earned ? achievement.name : hidden ? "Hidden achievement" : achievement.name}</strong>
        <small>${hidden ? "" : achievement.description || ""}</small>
      </div>
      ${achievement.ultraRare ? '<em>Ultra rare</em>' : achievement.rare ? '<em>Rare</em>' : ""}
    </article>`;
}

function showAchievements() {
  const earned = earnedAchievements();
  const complete = ACHIEVEMENTS.filter((achievement) => earned[achievement.id]).length;

  $("result-content").innerHTML = `
    <div class="result-inner reference-modal achievements-modal">
      <p class="eyebrow">Persistent record</p>
      <h2>Achievements <span class="achievement-total">${complete} / ${ACHIEVEMENTS.length}</span></h2>
      <p class="modal-note">Achievements remain unlocked across every game played in this browser.</p>
      <div class="achievement-list">${ACHIEVEMENTS.map((achievement) => achievementHTML(achievement, Boolean(earned[achievement.id]))).join("")}</div>
      <button id="achievements-close" class="button button-primary">Close</button>
    </div>`;
  $("result-modal").showModal();
  $("achievements-close").addEventListener("click", () => $("result-modal").close());
}

function currentEraIndex(turn = state.turn) {
  if (turn <= 7) return 0;
  if (turn <= 14) return 1;
  if (turn <= 30) return 2;
  if (turn <= 60) return 3;
  return 4;
}

function eraEndTurn(era = currentEraIndex()) {
  return [7, 14, 30, 60, 99][era];
}

function turnsLeftInEra() {
  return eraEndTurn() - state.turn + 1;
}

function currentEvent() {
  if (state.turn === 1) {
    return {
      title: GAME_TEXT.firstTurnTitle,
      description: GAME_TEXT.firstTurnDescription,
      threat: 5,
      firstTurn: true,
    };
  }

  const deck = EVENT_DECKS[currentEraIndex()];
  return deck[Math.floor(Math.random() * deck.length)];
}

function huntTargetForThreat(threat) {
  if (threat <= 4) return "Hare";
  if (threat <= 7) return "Deer";
  if (threat <= 11) return "Wild Boar";
  if (threat <= 16) return "Elk";
  if (threat <= 22) return "Bison";
  return "Mammoth";
}

function eventEffectLabels(event) {
  const labels = [`${huntTargetForThreat(event.threat)} · Threat ${event.threat}`];

  if (event.food) {
    labels.push(
      `Food total ${event.food > 0 ? "+" : ""}${event.food} once`
    );
  }

  if (event.hunt) {
    labels.push(
      `Hunt total ${event.hunt > 0 ? "+" : ""}${event.hunt} once`
    );
  }

  if (event.prayer) {
    labels.push(`Prayer gain +${event.prayer} once`);
  }

  if (event.kinship) {
    labels.push(
      `Kinship +${event.kinship} turn${event.kinship === 1 ? "" : "s"}`
    );
  }

  if (event.foodLoss) {
    labels.push(`Lose ${event.foodLoss} Food`);
  }

  return labels;
}

/*
  SUPABASE CONNECTION
  The URL and public key come from supabase-config.js.
*/
async function callKinshipSync(action, payload = {}) {
  try {
    const response = await fetch(KINSHIP_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: KINSHIP_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${KINSHIP_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Supabase connection failed.");
    }

    return data;
  } catch (error) {
    console.warn("Kinship data sync unavailable:", error);
    return null;
  }
}

async function startRemoteSession() {
  if (!state || state.remoteSessionId) return state?.remoteSessionId;

  const data = await callKinshipSync("start_session", {
    playerName: state.playerName,
    condition: state.condition,
    openingNotes: state.openingNotes,
    gender: state.gender,
    age: state.age,
    gameExperience: state.gameExperience,
    firstGame: state.firstGame,
  });

  if (data?.sessionId) {
    state.remoteSessionId = data.sessionId;
    saveGame();
    return data.sessionId;
  }

  return null;
}

async function syncTurnToSupabase(turn) {
  if (!state || !turn) return;

  const sessionId = state.remoteSessionId || (await startRemoteSession());

  if (!sessionId) return;

  const data = await callKinshipSync("record_turn", {
    sessionId,
    turn,
  });

  if (data?.saved && !state.syncedTurnNumbers.includes(turn.turn)) {
    state.syncedTurnNumbers.push(turn.turn);
    saveGame();
  }
}

async function finishRemoteSession(reason) {
  if (!state) return;

  const sessionId = state.remoteSessionId || (await startRemoteSession());
  const latestTurn = state.researchRows[state.researchRows.length - 1];

  if (latestTurn) {
    await syncTurnToSupabase(latestTurn);
  }

  if (!sessionId) return;

  const data = await callKinshipSync("finish_session", {
    sessionId,
    status: reason === "Session ended early." ? "ended_early" : "completed",
    finalTurn: Math.min(state.turn, 100),
    finalPeople: state.people,
    finalFood: state.food,
    finalPrayer: state.prayer,
    legacyChips: state.legacy.filter(Boolean).length,
    victory: reason.startsWith("Victory"),
    playerName: state.playerName,
    gender: state.gender,
    age: state.age,
    gameExperience: state.gameExperience,
  });

  if (data?.leaderboard) {
    renderLeaderboard(data.leaderboard);
  }
}

async function loadLeaderboard() {
  const data = await callKinshipSync("get_leaderboard");

  if (data?.leaderboard) {
    renderLeaderboard(data.leaderboard);
  }
}

function renderLeaderboard(entries = []) {
  const list = $("leaderboard-list");

  if (!list) return;

  if (!entries.length) {
    list.innerHTML =
      `<li class="leaderboard-empty">No completed sessions yet.</li>`;
    return;
  }

  list.innerHTML = entries
    .map(
      (entry, index) => `
        <li>
          <span class="leaderboard-rank">${index + 1}</span>
          <span class="leaderboard-name">${escapeHTML(entry.player_name)}</span>
          <strong>Turn ${entry.best_turn}</strong>
        </li>
      `
    )
    .join("");
}

function escapeHTML(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function createNewState() {
  return {
    playerName: $("player-name").value.trim() || "Player",
    condition: "standard",
    openingNotes: $("opening-notes").value.trim(),

    gender: $("gender").value,
    age: Number($("age").value),
    gameExperience: $("game-experience").value,
    firstGame: $("first-game").value === "yes",

    turn: 1,
    people: 5,
    food: 7,
    prayer: 0,
    innovation: 0,

    allocations: { F: 0, K: 0, H: 0, T: 0, W: 0 },
    kinProjects: [],
    materials: { Stick: 0, Rope: 0, Rock: 0 },

    upgrades: {
      F: [0, 0, 0, 0, 0, 0, 0],
      H: [0, 0, 0, 0, 0, 0, 0],
      W: [0, 0, 0, 0, 0, 0, 0],
    },

    legacy: [false, false, false, false, false],
    protected: false,
    event: null,
    choiceQueue: [],
    log: [],
    sessionRows: [],
    researchRows: [],
    syncedTurnNumbers: [],
    remoteSessionId: null,
    startTurnNotes: [],
    turnPhase: "rules",
    gameOver: false,
    tutorialSeen: false,

    preferences: {
      skipProtection: $("skip-protection").checked,
      autoPrestige: $("auto-prestige").checked,
    },
  };
}

function saveGame() {
  if (!state || state.gameOver) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

function startGame(event) {
  event.preventDefault();

  state = createNewState();
  clearSavedGame();

  $("setup-screen").classList.add("hidden");
  $("game-screen").classList.remove("hidden");

  addLog("The playtest begins.");
  saveGame();
  startRemoteSession();

  if (state.firstGame) {
    showTutorial(() => beginTurn());
  } else {
    showRulesAndDice("rules", () => beginTurn());
  }
}

function addLog(message) {
  state.log.unshift(`Turn ${state.turn}: ${message}`);
}

function restoreSavedGame() {
  const saved = localStorage.getItem(SAVE_KEY);

  if (!saved) return false;

  try {
    state = JSON.parse(saved);
    // Innovation was added after the first playtest save format.
    state.innovation = Number.isInteger(state.innovation)
      ? state.innovation
      : 0;

    $("skip-protection").checked = Boolean(
      state.preferences?.skipProtection
    );

    $("auto-prestige").checked = Boolean(
      state.preferences?.autoPrestige
    );

    $("setup-screen").classList.add("hidden");
    $("game-screen").classList.remove("hidden");

    render();

    if (state.turnPhase === "event") {
      showEventReveal();
    } else {
      showSimpleModal(
        "Session restored",
        `Your saved game has resumed on Turn ${state.turn}.`
      );
    }

    return true;
  } catch {
    clearSavedGame();
    return false;
  }
}

$("setup-form").addEventListener("submit", startGame);

$("skip-protection").addEventListener("change", () => {
  if (!state) return;

  state.preferences.skipProtection = $("skip-protection").checked;
  saveGame();
});

$("auto-prestige").addEventListener("change", () => {
  if (!state) return;

  state.preferences.autoPrestige = $("auto-prestige").checked;
  saveGame();
});

$("dice-btn").addEventListener("click", () => showRulesAndDice("dice"));
$("achievements-btn").addEventListener("click", showAchievements);

function openSavedInnovationMenu() {
  if (!state || state.gameOver || state.innovation < 1 || !hasAvailableUpgrade()) return;

  showTechnologyUpgrade(null, false, () => {
    saveGame();
    render();
  });
}

$("technology-panel").addEventListener("click", openSavedInnovationMenu);
$("technology-panel").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openSavedInnovationMenu();
  }
});

$("new-game-btn").addEventListener("click", () => {
  clearSavedGame();
  location.reload();
});

$("clear-log").addEventListener("click", () => {
  if (!state) return;

  state.log = [];
  saveGame();
  render();
});

$("resolve-turn").addEventListener("click", resolveTurn);
$("download-csv").addEventListener("click", downloadCSV);
$("end-game").addEventListener("click", () =>
  endGame("Session ended early.")
);

loadLeaderboard();
restoreSavedGame();
function beginTurn() {
  if (state.gameOver) return;

  state.allocations = { F: 0, K: 0, H: 0, T: 0, W: 0 };
  state.protected = false;
  state.startTurnNotes = [];

  const completedProjects = [];

  state.kinProjects.forEach((project) => {
    project.turnsRemaining -= 1;

    if (project.turnsRemaining <= 0) {
      completedProjects.push(project);
    }
  });

  state.kinProjects = state.kinProjects.filter(
    (project) => project.turnsRemaining > 0
  );

  if (completedProjects.length) {
    state.people += completedProjects.length;

    const message = `${completedProjects.length} Kinship project${
      completedProjects.length === 1 ? "" : "s"
    } completed. The workers returned and ${
      completedProjects.length === 1
        ? "1 new person joined the community."
        : `${completedProjects.length} new people joined the community.`
    }`;

    addLog(message);
    state.startTurnNotes.push(message);
  }

  // Food above 20 spoils: 50% of the amount above 20, rounded down.
  if (state.food > 20) {
    const spoiledFood = Math.floor((state.food - 20) / 2);

    if (spoiledFood > 0) {
      state.food -= spoiledFood;

      const message = `${spoiledFood} Food spoiled in storage.`;
      addLog(message);
      state.startTurnNotes.push(message);
    }
  }

  state.event = currentEvent();
  tryAutoClaimLegacy();
  evaluateAchievements();

  state.turnPhase = "event";
  saveGame();
  render();
  showEventReveal();
}

function tryAutoClaimLegacy() {
  const era = currentEraIndex();
  const cost = LEGACY_COSTS[era];

  if (
    state.preferences.autoPrestige &&
    !state.legacy[era] &&
    state.prayer >= cost
  ) {
    state.prayer -= cost;
    state.legacy[era] = true;
    addLog(
      `Automatically claimed the Era ${era + 1} Legacy for ${cost} Prayer.`
    );
  }
}

function workersInProjects() {
  return state.kinProjects.reduce(
    (total, project) => total + project.people,
    0
  );
}

function allocatedPeople() {
  return Object.values(state.allocations).reduce(
    (total, amount) => total + amount,
    0
  );
}

// A loss while everyone is in Kinship cannot produce negative available workers.
function availablePeople() {
  return Math.max(
    0,
    state.people - workersInProjects() - allocatedPeople()
  );
}

function communityCapacity() {
  const legaciesPreserved = state.legacy.filter(Boolean).length;
  return Math.min(15, 7 + legaciesPreserved * 2);
}

function projectedCommunitySize() {
  // Every active or planned Kinship project reserves one future person.
  return (
    state.people +
    state.kinProjects.length +
    state.allocations.K / 2
  );
}

function canStartKinshipProject() {
  return projectedCommunitySize() < communityCapacity();
}

function ensureEraTurnHint() {
  let hint = $("era-turns-left");

  if (!hint) {
    hint = document.createElement("p");
    hint.id = "era-turns-left";
    hint.className = "era-turns-left";
    $("turn-label").insertAdjacentElement("afterend", hint);
  }

  const turnsLeft = turnsLeftInEra();

  hint.textContent = `${turnsLeft} turn${
    turnsLeft === 1 ? "" : "s"
  } left in Era ${currentEraIndex() + 1}`;
}

function render() {
  if (!state) return;

  const era = currentEraIndex();
  const available = availablePeople();
  const event = state.event || currentEvent();

  $("era-label").textContent = ERA_NAMES[era];
  $("turn-label").innerHTML = `Turn ${state.turn} <span>/ 100</span>`;

  ensureEraTurnHint();

  $("progress-text").textContent = `${Math.round(
    (state.turn / 100) * 100
  )}%`;

  $("progress-fill").style.width = `${Math.max(1, state.turn)}%`;

  $("event-title").textContent = event.title;
  $("event-description").textContent = event.description;
  $("event-type").textContent = `${huntTargetForThreat(event.threat)} · Threat ${event.threat}`;

  const eventLabels = eventEffectLabels(event);

  if (state.protected) {
    eventLabels.push("Protected by Prayer");
  }

  $("event-effects").innerHTML = eventLabels
    .map((label) => `<span>${label}</span>`)
    .join("");

  $("available-count").textContent = available;

  renderActions();
  renderResources();
  renderTechnologies();
  renderLegacy();
  renderLog();

  $("resolve-turn").disabled = available !== 0 || state.gameOver;

  $("allocation-warning").textContent =
    available > 0
      ? `Allocate ${available} more available ${
          available === 1 ? "person" : "people"
        } to continue.`
      : "All available people are assigned. Resolve the turn.";
}

function renderActions() {
  const actionsContainer = $("actions");
  const remaining = availablePeople();

  actionsContainer.innerHTML = "";

  ACTIONS.forEach((action) => {
    const assigned = state.allocations[action.id];
    const step = action.id === "K" ? 2 : 1;

    const card = document.createElement("article");
    card.className = `action-card ${assigned > 0 ? "active" : ""}`;

    card.innerHTML = `
      <div class="action-icon">${action.icon}</div>

      <div class="action-main">
        <div class="action-name-row">
          <h3>${action.name}</h3>
          <span class="action-count">${assigned}</span>
        </div>

        <p>${action.description}</p>

        <div class="action-meta">
          ${action.meta.map((item) => `<span>${item}</span>`).join("")}
        </div>
      </div>

      <div class="stepper">
        <button class="minus" aria-label="Remove person from ${action.name}">
          −
        </button>

        <button class="plus" aria-label="Add person to ${action.name}">
          +
        </button>
      </div>
    `;

    const minusButton = card.querySelector(".minus");
    const plusButton = card.querySelector(".plus");

    minusButton.disabled = assigned === 0;

    plusButton.disabled =
      remaining < step ||
      (action.id === "K" && !canStartKinshipProject());

    minusButton.addEventListener("click", () =>
      adjustAllocation(action.id, -step)
    );

    plusButton.addEventListener("click", () =>
      adjustAllocation(action.id, step)
    );

    actionsContainer.appendChild(card);
  });
}

function adjustAllocation(actionId, change) {
  if (!state || state.gameOver) return;

  const nextValue = state.allocations[actionId] + change;

  if (nextValue < 0) return;
  if (change > 0 && availablePeople() < change) return;

  if (actionId === "K" && change > 0 && !canStartKinshipProject()) {
    return;
  }

  state.allocations[actionId] = nextValue;
  state.turnPhase = "allocation";

  saveGame();
  render();
}

function renderResources() {
  const event = state.event || currentEvent();

  $("resources").innerHTML = `
    <div class="resource">
      <span class="resource-value">${state.people}</span>
      <span class="resource-label">People</span>
    </div>

    <div class="resource">
      <span class="resource-value">${communityCapacity()}</span>
      <span class="resource-label">Capacity</span>
    </div>

    <div class="resource">
      <span class="resource-value">${state.food}</span>
      <span class="resource-label">Food</span>
    </div>

    <div class="resource">
      <span class="resource-value">${state.prayer}</span>
      <span class="resource-label">Prayer</span>
    </div>

    <div class="resource">
      <span class="resource-value">${state.innovation}</span>
      <span class="resource-label">Innovation</span>
    </div>

    <div class="resource">
      <span class="resource-value">${event.threat}</span>
      <span class="resource-label">Threat</span>
    </div>
  `;
}

function renderTechnologies() {
  const materials = ["Stick", "Rope", "Rock"];

  $("tech-count").textContent = `${state.innovation} Innovation`;

  $("technologies").innerHTML = materials
    .map((material) => {
      const amount = state.materials[material];

      return `
        <div class="tech">
          <div class="tech-top">
            <span>${material}</span>
            <span>${amount}</span>
          </div>

          <div class="tech-pieces">
            ${[0, 1, 2]
              .map(
                (piece) =>
                  `<span class="${
                    piece < Math.min(amount, 3) ? "filled" : ""
                  }"></span>`
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderLegacy() {
  const era = currentEraIndex();
  const earned = state.legacy.filter(Boolean).length;

  $("prestige-total").textContent = `${earned} / 5 Legacy chips`;

  $("prestige-track").innerHTML = LEGACY_COSTS.map((cost, index) => {
    const isEarned = state.legacy[index];
    const isCurrent = index === era;

    let status = "Not available";

    if (isEarned) status = "Preserved";
    if (isCurrent && !isEarned) {
      status = `Current era · ${cost} Prayer`;
    }

    return `
      <div class="prestige-slot ${isEarned ? "earned" : ""} ${
        isCurrent ? "current-era" : ""
      }">
        <strong>${isEarned ? "◆" : "○"}</strong>
        <small>Era ${index + 1}</small>
        <small>${status}</small>

        ${
          isCurrent && !isEarned && !state.preferences.autoPrestige
            ? `<button class="text-button prestige-buy" data-era="${index}">
                Claim Era ${index + 1} Legacy by Turn ${eraEndTurn(index)} · ${cost} Prayer
              </button>`
            : ""
        }
      </div>
    `;
  }).join("");

  document.querySelectorAll(".prestige-buy").forEach((button) => {
    button.addEventListener("click", () =>
      claimLegacy(Number(button.dataset.era))
    );
  });
}

function claimLegacy(era, fromWarning = false) {
  const cost = LEGACY_COSTS[era];

  if (
    era !== currentEraIndex() ||
    state.legacy[era] ||
    state.prayer < cost
  ) {
    if (!fromWarning) {
      showSimpleModal(
        "Legacy unavailable",
        `The Era ${era + 1} Legacy costs ${cost} Prayer and can only be claimed during Era ${era + 1}.`
      );
    }

    return false;
  }

  state.prayer -= cost;
  state.legacy[era] = true;

  if (state.turn === eraStartTurn(era)) {
    awardAchievements(["first-era-claim"]);
  }

  addLog(`Claimed the Era ${era + 1} Legacy for ${cost} Prayer.`);

  saveGame();
  render();

  return true;
}

function renderLog() {
  $("game-log").innerHTML = state.log
    .slice(0, 30)
    .map((entry) => `<li>${entry}</li>`)
    .join("");
}

function showEventReveal() {
  const event = state.event;
  const effects = eventEffectLabels(event);
  const startNotes = state.startTurnNotes || [];

  const era = currentEraIndex();
  const cost = LEGACY_COSTS[era];

  const isFinalEraTurn = turnsLeftInEra() === 1;
  const needsLegacy = !state.legacy[era];

  let buttons = `
    <button id="event-continue" class="button button-primary">
      ${GAME_TEXT.eventContinue}
    </button>
  `;

  if (
    !event.firstTurn &&
    !state.preferences.skipProtection &&
    state.prayer >= 2
  ) {
    buttons = `
      <button id="event-protect" class="button button-secondary">
        ${GAME_TEXT.protectEvent}
      </button>
      ${buttons}
    `;
  }

  const deadlineWarning =
    isFinalEraTurn && needsLegacy
      ? `
        <div class="deadline-warning">
          <strong>Final turn of Era ${era + 1}</strong>
          <span>You must claim this era's Legacy before this turn ends or the session ends.</span>

          ${
            state.prayer >= cost
              ? `<button id="warning-claim-legacy" class="button button-secondary">
                  Claim Era ${era + 1} Legacy by Turn ${eraEndTurn(era)} · ${cost} Prayer
                </button>`
              : `<small>You need ${
                  cost - state.prayer
                } more Prayer.</small>`
          }
        </div>
      `
      : "";

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Turn ${state.turn} event</p>
      <h2>${event.title}</h2>
      <p>${event.description}</p>

      <div class="event-effects">
        ${effects.map((effect) => `<span>${effect}</span>`).join("")}
      </div>

      ${
        startNotes.length
          ? `<p class="modal-note"><strong>Before this event:</strong> ${startNotes.join(
              " "
            )}</p>`
          : ""
      }

      ${deadlineWarning}

      <p class="modal-note">
        Food, Hunt, and Prayer event modifiers apply once to that action's
        final total. Prayer protection ignores event effects, but never removes
        Hunt Threat.
      </p>

      <div class="modal-actions">${buttons}</div>
    </div>
  `;

  $("result-modal").showModal();

  $("event-continue").addEventListener("click", () => {
    applyEventFoodLoss();

    state.turnPhase = "allocation";
    saveGame();

    $("result-modal").close();
    render();
  });

  const protectButton = $("event-protect");

  if (protectButton) {
    protectButton.addEventListener("click", () => {
      state.prayer -= 2;
      state.protected = true;

      addLog(GAME_TEXT.protectedEvent);

      state.turnPhase = "allocation";
      saveGame();

      $("result-modal").close();
      render();
    });
  }

  const warningClaimButton = $("warning-claim-legacy");

  if (warningClaimButton) {
    warningClaimButton.addEventListener("click", () => {
      if (claimLegacy(era, true)) {
        showEventReveal();
      }
    });
  }
}

function applyEventFoodLoss() {
  const loss = state.event.foodLoss || 0;

  if (loss > 0 && !state.protected) {
    const actualLoss = Math.min(state.food, loss);

    state.food -= actualLoss;
    addLog(`The event caused the loss of ${actualLoss} Food.`);
  }
}

function showSimpleModal(title, description) {
  $("result-content").innerHTML = `
    <div class="result-inner">
      <h2>${title}</h2>
      <p>${description}</p>
      <button id="modal-close" class="button button-primary">Continue</button>
    </div>
  `;

  $("result-modal").showModal();

  $("modal-close").addEventListener("click", () =>
    $("result-modal").close()
  );
}

function rollDie(sides) {
  const index = Math.floor(Math.random() * sides.length);

  return {
    side: index + 1,
    value: sides[index],
  };
}

function upgradeLimit(die, side) {
  // W1/W2 transform to Devout Sacrifice and cannot improve again.
  if (die === "W" && (side === 1 || side === 2)) return 1;

  // Other physical die faces can be developed deeply over a long session.
  return 5;
}

function bonusFor(die, side) {
  return Math.min(
    upgradeLimit(die, side),
    state.upgrades[die][side] || 0
  );
}

function availableUpgradeChoices() {
  const choices = [];

  const foodFaces = [1, 1, 2, 2, 2, 3];

  foodFaces.forEach((baseValue, index) => {
    const side = index + 1;

    if (bonusFor("F", side) < upgradeLimit("F", side)) {
      choices.push({
        die: "F",
        side,
        label: `Food side ${side}`,
        description: `Current result: ${
          baseValue + bonusFor("F", side)
        } Food. Upgrade by +1.`,
      });
    }
  });

  [3, 4, 5, 6].forEach((side) => {
    if (bonusFor("H", side) < upgradeLimit("H", side)) {
      choices.push({
        die: "H",
        side,
        label: `Hunt side ${side}`,
        description: `Current result: ${
          side + bonusFor("H", side)
        }. Upgrade by +1.`,
      });
    }
  });

  [1, 2, 3, 4, 5, 6].forEach((side) => {
    if (bonusFor("W", side) >= upgradeLimit("W", side)) return;

    const sacrifice = side === 1 || side === 2;

    choices.push({
      die: "W",
      side,
      label: `Worship side ${side}`,
      description: sacrifice
        ? "Sacrifice → Devout Sacrifice. This side can only be upgraded once."
        : `Current result: ${
            1 + bonusFor("W", side)
          } Prayer. Upgrade by +1.`,
    });
  });

  return choices;
}

function hasAvailableUpgrade() {
  return availableUpgradeChoices().length > 0;
}

function innovationCost(choice) {
  // Each further improvement costs one more saved Innovation than the last.
  return (state.upgrades[choice.die][choice.side] || 0) + 1;
}

function convertReadyInnovationSets(research) {
  let completedSets = 0;
  while (hasAvailableUpgrade() && state.materials.Stick > 0 && state.materials.Rope > 0 && state.materials.Rock > 0) {
    state.materials.Stick -= 1;
    state.materials.Rope -= 1;
    state.materials.Rock -= 1;
    state.innovation += 1;
    completedSets += 1;
  }

  if (completedSets > 0) state.choiceQueue.unshift({ type: "technology", research });
  return completedSets;
}

function resolveTurn() {
  if (state.gameOver || availablePeople() !== 0) return;

  const event = state.event;
  const eventIsActive = !state.protected;
  const results = [];

  const research = {
    turn: state.turn,
    era: currentEraIndex() + 1,
    event: event.title,
    threat: event.threat,
    huntTarget: huntTargetForThreat(event.threat),
    protected: state.protected ? "Yes" : "No",

    gender: state.gender,
    age: Number($("age").value),
    gameExperience: state.gameExperience,
    firstGame: state.firstGame,

    peopleStart: state.people,
    foodStart: state.food,
    prayerStart: state.prayer,
    innovationStart: state.innovation,

    foodWorkers: state.allocations.F,
    kinshipWorkers: state.allocations.K,
    huntWorkers: state.allocations.H,
    technologyWorkers: state.allocations.T,
    worshipWorkers: state.allocations.W,

    foodRolls: [],
    huntRolls: [],
    technologyRolls: [],
    worshipRolls: [],
    upgradesChosen: [],
    sacrificeRewards: [],
  };

  let foodGained = 0;
  let huntRollTotal = 0;
  let prayerGained = 0;
  let skulls = 0;

  // FOOD: event modifier applies once to the completed Food total.
  for (let i = 0; i < state.allocations.F; i += 1) {
    const roll = rollDie([1, 1, 2, 2, 2, 3]);
    const value = roll.value + bonusFor("F", roll.side);

    foodGained += value;
    research.foodRolls.push(`F${roll.side}: ${roll.value}→${value}`);
  }

  if (state.allocations.F > 0 && eventIsActive && event.food) {
    foodGained = Math.max(0, foodGained + event.food);
  }

  if (state.allocations.F > 0) {
    state.food += foodGained;
    results.push(`Food: +${foodGained} Food.`);
  }

  // HUNT: must meet or exceed Threat. Skulls only punish a failed Hunt.
  for (let i = 0; i < state.allocations.H; i += 1) {
    const roll = rollDie(["Skull", "Skull", 3, 4, 5, 6]);
    const face = roll.value;

    if (face === "Skull") {
      skulls += 1;
      research.huntRolls.push(`H${roll.side}: Skull`);
    } else {
      const value = face + bonusFor("H", roll.side);

      huntRollTotal += value;
      research.huntRolls.push(`H${roll.side}: ${face}→${value}`);
    }
  }

  if (state.allocations.H > 0 && eventIsActive && event.hunt) {
    huntRollTotal = Math.max(0, huntRollTotal + event.hunt);
  }

  if (state.allocations.H > 0) {
    const successfulHunt = huntRollTotal >= event.threat;

    research.huntSkulls = skulls;
    research.huntTotal = huntRollTotal;
    research.huntOutcome = successfulHunt ? "Success" : "Failed";

    if (successfulHunt) {
      state.food += huntRollTotal;

      results.push(
        `Hunt: ${huntTargetForThreat(event.threat)} — ${huntRollTotal} total, ${skulls} Skull${
          skulls === 1 ? "" : "s"
        }, versus Threat ${event.threat}. Success: +${huntRollTotal} Food.`
      );
    } else if (skulls > 0) {
      state.people -= 1;

      results.push(
        `Hunt: ${huntTargetForThreat(event.threat)} — ${huntRollTotal} total, ${skulls} Skull${
          skulls === 1 ? "" : "s"
        }, versus Threat ${event.threat}. Failed: 1 person was lost.`
      );
    } else {
      results.push(
        `Hunt: ${huntTargetForThreat(event.threat)} — ${huntRollTotal} total, 0 Skulls, versus Threat ${
          event.threat
        }. Failed: no Food was gained, but no hunter was lost.`
      );
    }
  }

  // TECHNOLOGY
  for (let i = 0; i < state.allocations.T; i += 1) {
    const material = rollDie([
      "Stick",
      "Rope",
      "Rock",
      "Stick",
      "Rope",
      "Rock",
    ]).value;

    state.materials[material] += 1;
    research.technologyRolls.push(material);
  }

  if (research.technologyRolls.length) {
    results.push(
      `Technology: found ${research.technologyRolls.join(", ")}.`
    );
  }

  const completedSets = convertReadyInnovationSets(research);

  if (completedSets > 0) {
    results.push(`Technology: completed ${completedSets} set${completedSets === 1 ? "" : "s"} and saved ${completedSets} Innovation.`);
  }

  // WORSHIP: only one sacrifice resolves. A Devout result always takes priority.
  const sacrificeRolls = [];

  for (let i = 0; i < state.allocations.W; i += 1) {
    const roll = rollDie([1, 2, 3, 4, 5, 6]);
    const face = roll.value;

    if (face === 1 || face === 2) {
      const devout = state.upgrades.W[roll.side] > 0;
      sacrificeRolls.push({ devout, side: roll.side });

      research.worshipRolls.push(
        `W${roll.side}→${devout ? "Devout Sacrifice" : "Sacrifice"}`
      );

    } else {
      const value = 1 + bonusFor("W", roll.side);

      prayerGained += value;
      research.worshipRolls.push(`W${roll.side}→${value} Prayer`);
    }
  }

  if (prayerGained > 0 && eventIsActive && event.prayer) {
    prayerGained = Math.max(0, prayerGained + event.prayer);
  }

  if (prayerGained > 0) {
    state.prayer += prayerGained;
    results.push(`Worship: +${prayerGained} Prayer.`);
  }

  if (sacrificeRolls.length > 0) {
    const chosen = sacrificeRolls.find((roll) => roll.devout) || sacrificeRolls[0];
    const ignored = sacrificeRolls.length - 1;

    state.people -= 1;
    state.choiceQueue.push({
      type: chosen.devout ? "devoutSacrifice" : "sacrifice",
      research,
    });
    results.push(
      `Worship: 1 person was sacrificed for a ${chosen.devout ? "Devout Sacrifice" : "Sacrifice"}.` +
      (ignored > 0
        ? ` ${ignored} additional Sacrifice roll${ignored === 1 ? "" : "s"} gave 0 Prayer and caused no further loss.`
        : "") +
      " Choose a reward."
    );
  }


  // KINSHIP
  const projectsStarted = state.allocations.K / 2;

  if (projectsStarted > 0) {
    const projectLength =
      3 + (eventIsActive ? event.kinship || 0 : 0);

    for (let i = 0; i < projectsStarted; i += 1) {
      state.kinProjects.push({
        people: 2,
        turnsRemaining: projectLength,
      });
    }

    research.projectsStarted = projectsStarted;

    results.push(
      `Kinship: began ${projectsStarted} project${
        projectsStarted === 1 ? "" : "s"
      }. Each requires ${projectLength} turns.`
    );
  }

  // Feeding
  if (state.people > 0) {
    if (state.food >= state.people) {
      state.food -= state.people;
      results.push(`The community ate ${state.people} Food.`);
    } else {
      state.people -= 1;
      state.food = 0;
      results.push("There was not enough Food. 1 person was lost.");
    }
  }

  // Record milestones before upkeep consumes Food or causes a hunger loss.
  evaluateAchievements({ huntSkulls: skulls });

  research.peopleEnd = state.people;
  research.foodEnd = state.food;
  research.prayerEnd = state.prayer;
  research.innovationEnd = state.innovation;
  research.result = results.join(" ");

  state.researchRows.push(research);

  state.sessionRows.push({
    turn: research.turn,
    era: research.era,
    event: research.event,
    threat: research.threat,
    protected: research.protected,
    gender: research.gender,
    age: Number($("age").value),
    gameExperience: research.gameExperience,
    firstGame: research.firstGame,
    foodWorkers: research.foodWorkers,
    kinshipWorkers: research.kinshipWorkers,
    huntWorkers: research.huntWorkers,
    technologyWorkers: research.technologyWorkers,
    worshipWorkers: research.worshipWorkers,
    people: research.peopleEnd,
    food: research.foodEnd,
    prayer: research.prayerEnd,
    innovation: research.innovationEnd,
    huntTarget: research.huntTarget,
    result: research.result,
  });

  results.forEach((result) => addLog(result));

  state.turnPhase = "results";
  saveGame();

  showTurnResults(results);
}

function showTurnResults(results) {
  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Turn ${state.turn} resolved</p>
      <h2>What happened</h2>

      <ul class="result-list">
        ${results.map((result) => `<li>${result}</li>`).join("")}
      </ul>

      <button id="results-continue" class="button button-primary">
        Continue <span>→</span>
      </button>
    </div>
  `;

  $("result-modal").showModal();

  $("results-continue").addEventListener("click", () => {
    $("result-modal").close();

    if (state.people <= 0) {
      endGame("Your community no longer has any people.");
      return;
    }

    processChoiceQueue();
  });
}

function processChoiceQueue() {
  if (state.choiceQueue.length === 0) {
    finishTurn();
    return;
  }

  const choice = state.choiceQueue.shift();
  saveGame();

  if (choice.type === "technology") {
    showTechnologyUpgrade(choice.research, choice.free === true);
  }

  if (choice.type === "material") {
    showMaterialChoice(choice.research);
  }

  if (choice.type === "kinshipOne") {
    showOneKinshipChoice(choice.research);
  }

  if (choice.type === "sacrifice") {
    showSacrificeChoice(false, choice.research);
  }

  if (choice.type === "devoutSacrifice") {
    showSacrificeChoice(true, choice.research);
  }
}

function finishTurn() {
  const latestTurn = state.researchRows[state.researchRows.length - 1];

  // Sacrifice rewards may have changed these after the initial resolution.
  if (latestTurn) {
    latestTurn.peopleEnd = state.people;
    latestTurn.foodEnd = state.food;
    latestTurn.prayerEnd = state.prayer;
    latestTurn.innovationEnd = state.innovation;

    syncTurnToSupabase(latestTurn);
  }

  const era = currentEraIndex();

  if (state.turn === eraEndTurn(era) && !state.legacy[era]) {
    showFinalLegacyChoice(era);
    return;
  }

  advanceTurn();
}

function showFinalLegacyChoice(era) {
  const cost = LEGACY_COSTS[era];
  const canClaim = state.prayer >= cost;

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Era ${era + 1} ending</p>
      <h2>Claim Legacy or the session ends</h2>

      <p>
        This was the final turn of Era ${era + 1}. To reach Turn 100,
        the community must preserve one Sacred Legacy in every era.
      </p>

      ${
        canClaim
          ? `<button id="final-claim" class="button button-primary">
              Claim Era ${era + 1} Legacy by Turn ${eraEndTurn(era)} · ${cost} Prayer
            </button>`
          : `<p class="modal-note">You have ${state.prayer} Prayer but need ${cost}.</p>`
      }

      <button id="final-end" class="button button-ghost">
        End session
      </button>
    </div>
  `;

  $("result-modal").showModal();

  const claim = $("final-claim");

  if (claim) {
    claim.addEventListener("click", () => {
      claimLegacy(era, true);
      $("result-modal").close();
      advanceTurn();
    });
  }

  $("final-end").addEventListener("click", () => {
    endGame(`The Era ${era + 1} Legacy was not claimed in time.`);
  });
}

function advanceTurn() {
  evaluateAchievements();
  state.turn += 1;

  if (state.turn > 100) {
    endGame(
      state.legacy.every(Boolean)
        ? "Victory. Your community reached Turn 100 with one Sacred Legacy from every era."
        : "Turn 100 has ended, but not every Era Legacy was preserved."
    );

    return;
  }

  beginTurn();
}

function currentUpgrade(die, face) {
  return state ? bonusFor(die, face) : 0;
}

function dieGridHTML({ selectable = false, choices = [] } = {}) {
  const choiceFor = (die, side) =>
    choices.find((choice) => choice.die === die && choice.side === side);
  const face = (die, side, content, extraClass = "") => {
    const choice = choiceFor(die, side);
    const base = die === "F" ? [1, 1, 2, 2, 2, 3][side - 1] : die === "H" ? side : die === "W" && side > 2 ? 1 : "Sacrifice";
    const detail = choice
      ? `${choice.label}. Original: ${base}${die === "F" ? " Food" : die === "W" && side > 2 ? " Prayer" : ""}. Upgrade history: +${bonusFor(die, side)}. ${choice.description} Cost: ${innovationCost(choice)} Innovation.`
      : `${die}${side}. This face cannot be upgraded further.`;
    const attrs = selectable && choice
      ? ` type="button" class="die-face upgrade-die-face ${extraClass}" data-die="${die}" data-side="${side}" aria-label="${escapeHTML(detail)}" title="${escapeHTML(detail)}"`
      : ` class="die-face ${extraClass}" title="${escapeHTML(detail)}"`;
    const tag = selectable && choice ? "button" : "div";
    return `<${tag}${attrs}><small>${die}${side}</small><strong>${content}</strong><span class="face-detail">${escapeHTML(detail)}</span></${tag}>`;
  };
  const foodFaces = [1, 1, 2, 2, 2, 3]
    .map(
      (value, index) => face("F", index + 1, `${value + currentUpgrade("F", index + 1)} Food`)
    )
    .join("");

  const huntFaces = ["Skull", "Skull", 3, 4, 5, 6]
    .map((value, index) => {
      if (value === "Skull") {
        return face("H", index + 1, "Skull", "danger-face");
      }

      return face("H", index + 1, value + currentUpgrade("H", index + 1));
    })
    .join("");

  const technologyFaces = [
    "Stick",
    "Rope",
    "Rock",
    "Stick",
    "Rope",
    "Rock",
  ]
    .map(
      (value, index) => face("T", index + 1, value)
    )
    .join("");

  const worshipFaces = [1, 2, 3, 4, 5, 6]
    .map((value, index) => {
      const side = index + 1;

      if (value === 1 || value === 2) {
        const label =
          state && state.upgrades.W[side] > 0
            ? "Devout Sacrifice"
            : "Sacrifice";

        return face("W", side, label, "sacrifice-face");
      }

      return face("W", side, `${1 + currentUpgrade("W", side)} Prayer`);
    })
    .join("");

  return `
    <div class="dice-reference-grid">
      <section class="die-panel">
        <h3>Food die</h3>
        <p>Each result is Food before a once-per-turn event modifier.</p>
        <div class="die-faces">${foodFaces}</div>
      </section>

      <section class="die-panel">
        <h3>Hunt die</h3>
        <p>Numeric results make the Hunt total. Skulls make failed Hunts dangerous.</p>
        <div class="die-faces">${huntFaces}</div>
      </section>

      <section class="die-panel">
        <h3>Technology die</h3>
        <p>One Stick, one Rope, and one Rock create a Technology set and save 1 Innovation.</p>
        <div class="die-faces">${technologyFaces}</div>
      </section>

      <section class="die-panel">
        <h3>Worship die</h3>
        <p>W1/W2 are Sacrifice. W3–W6 each give 1 Prayer unless upgraded.</p>
        <div class="die-faces">${worshipFaces}</div>
      </section>
    </div>
  `;
}

function showTechnologyUpgrade(research, isFree = false, onComplete = processChoiceQueue) {
  const choices = availableUpgradeChoices().filter(
    (choice) => isFree || innovationCost(choice) <= state.innovation
  );

  if (choices.length === 0) {
    onComplete();
    return;
  }

  $("result-content").innerHTML = `
    <div class="result-inner upgrade-modal">
      <p class="eyebrow">${isFree ? "Devout Sacrifice" : "Technology complete"}</p>
      <h2>Choose a permanent upgrade</h2>
      <p>${isFree ? "Choose a face for your free Innovation." : `You have ${state.innovation} saved Innovation. Choose a face to spend it, or save it for a later stronger upgrade.`}</p>
      <p class="modal-note">Hover or focus a face to inspect its original result, upgrade history, and cost. On touch screens, tap a face to choose it. W1/W2 can only become Devout once; Hunt Skulls cannot be upgraded.</p>
      ${dieGridHTML({ selectable: true, choices })}
      ${isFree ? "" : '<button id="save-innovation" class="button button-ghost save-innovation">Save Innovation for later</button>'}
    </div>
  `;

  $("result-modal").showModal();

  document.querySelectorAll(".upgrade-die-face").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = choices.find(
        (candidate) => candidate.die === button.dataset.die && candidate.side === Number(button.dataset.side)
      );

      if (!isFree) {
        const cost = innovationCost(choice);
        if (state.innovation < cost) return;
        state.innovation -= cost;
      }

      state.upgrades[choice.die][choice.side] += 1;
      evaluateAchievements();

      addLog(
        `${choice.label} was upgraded to +${
          state.upgrades[choice.die][choice.side]
        }${isFree ? " for free." : "."}`
      );

      if (research) {
        research.upgradesChosen.push(choice.label);
      }

      saveGame();
      $("result-modal").close();

      onComplete();
    });
  });

  const saveInnovation = $("save-innovation");
  if (saveInnovation) {
    saveInnovation.addEventListener("click", () => {
      addLog("Innovation was saved for a later upgrade.");
      saveGame();
      $("result-modal").close();
      onComplete();
    });
  }
}

function showMaterialChoice(research) {
  const materials = ["Stick", "Rope", "Rock"];

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Sacrifice reward</p>
      <h2>Choose one free material</h2>

      <div class="upgrade-choice-grid">
        ${materials
          .map(
            (material) => `
              <button
                class="choice-button material-choice"
                data-material="${material}"
              >
                <strong>${material} · ${state.materials[material]} held</strong>
                <small>Add one ${material} to your Technology materials.</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  $("result-modal").showModal();

  document.querySelectorAll(".material-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const material = button.dataset.material;

      state.materials[material] += 1;
      const completedSets = convertReadyInnovationSets(research);
      const message = `Sacrifice reward: gained 1 ${material}.${
        completedSets
          ? ` Completed ${completedSets} Innovation set${completedSets === 1 ? "" : "s"}.`
          : ""
      }`;
      addLog(message);

      if (research) {
        research.sacrificeRewards.push(message);
      }

      evaluateAchievements();
      saveGame();
      $("result-modal").close();

      processChoiceQueue();
    });
  });
}

function showOneKinshipChoice(research) {
  if (state.kinProjects.length === 0) {
    const message =
      "Sacrifice reward: no active Kinship project was available to finish.";

    addLog(message);

    if (research) {
      research.sacrificeRewards.push(message);
    }

    saveGame();
    processChoiceQueue();
    return;
  }

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Sacrifice reward</p>
      <h2>Finish one Kinship project</h2>
      <p>Choose which active project completes immediately.</p>

      <div class="upgrade-choice-grid">
        ${state.kinProjects
          .map(
            (project, index) => `
              <button
                class="choice-button kinship-choice"
                data-index="${index}"
              >
                <strong>Kinship project ${index + 1}</strong>
                <small>${project.turnsRemaining} turn${
                  project.turnsRemaining === 1 ? "" : "s"
                } remaining</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  $("result-modal").showModal();

  document.querySelectorAll(".kinship-choice").forEach((button) => {
    button.addEventListener("click", () => {
      state.kinProjects.splice(Number(button.dataset.index), 1);
      state.people += 1;

      const message =
        "Sacrifice reward: finished one Kinship project; its workers returned and 1 new person joined.";

      addLog(message);

      if (research) {
        research.sacrificeRewards.push(message);
      }

      evaluateAchievements();
      saveGame();
      $("result-modal").close();

      processChoiceQueue();
    });
  });
}

function showSacrificeChoice(isDevout, research) {
  const rewards = isDevout
    ? [
        {
          title: "+10 Food",
          description: "Immediately add 10 Food.",
          apply: () => {
            state.food += 10;
            return "Devout Sacrifice reward: +10 Food.";
          },
        },
        ...(hasAvailableUpgrade()
          ? [
              {
                title: "+1 Innovation",
                description: "Add 1 saved Innovation; you may spend it now or save it for later.",
                apply: () => {
                  state.innovation += 1;
                  state.choiceQueue.unshift({
                    type: "technology",
                    research,
                  });

                  return "Devout Sacrifice reward: +1 saved Innovation.";
                },
              },
            ]
          : []),
        {
          title: "Finish all Kinship projects",
          description:
            "Every active Kinship project completes immediately.",
          apply: () => {
            const projects = state.kinProjects.length;

            state.kinProjects = [];
            state.people += projects;

            return `Devout Sacrifice reward: finished ${projects} active Kinship project${
              projects === 1 ? "" : "s"
            } and gained ${projects} new person${
              projects === 1 ? "" : "s"
            }.`;
          },
        },
      ]
    : [
        {
          title: "+5 Food",
          description: "Immediately add 5 Food.",
          apply: () => {
            state.food += 5;
            return "Sacrifice reward: +5 Food.";
          },
        },
        {
          title: "1 free material",
          description: "Choose one Stick, Rope, or Rock.",
          apply: () => {
            state.choiceQueue.unshift({
              type: "material",
              research,
            });

            return "Sacrifice reward: choose 1 free material.";
          },
        },
        {
          title: `Finish one Kinship project · ${state.kinProjects.length} active`,
          description:
            state.kinProjects.length > 0
              ? `Choose 1 of the ${state.kinProjects.length} outstanding Kinship projects to finish immediately.`
              : "No Kinship projects are currently active.",
          apply: () => {
            state.choiceQueue.unshift({
              type: "kinshipOne",
              research,
            });

            return "Sacrifice reward: choose 1 Kinship project to finish.";
          },
        },
      ];

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">${
        isDevout ? "Devout Sacrifice" : "Sacrifice"
      }</p>

      <h2>${
        isDevout
          ? "A devout sacrifice is offered"
          : "A sacrifice is offered"
      }</h2>

      <p>Choose one reward for your community.</p>

      <div class="upgrade-choice-grid">
        ${rewards
          .map(
            (reward, index) => `
              <button
                class="choice-button sacrifice-choice"
                data-index="${index}"
              >
                <strong>${reward.title}</strong>
                <small>${reward.description}</small>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  $("result-modal").showModal();

  document.querySelectorAll(".sacrifice-choice").forEach((button) => {
    button.addEventListener("click", () => {
      const message = rewards[Number(button.dataset.index)].apply();

      addLog(message);

      if (research) {
        research.sacrificeRewards.push(message);
      }

      evaluateAchievements();
      saveGame();
      $("result-modal").close();

      processChoiceQueue();
    });
  });
}

function rulesHTML() {
  return `
    <div class="rules-copy">
      <h3>Your goal</h3>
      <p>
        Survive to Turn 100 and preserve one Sacred Legacy in every era.
        A Legacy may only be claimed during its own era.
      </p>

      
      </p>

      <h3>Food and spoilage</h3>
      <p>
        At the end of every turn, each person eats 1 Food. If the community
        cannot feed everyone, 1 person is lost. At the beginning of a turn,
        Food above 20 spoils: lose 50% of the amount above 20, rounded down.
        For example, 28 Food loses 4 Food.
      </p>

      <h3>Hunting and Threat</h3>
      <p>
        A Hunt succeeds only when its numeric total meets or exceeds current
        Threat. If a Hunt fails and one or more Skulls were rolled, 1 person
        is lost. If it fails with no Skulls, no Food is gained but no hunter
        is lost.
      </p>

      <h3>Kinship</h3>
      <p>
        Assign exactly 2 people to one project. They remain unavailable for 3
        turns. When complete, the workers return and 1 new person joins the
        community. Some events increase the project time.
      </p>

      <h3>Community Capacity</h3>
      <p>
        The community begins able to sustain 7 people. Each Sacred Legacy
        preserved increases Capacity by 2, to a maximum of 15. Capacity
        represents the community’s ability to feed, organize, protect, and
        integrate new households. Active Kinship projects reserve their future
        person, so a new project cannot begin if it would exceed current
        Capacity.
      </p>

      <h3>Technology</h3>
      <p>
        Technology rolls give Stick, Rope, or Rock. One of each completes a
        set and saves 1 Innovation. A face's first upgrade costs 1 saved
        Innovation, and each next improvement costs one more than the last.
        Each physical eligible side can be upgraded five times, except W1/W2,
        which can only become Devout once. Hunt
        Skulls and Technology faces cannot be upgraded. Once every eligible
        upgrade is exhausted, Technology sets can no longer be completed.
      </p>

      <h3>Worship and Sacrifice</h3>
      <p>
        W1 and W2 are Sacrifice faces. Each may upgrade once into Devout
        Sacrifice. W3–W6 each produce 1 Prayer and can be individually
        upgraded five times. Only one Sacrifice resolves each turn: if a
        Devout Sacrifice was rolled, it takes priority. Any other Sacrifice
        rolls give 0 Prayer and cause no additional loss.
      </p>

      <p>
        Ordinary Sacrifice offers +5 Food, 1 free material, or finishing one
        Kinship project. A free material immediately forms Innovation if it
        completes a set. Devout Sacrifice offers +10 Food, one free Innovation
        when an eligible face remains, or finishing all active
        Kinship projects.
      </p>
      <h3>Events and modifiers</h3>
      <p>
        Every turn begins with a random event from the current era. Food,
        Hunt, and Worship events modify the final total from that action once,
        never every individual die. For example, Food rolls of 2, 2, and 3
        with “Food total +2” produce 9 Food—not 13.
      </p>
      <h3>Prayer and Sacred Legacy</h3>
      <p>
        Spend 2 Prayer before allocation to ignore an event’s effects, but
        Threat remains active. Legacy costs are 3, 5, 7, 9, and 11 Prayer for
        Eras I–V. Each Legacy must be claimed by Turns 7, 14, 30, 60, and 99
        respectively.
      </p>

      <h3>Saving and playtest data</h3>
      <p>
        Your game saves in this browser after every action. Refreshing resumes
        it. Resolved turns are also recorded for the playtest study when the
        game has an internet connection.
      </p>
    </div>
  `;
}

function showTutorial(onComplete) {
  const steps = [
    {
      title: "Assign your community",
      text: "Use the + and − controls to allocate every available person. Food, Hunt, Technology, and Worship roll their own die; Kinship uses pairs and keeps them busy until the project ends.",
    },
    {
      title: "Read the dice",
      text: "Each action card tells you what its die can do. Open Rules & dice at any time to inspect the current faces, including changes from upgrades.",
    },
    {
      title: "Preserve each era",
      text: "The game has five eras. Build Prayer, then claim that era's Prestige chip before its deadline—the claim button always states the final turn.",
    },
    {
      title: "Turn materials into upgrades",
      text: "Technology can find Stick, Rope, and Rock. One of each becomes Innovation. Spend it by selecting the Craft panel on the right to improve a die face permanently.",
    },
  ];
  let step = 0;

  const draw = () => {
    const current = steps[step];
    $("result-content").innerHTML = `
      <div class="result-inner tutorial-modal">
        <p class="eyebrow">First game · ${step + 1} of ${steps.length}</p>
        <h2>${current.title}</h2>
        <p>${current.text}</p>
        <div class="modal-actions">
          <button id="tutorial-next" class="button button-primary">${step === steps.length - 1 ? "Start Turn 1" : "Next"}</button>
          <button id="tutorial-skip" class="button button-ghost">Skip tutorial</button>
        </div>
      </div>`;
    $("result-modal").showModal();
    $("tutorial-next").addEventListener("click", () => {
      if (step === steps.length - 1) {
        state.tutorialSeen = true;
        saveGame();
        $("result-modal").close();
        onComplete();
      } else {
        step += 1;
        draw();
      }
    });
    $("tutorial-skip").addEventListener("click", () => {
      state.tutorialSeen = true;
      saveGame();
      $("result-modal").close();
      onComplete();
    });
  };
  draw();
}

function showRulesAndDice(page = "dice", onClose = null) {
  const rulesActive = page === "rules";

  $("result-content").innerHTML = `
    <div class="result-inner reference-modal">
      <p class="eyebrow">Kinship reference</p>
      <h2>${rulesActive ? "Rules" : "Current dice"}</h2>

      <div class="reference-tabs">
        <button
          id="rules-tab"
          class="reference-tab ${rulesActive ? "active" : ""}"
        >
          Rules
        </button>

        <button
          id="dice-tab"
          class="reference-tab ${rulesActive ? "" : "active"}"
        >
          Dice & upgrades
        </button>
      </div>

      <div class="reference-body">
        ${rulesActive ? rulesHTML() : dieGridHTML()}
      </div>

      <button id="reference-close" class="button button-primary">
        ${onClose ? "Begin Turn 1" : "Close"}
      </button>
    </div>
  `;

  $("result-modal").showModal();

  $("rules-tab").addEventListener("click", () =>
    showRulesAndDice("rules", onClose)
  );

  $("dice-tab").addEventListener("click", () =>
    showRulesAndDice("dice", onClose)
  );

  $("reference-close").addEventListener("click", () => {
    $("result-modal").close();

    if (onClose) {
      onClose();
    }
  });
}

async function endGame(reason) {
  if (state.turn === 2 && state.people <= 0) {
    awardAchievements(["lost-turn-two"]);
  }
  evaluateAchievements();
  state.gameOver = true;

  clearSavedGame();
  finishRemoteSession(reason);

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Session complete</p>

      <h2>${
        reason.startsWith("Victory")
          ? "The community endured"
          : "Session ended"
      }</h2>

      <p>${reason}</p>

      <div class="result-stats">
        <div>
          <strong>${state.turn}</strong>
          <span>Last turn</span>
        </div>

        <div>
          <strong>${state.legacy.filter(Boolean).length}/5</strong>
          <span>Legacy</span>
        </div>

        <div>
          <strong>${state.people}</strong>
          <span>People</span>
        </div>
      </div>

      <div class="modal-actions">
        <button id="end-download" class="button button-primary">
          Download session CSV
        </button>

        <button id="play-again" class="button button-secondary">
          Play again
        </button>

        <button id="end-close" class="button button-ghost">
          Close without downloading
        </button>
      </div>
    </div>
  `;

  $("result-modal").showModal();

  $("end-download").addEventListener("click", downloadCSV);

  $("play-again").addEventListener("click", () => {
    // Preserve the questionnaire answers, but every replay is no longer a first game.
    $("first-game").value = "no";
    $("result-modal").close();
    state = createNewState();
    clearSavedGame();
    addLog("A new playtest begins.");
    saveGame();
    startRemoteSession();
    showRulesAndDice("rules", () => beginTurn());
  });

  $("end-close").addEventListener("click", () =>
    $("result-modal").close()
  );

  render();
}

function downloadRowsAsCSV(rows, filename) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const quote = (value) =>
    `"${String(
      Array.isArray(value) ? value.join(" | ") : value ?? ""
    ).replaceAll('"', '""')}"`;

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => quote(row[header])).join(",")
    ),
  ].join("\n");

  const file = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function downloadCSV() {
  if (!state || !state.sessionRows.length) {
    showSimpleModal(
      "No game data yet",
      "Resolve at least one turn before downloading a session CSV."
    );

    return;
  }

  downloadRowsAsCSV(
    state.sessionRows,
    `kinship-session-${Date.now()}.csv`
  );
}

/* Hidden detailed researcher export: Ctrl + Shift + D */
document.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey &&
    event.shiftKey &&
    event.key.toLowerCase() === "d"
  ) {
    event.preventDefault();

    if (!state || !state.researchRows.length) return;

    downloadRowsAsCSV(
      state.researchRows,
      `kinship-detailed-research-${Date.now()}.csv`
    );
  }
});
