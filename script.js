"use strict";

/*
  KINSHIP
  Player-facing wording is in GAME_TEXT, ACTIONS, EVENT_DECKS, and rulesHTML().
*/

const SAVE_KEY = "kinship-playtest-save-v8";
const ACHIEVEMENTS_KEY = "kinship-playtest-achievements-v1";
const PARTICIPANT_ID_KEY = "kinship-playtest-participant-v1";
const PARTICIPANT_PROFILE_KEY = "kinship-playtest-profile-v1";
const MAX_PRAYER = 11;
const PROTECTION_COST = 2;
const FOOD_FACES = [1, 1, 1, 2, 2, 2];
const THREAT_RANGES = [
  [2, 6],
  [5, 8],
  [8, 12],
  [12, 15],
  [15, 20],
];
const LEADERBOARD_METRICS = {
  survival: { title: "Longest surviving", field: "turns_survived" },
  successful_hunts: { title: "Most successful hunts", field: "successful_hunts" },
  hunt_deaths: { title: "Most hunt deaths", field: "hunt_deaths" },
  legacy_chips: { title: "Most Sacred Legacies", field: "legacy_chips" },
  peak_innovation: { title: "Highest Innovation", field: "peak_innovation" },
};
let activeLeaderboardMetric = "survival";
const CHOICE_EVENT_SCHEDULES = [
  { id: "buried_toolkit", era: 0, minimumTurn: 2, maximumTurn: 6 },
  { id: "aggressive_missionary", era: 1, minimumTurn: 9, maximumTurn: 13 },
  { id: "forgotten_archive", era: 2, minimumTurn: 17, maximumTurn: 27 },
  { id: "season_of_plenty", era: 3, minimumTurn: 35, maximumTurn: 50 },
  { id: "distant_hearths", era: 4, minimumTurn: 65, maximumTurn: 94 },
];

const GAME_TEXT = {
  firstTurnTitle: "First Turn",
  firstTurnDescription:
    "The community begins with a clear view of the road ahead. No event occurs this turn.",
  eventContinue: "Continue to allocation",
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
  { id: "devout-heretic", name: "Devout Heretic", shape: "crescent", description: "Assign someone to Worship while holding the maximum 11 Prayer." },
  { id: "fifty-food", name: "Winter Larder", shape: "shield", description: "Store 50 Food at once." },
  { id: "ten-material", name: "Unlucky Researcher", shape: "knot", description: "Hold 10 of a single Technology material." },
  { id: "five-upgrades", name: "In for the Long Haul", shape: "diamond", description: "Make 5 upgrades in one game." },
  { id: "fifteen-upgrades", name: "Upgrades, People", shape: "diamond", description: "Make 15 upgrades in one game." },
  { id: "twenty-five-upgrades", name: "The Future Is Now", shape: "diamond", description: "Make 25 upgrades in one game." },
  { id: "turn-25", name: "Back from the Brink", shape: "sun", description: "Reach Turn 25." },
  { id: "turn-50", name: "Getting Your Footing", shape: "sun", description: "Reach Turn 50." },
  { id: "turn-100", name: "What Now?", shape: "sun", description: "Reach Turn 100." },
  { id: "first-era-claim", name: "Doorstep", shape: "gate", description: "Claim an era's Prestige chip on its first turn." },
  { id: "five-skulls", name: "Land of the Dead", shape: "star", rare: true },
  { id: "face-five-upgrades", name: "The Gambler", shape: "anvil", rare: true },
  { id: "lost-turn-three", name: "Empty Chair", shape: "eclipse", description: "Lose the community on Turn 3.", rare: true, ultraRare: true },
  { id: "last-convert", name: "The Last Convert", shape: "eclipse", description: "Lose your final person to the Aggressive Missionary.", ultraRare: true },
];

/*
  Food, Hunt, and Prayer modifiers apply ONCE to the action's final total.
  Food values, Hunt Threat, and event modifiers are balanced by era below.
*/
const EVENT_DECKS = [
  [
    {
      title: "Thawing Ground",
      description:
        "Half-frozen soil gives way underfoot. Your final Food total is reduced by 2 this turn.",
      threat: 3,
      food: -2,
    },
    {
      title: "Fresh Tracks",
      description:
        "Clear tracks cross the valley floor. Your final Hunt total gains +2 this turn.",
      threat: 5,
      hunt: 2,
    },
    {
      title: "Leaking Storehouse",
      description: "Rain finds a seam in the storehouse roof. Lose 2 Food.",
      threat: 3,
      foodLoss: 2,
    },
    {
      title: "Shale Crossing",
      description:
        "Loose shale scatters the hunters' approach. Your final Hunt total is reduced by 3 this turn.",
      threat: 4,
      hunt: -3,
    },
    {
      title: "Split Gathering Baskets",
      description: "Several baskets split on the trail. Your final Food total is reduced by 1 this turn.",
      threat: 5,
      food: -1,
    },
    {
      title: "Fallen Marker Stones",
      description: "The route to a neighboring camp must be found again. Kinship projects take 1 additional turn.",
      threat: 6,
      kinship: 1,
    },
    {
      title: "Root Cellar",
      description: "A sheltered patch of roots survives the cold. Your final Food total gains +1 this turn.",
      threat: 2,
      food: 1,
    },
  ],
  [
    {
      title: "Smoke on the Ridge",
      description:
        "Smoke from a distant burn hangs over the gathering grounds. Your final Food total is reduced by 3 this turn.",
      threat: 7,
      food: -3,
    },
    {
      title: "Territorial Calls",
      description:
        "Unfamiliar calls carry through the trees. Your final Hunt total is reduced by 3 this turn.",
      threat: 8,
      hunt: -3,
    },
    {
      title: "Overpicked Meadow",
      description:
        "The usual gathering ground has been picked bare. Your final Food total is reduced by 2 this turn.",
      threat: 6,
      food: -2,
    },
    {
      title: "Mice in the Granary",
      description: "Small teeth find their way into the stored provisions.",
      threat: 5,
      foodLoss: 5,
    },
    {
      title: "Night Watch",
      description:
        "The camp keeps watch through the night. Kinship projects take 1 additional turn.",
      threat: 8,
      kinship: 1,
    },
    {
      title: "Unseasonal Hail",
      description: "Hard hail ruins a day's gathered plants. Your final Food total is reduced by 2 this turn.",
      threat: 7,
      food: -2,
    },
    {
      title: "Frayed Snares",
      description: "The best hunting lines need mending. Your final Hunt total is reduced by 2 this turn.",
      threat: 8,
      hunt: -2,
    },
  ],
  [
    {
      title: "Smoke-Hazed Valley",
      description:
        "A bitter haze settles over the valley and taints the stores. Your final Food total is reduced by 3, and 4 stored Food is lost.",
      threat: 10,
      food: -3,
      foodLoss: 4,
    },
    {
      title: "Herds Take the Pass",
      description:
        "Game has moved through a narrow, dangerous pass. Your final Hunt total is reduced by 4 this turn.",
      threat: 12,
      hunt: -4,
    },
    {
      title: "Fever Ward",
      description: "Caring for the sick delays community projects.",
      threat: 8,
      kinship: 1,
    },
    {
      title: "Burst Riverbank",
      description: "A swollen river tears through the lower stores.",
      threat: 11,
      foodLoss: 8,
    },
    {
      title: "Vigil of Embers",
      description:
        "An all-night vigil steadies the community. Your final Prayer gain gets +1 this turn.",
      threat: 9,
      prayer: 1,
    },
    {
      title: "Stalking Pack",
      description: "Predators shadow the hunting grounds. Your final Hunt total is reduced by 2 this turn.",
      threat: 12,
      hunt: -2,
    },
    {
      title: "Collapsed Larder",
      description: "A hillside storehouse gives way in the night. Lose 5 Food.",
      threat: 10,
      foodLoss: 5,
    },
  ],
  [
    {
      title: "Salted Earth",
      description:
        "The ground yields little after a season of hard weather. Your final Food total is reduced by 4 this turn.",
      threat: 12,
      food: -4,
    },
    {
      title: "Empty Seed Cache",
      description:
        "The seed cache is nearly bare. Your final Food total is reduced by 2 and 12 stored Food is lost.",
      threat: 15,
      food: -2,
      foodLoss: 12,
    },
    {
      title: "Rival Hunters",
      description:
        "Another band shadows every hunting route. Your final Hunt total is reduced by 5 this turn.",
      threat: 14,
      hunt: -5,
    },
    {
      title: "Long Convalescence",
      description:
        "Recovery stretches longer than anyone hoped. Kinship projects take 2 additional turns.",
      threat: 12,
      kinship: 2,
    },
    {
      title: "Border Cairns",
      description: "Fresh boundary markers force a long detour. Your final Hunt total is reduced by 3 this turn.",
      threat: 14,
      hunt: -3,
    },
    {
      title: "Darkened Sky",
      description: "A dim season smothers edible growth. Your final Food total is reduced by 3 this turn.",
      threat: 13,
      food: -3,
    },
    {
      title: "Broken Messenger Route",
      description: "Travel between camps becomes slow and uncertain. Kinship projects take 1 additional turn.",
      threat: 15,
      kinship: 1,
    },
  ],
  [
    {
      title: "Last Green Things",
      description:
        "The last edible growth fades from the valley. Your final Food total is reduced by 4 and 20 stored Food is lost.",
      threat: 18,
      food: -4,
      foodLoss: 20,
    },
    {
      title: "The Long Hunger",
      description: "Nothing remains in the old stores.",
      threat: 20,
      foodLoss: 50,
    },
    {
      title: "Herds Beyond the Horizon",
      description:
        "The familiar herds have moved beyond the horizon. Your final Hunt total is reduced by 7 this turn.",
      threat: 19,
      hunt: -7,
    },
    {
      title: "Camp Fever",
      description:
        "Illness spreads while food runs thin. Your final Food total is reduced by 2 and Kinship projects take longer.",
      threat: 17,
      food: -2,
      kinship: 2,
    },
    {
      title: "Hidden Granary",
      description:
        "A sealed granary is uncovered beneath an abandoned hearth. Your final Food total gains +2 this turn.",
      threat: 15,
      food: 2,
    },
    {
      title: "Sunless Storm",
      description: "A day without light halts most gathering. Your final Food total is reduced by 3 this turn.",
      threat: 19,
      food: -3,
    },
    {
      title: "Night Raid",
      description: "Desperate strangers find the hidden stores. Lose 25 Food.",
      threat: 18,
      foodLoss: 25,
    },
  ],
];

// Classic event text expands each era's deck without changing its modifiers.
// Each entry mirrors the event in the matching position in EVENT_DECKS.
const CLASSIC_EVENT_TEXT = [
  [
    { title: "Mild Winter", description: "Cold weather slows gathering. Your final Food total is reduced by 2 this turn." },
    { title: "Easy Trails", description: "Fresh tracks cut across the valley. Your final Hunt total gains +2 this turn." },
    { title: "Cold Rain", description: "The rain soaks kindling and stores. Lose 2 Food." },
    { title: "Rocky Terrain", description: "The hunt moves through difficult ground. Your final Hunt total is reduced by 3 this turn." },
    { title: "Broken Tools", description: "Gathering is slowed while tools are repaired. Your final Food total is reduced by 1 this turn." },
    { title: "Lost Path", description: "A familiar route vanishes beneath fallen branches. Kinship projects take 1 additional turn." },
    { title: "Foraging Patch", description: "A sheltered patch of roots is found. Your final Food total gains +1 this turn." },
  ],
  [
    { title: "Harsh Winter", description: "Gathering is slowed by bitter cold. Your final Food total is reduced by 3 this turn." },
    { title: "Predator Activity", description: "Hunters find signs of a dangerous rival. Your final Hunt total is reduced by 3 this turn." },
    { title: "Thin Forage", description: "The usual plants are sparse. Your final Food total is reduced by 2 this turn." },
    { title: "Spoiled Stores", description: "Part of the community's stored food is lost." },
    { title: "Restless Nights", description: "Anxious vigils disrupt the camp. Kinship projects take 1 additional turn." },
    { title: "Flash Frost", description: "A sudden frost spoils gathered plants. Your final Food total is reduced by 2 this turn." },
    { title: "Torn Nets", description: "The best hunting gear needs mending. Your final Hunt total is reduced by 2 this turn." },
  ],
  [
    { title: "Endless Winter", description: "Cold and hunger linger. Your final Food total is reduced by 3, and 4 stored Food is lost." },
    { title: "Dwindling Herds", description: "Finding game requires a longer and riskier hunt. Your final Hunt total is reduced by 4 this turn." },
    { title: "Illness", description: "Caring for the sick delays community projects." },
    { title: "Great Flood", description: "Floodwater carries away stored supplies." },
    { title: "Sheltered Ritual", description: "A protected gathering strengthens resolve. Your final Prayer gain gets +1 this turn." },
    { title: "Wolf Pack", description: "Predators circle the hunting grounds. Your final Hunt total is reduced by 2 this turn." },
    { title: "Mudslide", description: "A slope gives way and buries part of the stores. Lose 5 Food." },
  ],
  [
    { title: "Deep Freeze", description: "The land becomes difficult to work. Your final Food total is reduced by 4 this turn." },
    { title: "Famine", description: "Even successful gathering brings back little. Your final Food total is reduced by 2 and 12 stored Food is lost." },
    { title: "Predator Surge", description: "The hunt is shadowed by dangerous predators. Your final Hunt total is reduced by 5 this turn." },
    { title: "Widespread Illness", description: "Several projects slow while the community recovers." },
    { title: "Contested Ground", description: "Other groups force a long detour. Your final Hunt total is reduced by 3 this turn." },
    { title: "Ashfall", description: "Ash settles over the valley and smothers edible growth. Your final Food total is reduced by 3 this turn." },
    { title: "Fractured Trail", description: "Travel between camps becomes slow and uncertain. Kinship projects take 1 additional turn." },
  ],
  [
    { title: "Bitter Winter", description: "A final hard winter tests everything built. Your final Food total is reduced by 4 and 20 stored Food is lost." },
    { title: "Great Famine", description: "Food stores are devastated." },
    { title: "Vanishing Herds", description: "The last familiar hunting grounds have emptied. Your final Hunt total is reduced by 7 this turn." },
    { title: "Plague", description: "Illness and scarcity strike at once. Your final Food total is reduced by 2 and Kinship projects take longer." },
    { title: "Windfall Cache", description: "An old cache is uncovered before the storms. Your final Food total gains +2 this turn." },
    { title: "Blizzard", description: "Whiteout conditions halt most gathering. Your final Food total is reduced by 3 this turn." },
    { title: "Raided Stores", description: "Desperate rivals find the hidden stores. Lose 25 Food." },
  ],
];

let state = null;

const $ = (id) => document.getElementById(id);

function participantId(create = true) {
  const saved = localStorage.getItem(PARTICIPANT_ID_KEY);
  if (saved || !create) return saved;

  const id = crypto.randomUUID();
  localStorage.setItem(PARTICIPANT_ID_KEY, id);
  return id;
}

function saveParticipantProfile(profile) {
  localStorage.setItem(PARTICIPANT_PROFILE_KEY, JSON.stringify(profile));
}

function restoreParticipantProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(PARTICIPANT_PROFILE_KEY));
    if (!profile) return;

    $("player-name").value = profile.playerName || "";
    $("gender").value = profile.gender || "prefer_not_to_say";
    $("age-band").value = profile.ageBand || "";
    $("game-experience").value = profile.gameExperience || "never";

    if (participantId(false)) $("first-game").value = "no";
  } catch {
    localStorage.removeItem(PARTICIPANT_PROFILE_KEY);
  }
}

function earnedAchievements() {
  try {
    return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || {};
  } catch {
    return {};
  }
}

function awardAchievements(ids) {
  const earned = earnedAchievements();
  const newlyEarned = [];

  ids.forEach((id) => {
    if (!earned[id]) {
      earned[id] = true;
      newlyEarned.push(id);
    }
  });

  if (newlyEarned.length) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
    syncAchievements(newlyEarned);
  }
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

function achievementHTML(achievement, earned, progress = "") {
  const hidden = achievement.rare && !earned;
  return `
    <article class="achievement ${earned ? "earned" : "locked"} ${achievement.rare ? "rare" : ""}">
      <span class="achievement-badge shape-${achievement.shape}" aria-hidden="true">${earned ? "✦" : "?"}</span>
      <div>
        <strong>${earned ? achievement.name : hidden ? "Hidden achievement" : achievement.name}</strong>
        <small>${hidden ? "" : achievement.description || ""}</small>
        ${progress}
      </div>
      ${achievement.ultraRare ? '<em>Ultra rare</em>' : achievement.rare ? '<em>Rare</em>' : ""}
    </article>`;
}

function progressionAchievementHTML(ids, earned) {
  const milestones = ids.map((id) => ACHIEVEMENTS.find((achievement) => achievement.id === id));
  const completed = milestones.filter((achievement) => earned[achievement.id]).length;
  const target = milestones.find((achievement) => !earned[achievement.id]) || milestones[milestones.length - 1];
  const progress = `
    <div class="achievement-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${milestones.length}" aria-valuenow="${completed}" aria-label="${completed} of ${milestones.length} milestones complete">
      <span style="width: ${(completed / milestones.length) * 100}%"></span>
      <small>${completed} / ${milestones.length}</small>
    </div>`;

  return achievementHTML(target, completed === milestones.length, progress);
}

function showAchievements() {
  const earned = earnedAchievements();
  const complete = ACHIEVEMENTS.filter((achievement) => earned[achievement.id]).length;
  const upgradeIds = ["five-upgrades", "fifteen-upgrades", "twenty-five-upgrades"];
  const turnIds = ["turn-25", "turn-50", "turn-100"];
  const progressionIds = new Set([...upgradeIds, ...turnIds]);
  const standardAchievements = ACHIEVEMENTS.filter(
    (achievement) => !progressionIds.has(achievement.id) && !achievement.rare
  );
  const rareAchievements = ACHIEVEMENTS.filter((achievement) => achievement.rare);

  $("result-content").innerHTML = `
    <div class="result-inner reference-modal achievements-modal">
      <p class="eyebrow">Persistent record</p>
      <h2>Achievements <span class="achievement-total">${complete} / ${ACHIEVEMENTS.length}</span></h2>
      <p class="modal-note">Achievements remain unlocked across every game played in this browser.</p>
      <div class="achievement-list">
        ${standardAchievements.map((achievement) => achievementHTML(achievement, Boolean(earned[achievement.id]))).join("")}
        ${progressionAchievementHTML(upgradeIds, earned)}
        ${progressionAchievementHTML(turnIds, earned)}
        ${rareAchievements.map((achievement) => achievementHTML(achievement, Boolean(earned[achievement.id]))).join("")}
      </div>
      <button id="achievements-close" class="button button-primary">Close</button>
    </div>`;
  if (!$("result-modal").open) $("result-modal").showModal();
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

function randomInteger(minimum, maximum) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function scheduleChoiceEvents() {
  return Object.fromEntries(
    CHOICE_EVENT_SCHEDULES.map((event) => [
      event.id,
      randomInteger(event.minimumTurn, event.maximumTurn),
    ])
  );
}

function choiceEventForTurn() {
  const event = CHOICE_EVENT_SCHEDULES.find(
    (candidate) => state.choiceEventTurns?.[candidate.id] === state.turn
  );
  if (!event) return null;

  const details = {
    buried_toolkit: {
      title: "Buried Toolkit",
      description: "Half-buried tools gleam beneath the soil. Keep digging, or leave the find untouched.",
    },
    aggressive_missionary: {
      title: "Aggressive Missionary",
      description: "“Do you have a moment to speak about the Gods?” His smile does not make the question feel optional.",
    },
    forgotten_archive: {
      title: "Forgotten Archive",
      description: "A sealed archive promises knowledge, if the community can spare the resources to recover it.",
    },
    season_of_plenty: {
      title: "Season of Plenty",
      description: "A rare growing season offers a chance to invest in the community's future.",
    },
    distant_hearths: {
      title: "Distant Hearths",
      description: "A large neighboring community offers a final pact as new possibilities open beyond the valley.",
    },
  }[event.id];

  return { ...details, choiceEventId: event.id };
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

  const era = currentEraIndex();
  const deck = EVENT_DECKS[era].flatMap((event, index) => [
    event,
    { ...event, ...CLASSIC_EVENT_TEXT[era][index] },
  ]);
  const [minimumThreat, maximumThreat] = THREAT_RANGES[era];
  const threat =
    minimumThreat +
    Math.floor(Math.random() * (maximumThreat - minimumThreat + 1));

  const choiceEvent = choiceEventForTurn();
  if (choiceEvent) return { ...choiceEvent, threat };

  // Threat is intentionally independent from the event card and its modifier.
  return { ...deck[Math.floor(Math.random() * deck.length)], threat };
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
    participantId: state.participantId,
    condition: state.condition,
    openingNotes: state.openingNotes,
    gender: state.gender,
    ageBand: state.ageBand,
    gameExperience: state.gameExperience,
    firstGame: state.firstGame,
  });

  if (data?.sessionId) {
    state.remoteSessionId = data.sessionId;
    saveGame();
    await syncAchievements(Object.keys(earnedAchievements()));
    return data.sessionId;
  }

  return null;
}

async function syncAchievements(achievementIds) {
  const id = state?.participantId || participantId(false);
  if (!id || !achievementIds.length) return;

  await callKinshipSync("sync_achievements", {
    participantId: id,
    achievementIds,
  });
}

async function loadRemoteAchievements() {
  const id = participantId(false);
  if (!id) return;

  const data = await callKinshipSync("get_achievements", { participantId: id });
  if (!data?.achievementIds?.length) return;

  const earned = earnedAchievements();
  data.achievementIds.forEach((id) => {
    earned[id] = true;
  });
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
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

async function recordChoiceEventResponse(eventId, optionId, details = {}) {
  const sessionId = state.remoteSessionId || (await startRemoteSession());
  const choiceId = crypto.randomUUID();

  if (!sessionId) return choiceId;

  await callKinshipSync("record_choice_event", {
    sessionId,
    choice: {
      id: choiceId,
      turn: state.turn,
      era: currentEraIndex() + 1,
      eventId,
      eventTitle: state.event.title,
      optionId,
      details,
    },
  });

  return choiceId;
}

async function syncChoiceEventResolution(choiceId, resolvedTurn, resolution) {
  if (!choiceId || !state) return;

  const sessionId = state.remoteSessionId || (await startRemoteSession());
  if (!sessionId) return;

  await callKinshipSync("resolve_choice_event", {
    sessionId,
    choiceId,
    resolvedTurn,
    resolution,
  });
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
    endReason: reason,
    playerName: state.playerName,
    gender: state.gender,
    ageBand: state.ageBand,
    gameExperience: state.gameExperience,
  });

  if (data?.saved) await loadLeaderboard();
}

async function loadLeaderboard() {
  const data = await callKinshipSync("get_leaderboard", {
    metric: activeLeaderboardMetric,
  });

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
          <strong>${leaderboardValue(entry, activeLeaderboardMetric)}</strong>
        </li>
      `
    )
    .join("");
}

function leaderboardValue(entry, metric) {
  if (metric === "survival") {
    return `Turn ${entry.turns_survived} · ${entry.legacy_chips} Legacy · ${entry.final_people} people`;
  }

  const labels = {
    successful_hunts: "successful hunts",
    hunt_deaths: "hunt deaths",
    legacy_chips: "Legacies",
    peak_innovation: "Innovation",
  };
  return `${entry[LEADERBOARD_METRICS[metric].field]} ${labels[metric]}`;
}

function setLeaderboardMetric(metric) {
  if (!LEADERBOARD_METRICS[metric]) return;

  activeLeaderboardMetric = metric;
  $("leaderboard-title").textContent = LEADERBOARD_METRICS[metric].title;
  document.querySelectorAll("[data-leaderboard-metric]").forEach((button) => {
    const active = button.dataset.leaderboardMetric === metric;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("leaderboard-list").innerHTML =
    `<li class="leaderboard-empty">Loading records…</li>`;
  loadLeaderboard();
}

function escapeHTML(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function createNewState() {
  const profile = {
    playerName: $("player-name").value.trim() || "Player",
    gender: $("gender").value,
    ageBand: $("age-band").value,
    gameExperience: $("game-experience").value,
  };

  saveParticipantProfile(profile);

  return {
    ...profile,
    participantId: participantId(),
    condition: "standard",
    openingNotes: $("opening-notes").value.trim(),

    firstGame: $("first-game").value === "yes",

    turn: 1,
    people: 5,
    food: 7,
    prayer: 0,
    innovation: 0,

    allocations: { F: 0, K: 0, H: 0, T: 0, W: 0 },
    kinProjects: [],
    investments: [],
    choiceEventTurns: scheduleChoiceEvents(),
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
    startTurnChoiceResolutions: [],
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
    showRulesAndDice("rules", () => showTutorial(() => beginTurn()));
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
    state.participantId = state.participantId || participantId();
    // Innovation was added after the first playtest save format.
    state.innovation = Number.isInteger(state.innovation)
      ? state.innovation
      : 0;
    // Earlier Toolkit builds could briefly save an invalid negative Food total.
    state.food = Math.max(0, Number(state.food) || 0);
    state.investments = Array.isArray(state.investments) ? state.investments : [];
    state.choiceEventTurns = state.choiceEventTurns || scheduleChoiceEvents();
    state.startTurnChoiceResolutions = [];

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
document.querySelectorAll("[data-leaderboard-metric]").forEach((button) => {
  button.addEventListener("click", () =>
    setLeaderboardMetric(button.dataset.leaderboardMetric)
  );
});

function openSavedInnovationMenu() {
  if (!state || state.gameOver) return;

  if (state.turnPhase !== "allocation") {
    showSimpleModal(
      "Innovation is ready",
      "You may spend saved Innovation after the event is revealed and before resolving this turn's allocation."
    );
    return;
  }

  if (state.innovation < 1) {
    showSimpleModal(
      "No saved Innovation",
      "Complete a set of Stick, Rope, and Rock—or earn Innovation from a Devout Sacrifice—then return here to upgrade a die face."
    );
    return;
  }

  if (!hasAvailableUpgrade()) {
    showSimpleModal("All upgrades complete", "Every eligible die face has already been fully improved.");
    return;
  }

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

restoreParticipantProfile();
loadLeaderboard();
loadRemoteAchievements();
restoreSavedGame();
function beginTurn() {
  if (state.gameOver) return;

  state.allocations = { F: 0, K: 0, H: 0, T: 0, W: 0 };
  state.protected = false;
  state.startTurnNotes = [];
  state.startTurnChoiceResolutions = [];

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

  const completedInvestments = [];
  state.investments.forEach((investment) => {
    investment.turnsRemaining -= 1;
    if (investment.turnsRemaining <= 0) completedInvestments.push(investment);
  });
  state.investments = state.investments.filter(
    (investment) => investment.turnsRemaining > 0
  );

  completedInvestments.forEach((investment) => {
    let message = "";
    let resolution = {};
    if (investment.type === "season_food") {
      state.food += 20;
      message = "Season of Plenty: the stores ripened after spoilage; +20 Food.";
      resolution = { food_gained: 20 };
    } else if (investment.type === "season_people") {
      const newcomers = Math.min(
        3,
        Math.max(0, communityCapacity() - state.people)
      );
      state.people += newcomers;
      message = `Season of Plenty: the settlement party returned; ${newcomers} new person${newcomers === 1 ? "" : "s"} joined.`;
      resolution = { newcomers };
    } else if (investment.type === "hearth_expedition") {
      state.food += 20;
      state.innovation += 3;
      message = "Distant Hearths: the expedition returned with +20 Food and +3 saved Innovation.";
      resolution = { food_gained: 20, innovation_gained: 3 };
    }
    addLog(message);
    state.startTurnNotes.push(message);
    state.startTurnChoiceResolutions.push({
      choiceId: investment.choiceId,
      eventId: investment.eventId,
      resolution,
    });
    syncChoiceEventResolution(investment.choiceId, state.turn, resolution);
  });

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
  const kinshipWorkers = state.kinProjects.reduce(
    (total, project) => total + project.people,
    0
  );
  const investmentWorkers = state.investments.reduce(
    (total, investment) => total + (investment.people || 0),
    0
  );
  return kinshipWorkers + investmentWorkers;
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

function protectionCost() {
  return PROTECTION_COST;
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
  renderKinshipProjects();
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

  if (actionId === "W" && change > 0 && state.prayer >= MAX_PRAYER) {
    awardAchievements(["devout-heretic"]);
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
      <span class="resource-value">${state.prayer} / ${MAX_PRAYER}</span>
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

function renderKinshipProjects() {
  const projects = state.kinProjects;
  const investments = state.investments;
  const activeCount = projects.length + investments.length;
  $("kinship-count").textContent = activeCount
    ? `${activeCount} active`
    : "No projects";

  $("kinship-projects").innerHTML = activeCount
    ? [
        ...projects
        .map(
          (project, index) => `
            <div class="kinship-project">
              <span class="kinship-project-icon">🤝</span>
              <span>Project ${index + 1}</span>
              <strong>${project.turnsRemaining} turn${
                project.turnsRemaining === 1 ? "" : "s"
              } left</strong>
            </div>`
        ),
        ...investments.map(
          (investment) => `
            <div class="kinship-project">
              <span class="kinship-project-icon">${investment.type === "season_food" ? "🌱" : investment.type === "season_people" ? "🏡" : "🧭"}</span>
              <span>${investment.label}</span>
              <strong>${investment.turnsRemaining} turn${investment.turnsRemaining === 1 ? "" : "s"} left</strong>
            </div>`
        ),
      ].join("")
    : `<p class="kinship-empty">Assign 2 people to Kinship to begin a project.</p>`;
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

function startChoiceAllocation(message) {
  if (message) addLog(message);
  state.turnPhase = "allocation";
  saveGame();
  $("result-modal").close();
  render();
}

function choiceButton(id, label, description, disabled = false) {
  return `
    <button id="${id}" class="button button-secondary choice-button" ${disabled ? "disabled" : ""}>
      <strong>${label}</strong><small>${description}</small>
    </button>
  `;
}

async function finishChoice(eventId, optionId, details, message) {
  await recordChoiceEventResponse(eventId, optionId, details);
  startChoiceAllocation(message);
}

function archiveBreakthroughChoices() {
  const faces = [];
  FOOD_FACES.forEach((base, index) => {
    const side = index + 1;
    if (bonusFor("F", side) < 6) faces.push({ die: "F", side, label: `Food side ${side}`, value: base + bonusFor("F", side) });
  });
  [3, 4, 5, 6].forEach((side) => {
    if (bonusFor("H", side) < 6) faces.push({ die: "H", side, label: `Hunt side ${side}`, value: side + bonusFor("H", side) });
  });
  [3, 4, 5, 6].forEach((side) => {
    if (bonusFor("W", side) < 6) faces.push({ die: "W", side, label: `Worship side ${side}`, value: 1 + bonusFor("W", side) });
  });
  return faces;
}

function showArchiveBreakthrough() {
  const choices = archiveBreakthroughChoices();
  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Forgotten Archive</p>
      <h2>Choose a breakthrough</h2>
      <p>One eligible physical die face permanently gains +1, even if ordinary Innovation has already reached its usual limit.</p>
      <div class="modal-actions">${choices.map((choice, index) => choiceButton(`archive-face-${index}`, choice.label, `Current result: ${choice.value}. Gain +1.`)).join("")}</div>
    </div>
  `;
  if (!$("result-modal").open) $("result-modal").showModal();
  choices.forEach((choice, index) => {
    $(`archive-face-${index}`).addEventListener("click", async () => {
      state.upgrades[choice.die][choice.side] += 1;
      await finishChoice("forgotten_archive", "archive_breakthrough", {
        innovationSpent: 1,
        die: choice.die,
        side: choice.side,
        previousValue: choice.value,
        newValue: choice.value + 1,
      }, `The archive transformed ${choice.label}.`);
    });
  });
}

function showChoiceEvent() {
  const event = state.event;
  const effects = eventEffectLabels(event);
  const available = availablePeople();
  let choices = "";

  if (event.choiceEventId === "buried_toolkit") {
    const attempts = event.toolkitAttempts || [];
    const steps = [{ cost: 1, chance: 10 }, { cost: 2, chance: 25 }, { cost: 3, chance: 50 }, { cost: 4, chance: 75 }];
    const step = steps[attempts.length];
    choices = step
      ? `${choiceButton("toolkit-dig", `Keep digging: ${step.cost} Food`, `${step.chance}% chance to find 1 saved Innovation.`, state.food < step.cost)}
         ${choiceButton("choice-leave", "Leave it buried", "Continue without spending Food.")}`
      : choiceButton("choice-leave", "Leave the empty site", "Continue to allocation.");
  }

  if (event.choiceEventId === "aggressive_missionary") {
    choices = `
      ${choiceButton("missionary-innovation", "Offer 1 saved Innovation", "Receive 1 Prayer.", state.innovation < 1)}
      ${choiceButton("missionary-person", "Give up 1 person", "Receive 3 Prayer. This can be your last person.", state.people < 1)}
      ${choiceButton("missionary-food", "Offer 5 Food", "Receive 1 Prayer.", state.food < 5)}
      ${choiceButton("missionary-protect", "Turn him away: 2 Prayer", "Ignore his demand; Threat still applies.", state.prayer < 2)}
    `;
  }

  if (event.choiceEventId === "forgotten_archive") {
    choices = `
      ${choiceButton("archive-study", "Study the archive: 8 Food + 2 Prayer", "Receive 2 saved Innovation.", state.food < 8 || state.prayer < 2)}
      ${choiceButton("archive-breakthrough", "Apply a breakthrough: 1 saved Innovation", "Permanently improve one physical die side beyond its usual limit.", state.innovation < 1 || !archiveBreakthroughChoices().length)}
      ${choiceButton("choice-leave", "Leave it sealed", "Continue without changing the archive.")}
    `;
  }

  if (event.choiceEventId === "season_of_plenty") {
    choices = `
      ${choiceButton("season-food", "Store 5 Food", "After 5 turns, receive 20 Food after spoilage.", state.food < 5)}
      ${choiceButton("season-people", "Send 2 people", "After 5 turns, up to 3 newcomers join if capacity permits. The 2 people are unavailable until then.", available < 2)}
      ${choiceButton("choice-leave", "Let the season pass", "Continue without making an investment.")}
    `;
  }

  if (event.choiceEventId === "distant_hearths") {
    choices = `
      ${choiceButton("hearth-food", "Share 15 Food", "Up to 2 people join immediately, limited by Capacity.", state.food < 15)}
      ${choiceButton("hearth-innovation", "Trade 2 saved Innovation", "Receive 5 Prayer.", state.innovation < 2)}
      ${choiceButton("hearth-expedition", "Send an expedition of 3 people", "After 5 turns, it returns with 20 Food and 3 saved Innovation.", available < 3)}
      ${choiceButton("choice-leave", "Decline the pact", "Continue without making a trade.")}
    `;
  }

  $("result-content").innerHTML = `
    <div class="result-inner">
      <p class="eyebrow">Turn ${state.turn} decision</p>
      <h2>${event.title}</h2>
      <p>${event.description}</p>
      <div class="event-effects">${effects.map((effect) => `<span>${effect}</span>`).join("")}</div>
      <details class="modal-note">
        <summary>About this decision</summary>
        <p>This is a special opportunity rather than a normal event modifier. Delayed rewards appear beside Kinship projects and cannot be completed early by Sacrifice. Hunt Threat remains ${event.threat}.</p>
      </details>
      <div class="modal-actions">${choices}</div>
    </div>
  `;
  if (!$("result-modal").open) $("result-modal").showModal();

  const leave = $("choice-leave");
  if (leave) leave.addEventListener("click", () => finishChoice(event.choiceEventId, "declined", {}, "The opportunity was declined."));

  const dig = $("toolkit-dig");
  if (dig) dig.addEventListener("click", async () => {
    const steps = [{ cost: 1, chance: 10 }, { cost: 2, chance: 25 }, { cost: 3, chance: 50 }, { cost: 4, chance: 75 }];
    const step = steps[(event.toolkitAttempts || []).length];

    // Keep this check in the handler as well as on the button: a rapid click
    // must never turn an unaffordable excavation into negative Food.
    if (!step || state.food < step.cost) return;

    state.food -= step.cost;
    const found = Math.random() * 100 < step.chance;
    event.toolkitAttempts = [...(event.toolkitAttempts || []), { ...step, found }];
    if (found) {
      state.innovation += 1;
      await finishChoice(event.choiceEventId, "found_innovation", { attempts: event.toolkitAttempts }, "The buried toolkit yielded 1 saved Innovation.");
    } else if (event.toolkitAttempts.length === steps.length) {
      await finishChoice(event.choiceEventId, "exhausted_toolkit", { attempts: event.toolkitAttempts }, "The excavation found nothing more.");
    } else {
      saveGame();
      showChoiceEvent();
    }
  });

  const missionaryInnovation = $("missionary-innovation");
  if (missionaryInnovation) missionaryInnovation.addEventListener("click", async () => {
    state.innovation -= 1;
    const gained = Math.min(1, 11 - state.prayer); state.prayer += gained;
    await finishChoice(event.choiceEventId, "innovation_for_prayer", { innovationSpent: 1, prayerGained: gained }, "The missionary accepted an Innovation.");
  });
  const missionaryFood = $("missionary-food");
  if (missionaryFood) missionaryFood.addEventListener("click", async () => {
    state.food -= 5;
    const gained = Math.min(1, 11 - state.prayer); state.prayer += gained;
    await finishChoice(event.choiceEventId, "food_for_prayer", { foodSpent: 5, prayerGained: gained }, "The missionary accepted your stores.");
  });
  const missionaryProtect = $("missionary-protect");
  if (missionaryProtect) missionaryProtect.addEventListener("click", async () => {
    state.prayer -= 2; state.protected = true;
    await finishChoice(event.choiceEventId, "turned_away", { prayerSpent: 2 }, "The missionary was turned away.");
  });
  const missionaryPerson = $("missionary-person");
  if (missionaryPerson) missionaryPerson.addEventListener("click", async () => {
    state.people -= 1;
    const gained = Math.min(3, 11 - state.prayer); state.prayer += gained;
    await recordChoiceEventResponse(event.choiceEventId, "person_for_prayer", { peopleLost: 1, prayerGained: gained, lastPerson: state.people === 0 });
    if (state.people === 0) {
      awardAchievements(["last-convert"]);
      $("result-modal").close();
      endGame("The Aggressive Missionary took the final member of the community.");
    } else {
      startChoiceAllocation("One person departed with the missionary.");
    }
  });

  const archiveStudy = $("archive-study");
  if (archiveStudy) archiveStudy.addEventListener("click", async () => {
    state.food -= 8; state.prayer -= 2; state.innovation += 2;
    await finishChoice(event.choiceEventId, "studied_archive", { foodSpent: 8, prayerSpent: 2, innovationGained: 2 }, "The archive revealed 2 saved Innovation.");
  });
  const archiveBreakthrough = $("archive-breakthrough");
  if (archiveBreakthrough) archiveBreakthrough.addEventListener("click", () => { state.innovation -= 1; showArchiveBreakthrough(); });

  const seasonFood = $("season-food");
  if (seasonFood) seasonFood.addEventListener("click", async () => {
    state.food -= 5;
    const choiceId = await recordChoiceEventResponse(event.choiceEventId, "seasonal_food", { foodSpent: 5, expectedFood: 20, delayTurns: 5 });
    state.investments.push({ type: "season_food", label: "Seasonal stores · +20 Food", turnsRemaining: 5, people: 0, choiceId });
    startChoiceAllocation("Stores were set aside for the coming season.");
  });
  const seasonPeople = $("season-people");
  if (seasonPeople) seasonPeople.addEventListener("click", async () => {
    const choiceId = await recordChoiceEventResponse(event.choiceEventId, "settlement_party", { peopleCommitted: 2, expectedNewcomers: 3, delayTurns: 5 });
    state.investments.push({ type: "season_people", label: "Settlement party · up to +3 people", turnsRemaining: 5, people: 2, choiceId });
    startChoiceAllocation("Two people left to prepare a new settlement.");
  });

  const hearthFood = $("hearth-food");
  if (hearthFood) hearthFood.addEventListener("click", async () => {
    state.food -= 15;
    const newcomers = Math.min(2, Math.max(0, communityCapacity() - state.people)); state.people += newcomers;
    await finishChoice(event.choiceEventId, "shared_stores", { foodSpent: 15, newcomers }, `${newcomers} person${newcomers === 1 ? "" : "s"} joined the community.`);
  });
  const hearthInnovation = $("hearth-innovation");
  if (hearthInnovation) hearthInnovation.addEventListener("click", async () => {
    state.innovation -= 2;
    const gained = Math.min(5, 11 - state.prayer); state.prayer += gained;
    await finishChoice(event.choiceEventId, "traded_knowledge", { innovationSpent: 2, prayerGained: gained }, "The pact strengthened your divine legacy.");
  });
  const hearthExpedition = $("hearth-expedition");
  if (hearthExpedition) hearthExpedition.addEventListener("click", async () => {
    const choiceId = await recordChoiceEventResponse(event.choiceEventId, "sent_expedition", { peopleCommitted: 3, expectedFood: 20, expectedInnovation: 3, delayTurns: 5 });
    state.investments.push({ type: "hearth_expedition", label: "Distant expedition · +20 Food, +3 Innovation", turnsRemaining: 5, people: 3, choiceId });
    startChoiceAllocation("An expedition departed for the distant hearths.");
  });
}

function showEventReveal() {
  if (state.event.choiceEventId) {
    showChoiceEvent();
    return;
  }
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
    state.prayer >= protectionCost()
  ) {
    buttons = `
      <button id="event-protect" class="button button-secondary">
        Spend ${protectionCost()} Prayer to protect the community
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
      state.prayer -= protectionCost();
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

  const foodFaces = FOOD_FACES;

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
    protectionCost: state.protected ? protectionCost() : 0,

    gender: state.gender,
    ageBand: state.ageBand,
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
    const roll = rollDie(FOOD_FACES);
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
    const actualPrayerGained = Math.max(
      0,
      Math.min(MAX_PRAYER - state.prayer, prayerGained)
    );
    state.prayer += actualPrayerGained;

    if (actualPrayerGained > 0) {
      results.push(
        `Worship: +${actualPrayerGained} Prayer.${
          actualPrayerGained < prayerGained ? ` Prayer is capped at ${MAX_PRAYER}.` : ""
        }`
      );
    } else {
      results.push(`Worship: Prayer is already capped at ${MAX_PRAYER}; no Prayer was gained.`);
    }
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
    protectionCost: research.protectionCost,
    gender: research.gender,
    ageBand: research.ageBand,
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
    const base = die === "F" ? FOOD_FACES[side - 1] : die === "H" ? side : die === "W" && side > 2 ? 1 : "Sacrifice";
    const detail = choice
      ? `${choice.label}. Original: ${base}${die === "F" ? " Food" : die === "W" && side > 2 ? " Prayer" : ""}. Upgrade history: +${bonusFor(die, side)}. ${choice.description} Cost: ${innovationCost(choice)} Innovation.`
      : `${die}${side}. This face cannot be upgraded further.`;
    const attrs = selectable && choice
      ? ` type="button" class="die-face upgrade-die-face ${extraClass}" data-die="${die}" data-side="${side}" aria-label="${escapeHTML(detail)}" title="${escapeHTML(detail)}"`
      : ` class="die-face ${extraClass}" title="${escapeHTML(detail)}"`;
    const tag = selectable && choice ? "button" : "div";
    return `<${tag}${attrs}><small>${die}${side}</small><strong>${content}</strong><span class="face-detail">${escapeHTML(detail)}</span></${tag}>`;
  };
  const foodFaces = FOOD_FACES
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
      <h3>Gameplay Overview </h3>
      <p>
        After a series of devestating events, a once thriving civilization has dwindled down to just five people on the brink of extinction. As their fearless leader, you must guide them to survive
        across five eras. Feed the community, rebuild it through Kinship,
        advance your technology, and worship the gods to preserve your Sacred Legacy. Above all else, do what it takes to survive.
      </p>
      <div class="rules-example-grid">
        <article class="rules-example"><span>🌾</span><strong>Feed</strong><small>Food keeps people alive.</small></article>
        <article class="rules-example"><span>🤝</span><strong>Rebuild</strong><small>Kinship grows the community.</small></article>
        <article class="rules-example"><span>🛠</span><strong>Adapt</strong><small>Technology improves dice.</small></article>
        <article class="rules-example"><span>🕯</span><strong>Endure</strong><small>Prayer protects and claims Legacy.</small></article>
      </div>

      <h3>Food and spoilage</h3>
      <p>
        At the end of every turn, each person eats 1 Food. If the community
        cannot feed everyone, 1 person is lost.
        At the beginning of a turn, Food above 20 spoils: lose 50% of the amount above 20, rounded down.
        For example, 29 Food loses 4 Food.
      </p>

      <h3>Hunting and Threat</h3>
      <p>
        A Hunt succeeds only when the sum of all hunt rolls meets or exceeds the current
        Threat. If a Hunt fails and one or more Skulls were rolled, 1 person
        is lost. If it fails with no Skulls, no Food is gained but no hunter
        is lost.
      </p>
      <div class="rules-walkthrough">
        <strong>Example Hunt</strong>
        <div class="example-row"><span class="example-die">H3 · 3</span><span class="example-die">H5 · 5</span><span>→ 8 versus Threat 8: success, gain 8 Food.</span></div>
        <div class="example-row"><span class="example-die danger">Skull</span><span class="example-die">H3 · 3</span><span>→ 3 versus Threat 8: fail with a Skull, lose 1 person.</span></div>
      </div>

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
        Technology rolls produce Sticks, Ropes, or Rocks. One of each completes a
        set and saves 1 Innovation. Saved Innovation can be spent from the
        Craft panel before resolving allocation on
        any later turn. A face's first upgrade costs 1 saved
        Innovation, and each next improvement costs one more than the last.
        Each physical eligible side can be upgraded five times, except W1/W2,
        which can only become Devout once. Hunt
        Skulls and Technology faces cannot be upgraded. Once every eligible
        upgrade is exhausted, Technology sets can no longer be completed.
      </p>
      <div class="rules-walkthrough">
        <strong>Example Innovation</strong>
        <div class="example-row"><span class="example-die">Stick</span><span class="example-die">Rope</span><span class="example-die">Rock</span><span>→ automatically becomes 1 saved Innovation.</span></div>
        <div class="example-row"><span>Use it now, or save multiple sets for a stronger later improvement.</span></div>
      </div>

      <h3>Worship and Sacrifice</h3>
      <p>
        You've seen what divine cruelty can do to your civilization, after all that's why you're in this mess to begin with. You won't make the same mistake again.
        2 faces on the worship die are Sacrifice faces. Each may upgrade once into Devout
        Sacrifice. The other 4 faces each produce 1 Prayer and can be individually
        upgraded. Only one Sacrifice resolves each turn: if a
        Devout Sacrifice was rolled, it takes priority. Any other Sacrifice
        rolls give 0 Prayer and cause no additional loss.
      </p>

      <p>
        Ordinary Sacrifice offers +5 Food, 1 free material, or finishing one
        Kinship project. A free material immediately forms Innovation if it
        completes a set. Devout Sacrifice offers +10 Food, one free Innovation,
        or finishing all active
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
        Prayer is capped at ${MAX_PRAYER}. Spend 2 Prayer before allocation to ignore an event's effects. Protection never removes Threat. YOU MUST CLAIM THE SACRED LEGACY IN EACH ERA, OR YOUR CIVILIZATION WILL PERISH.
        Legacy costs are 3, 5, 7, 9, and 11 Prayer for Eras I–V, and each must be claimed by Turns 7, 14, 30, 60, and 99 respectively.
      </p>
      <div class="rules-walkthrough">
        <strong>Example Prayer choice</strong>
        <div class="example-row"><span class="example-die">Era III</span><span class="example-die">3 Prayer</span><span>→ protect the event effect; its Threat still applies to any Hunt.</span></div>
        <div class="example-row"><span>At 11 Prayer, Worship cannot add more. Spend Prayer on protection or the current Legacy to make room.</span></div>
      </div>
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
      text: "Explore what each die can do. Open Rules & dice at any time to inspect the current faces, including changes from upgrades.",
    },
    {
      title: "Preserve each era",
      text: "The game has five eras. Earn Prayer, then claim that era's Prestige chip before its deadline—the claim button always states the final turn in which it can be claimed.",
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
  if (state.turn === 3 && state.people <= 0) {
    awardAchievements(["lost-turn-three"]);
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
