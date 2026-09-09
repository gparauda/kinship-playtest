from __future__ import annotations

"""Simulation-friendly Version 4 engine for the Kinship board game.

Version 4 rules used here:
- 100-turn game; reaching Turn 100 alive with all five Prestige chips is a win.
- Five event eras: turns 1-7, 8-14, 15-30, 31-60, 61-99.
- Hunt uses the Version B rule: Hunt score must meet the event Threat every time.
  A failed Hunt with a skull kills 1 person; a failed Hunt without a skull simply
  produces no food.
- Food spoilage: food carried into a turn above 20 loses 25% of the excess.
- Technology requires 2 Stick + 2 Rope + 2 Rock; completing the set consumes all
  technology pieces and grants one permanent die-face upgrade.
- Worship rolls 1-2 cause an immediate sacrifice; 3-6 produce Prayer Tokens.
- 2 Prayer Tokens can ignore an event's effects, but never its Hunt Threat.
- Prestige: one chip must be earned in each era. Cost is 6/7/8/9/10 Prayer Tokens.
- Prestige and protection are mutually exclusive at the start of each turn.

This file contains no terminal input. The simulator supplies strategies.
"""

from dataclasses import dataclass, field
from pathlib import Path
import math
import random
from statistics import median
from typing import Optional

# ============================================================
# BASE TABLES
# ============================================================

FOOD_REFERENCE = {1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 3}
HUNT_REFERENCE = {
    1: "skull",
    2: "skull",
    3: 3,
    4: 4,
    5: 5,
    6: 6,
}
TECHNOLOGY_REFERENCE = {
    1: ("item", "stick"),
    2: ("item", "rope"),
    3: ("item", "rock"),
    4: ("item", "stick"),
    5: ("item", "rope"),
    6: ("item", "rock"),
}
WORSHIP_REFERENCE = {
    1: ("sacrifice", 1),
    2: ("prayer", 1),
    3: ("prayer", 1),
    4: ("prayer", 1),
    5: ("prayer", 1),
    6: ("prayer", 1),
}

# ============================================================
# EVENT DECKS: 100-TURN GAME
# ============================================================

EVENTS_T1 = [
    {"name": "Mild Winter", "description": "Food production is reduced by 1 this turn.", "threat": 4, "food_modifier": -1, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Animal Migration", "description": "Game is plentiful. Add 2 to your total Hunt score.", "threat": 5, "food_modifier": 0, "hunt_modifier": 2, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Calm Skies", "description": "Conditions are favorable. No additional effect this turn.", "threat": 3, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Rocky Terrain", "description": "Difficult terrain reduces the total Hunt score by 2.", "threat": 5, "food_modifier": 0, "hunt_modifier": -2, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Local Thieves", "description": "Thieves steal 3 stored Food.", "threat": 6, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 3, "kinship_modifier": 0, "prayer_modifier": 0},
]

EVENTS_T2 = [
    {"name": "Harsh Winter", "description": "Food production is reduced by 2 this turn.", "threat": 8, "food_modifier": -2, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Predator Activity", "description": "Predators disrupt the hunt. Subtract 2 from the total Hunt score.", "threat": 9, "food_modifier": 0, "hunt_modifier": -2, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Fertile Season", "description": "Food production increases by 1 this turn.", "threat": 6, "food_modifier": 1, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Spoiled Stores", "description": "Part of the tribe's stored food spoils. Lose 5 Food.", "threat": 7, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 5, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Spiritual Awakening", "description": "Each Prayer result produces 1 additional Prayer Token this turn.", "threat": 10, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 1},
]

EVENTS_T3 = [
    {"name": "Endless Winter", "description": "Food production is reduced by 2 and 4 stored Food is lost.", "threat": 13, "food_modifier": -2, "hunt_modifier": 0, "food_loss": 4, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Dwindling Herds", "description": "Game becomes scarce. Subtract 3 from the total Hunt score.", "threat": 15, "food_modifier": 0, "hunt_modifier": -3, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Illness", "description": "Kinship projects started this turn take 1 additional turn to complete.", "threat": 12, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 1, "prayer_modifier": 0},
    {"name": "Great Flood", "description": "Floodwaters destroy 8 stored Food.", "threat": 14, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 8, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Clear Moon", "description": "Each Prayer result produces 1 additional Prayer Token this turn.", "threat": 10, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 1},
]

EVENTS_T4 = [
    {"name": "Deep Freeze", "description": "Food production is reduced by 3 this turn.", "threat": 18, "food_modifier": -3, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Famine", "description": "Lose 12 stored Food and reduce Food production by 1 this turn.", "threat": 20, "food_modifier": -1, "hunt_modifier": 0, "food_loss": 12, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Predator Surge", "description": "Predators overwhelm the hunting grounds. Subtract 4 from the total Hunt score.", "threat": 19, "food_modifier": 0, "hunt_modifier": -4, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Widespread Illness", "description": "Kinship projects started this turn take 2 additional turns to complete.", "threat": 17, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 2, "prayer_modifier": 0},
    {"name": "Quiet Season", "description": "The tribe receives a brief respite. No additional effect this turn.", "threat": 14, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
]

EVENTS_T5 = [
    {"name": "Bitter Winter", "description": "Food production is reduced by 3 and 20 stored Food is lost.", "threat": 25, "food_modifier": -3, "hunt_modifier": 0, "food_loss": 20, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Great Famine", "description": "Lose 50 stored Food.", "threat": 27, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 50, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Vanishing Herds", "description": "Subtract 6 from the total Hunt score.", "threat": 26, "food_modifier": 0, "hunt_modifier": -6, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
    {"name": "Plague Season", "description": "Food production is reduced by 1, and Kinship projects started this turn take 2 additional turns to complete.", "threat": 25, "food_modifier": -1, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 2, "prayer_modifier": 0},
    {"name": "Stable Season", "description": "Conditions stabilize briefly. No additional effect this turn.", "threat": 24, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0},
]

VALID_CATEGORIES = {"F", "K", "H", "T", "W"}
TECH_REQUIREMENT = {"stick" :1, "rope":1, "rock":1}
ERA_ENDS = {1: 7, 2: 14, 3: 30, 4: 60, 5: 99}


def event_era(turn: int) -> int:
    if turn <= 7:
        return 1
    if turn <= 14:
        return 2
    if turn <= 30:
        return 3
    if turn <= 60:
        return 4
    return 5


PRESTIGE_COSTS = {
    1: 1,
    2: 3,
    3: 5,
    4: 7,
    5: 9,
}

def prestige_cost(tier: int) -> int:
    return PRESTIGE_COSTS[tier]


# ============================================================
# GAME STATE
# ============================================================

@dataclass
class GameState:
    people: int = 5
    food: int = 7
    turn: int = 1
    prayer_tokens: int = 0
    kinship_projects: list[int] = field(default_factory=list)
    tech_tiles: list[str] = field(default_factory=list)
    tech_upgrades: dict[str, dict[int, int]] = field(default_factory=lambda: {"F": {}, "W": {},  "H": {},})
    current_event: Optional[dict] = None

    total_hunts: int = 0
    successful_hunts: int = 0
    hunt_failures: int = 0
    hunt_deaths: int = 0
    total_food_rolls: int = 0
    total_food_gained: int = 0
    kinship_started: int = 0
    kinship_completed: int = 0
    tech_sets_completed: int = 0
    tech_upgrades_completed: int = 0
    prayer_earned: int = 0
    prayer_spent: int = 0
    sacrifices: int = 0
    events_ignored: int = 0
    total_turns: int = 0
    max_people: int = 5
    max_food: int = 7

    prestige_chips: set[int] = field(default_factory=set)
    prestige_prayer_spent: int = 0

    death_cause: str = ""
    first_tech_upgrade_turn: int | None = None
    food_turn_30: int | None = None
    food_turn_60: int | None = None
    food_turn_90: int | None = None
    people_turn_30: int | None = None
    people_turn_60: int | None = None
    people_turn_90: int | None = None
    max_population: int = 5
    min_population_after_turn_10: int | None = None
    won: bool = False


# ============================================================
# CORE HELPERS
# ============================================================

def draw_event(turn: int, rng: random.Random) -> dict:
    if turn == 1:
        return {"name": "First Turn", "description": "No event on the first turn.", "threat": 5, "food_modifier": 0, "hunt_modifier": 0, "food_loss": 0, "kinship_modifier": 0, "prayer_modifier": 0}
    if turn <= 7:
        return rng.choice(EVENTS_T1).copy()
    if turn <= 14:
        return rng.choice(EVENTS_T2).copy()
    if turn <= 30:
        return rng.choice(EVENTS_T3).copy()
    if turn <= 60:
        return rng.choice(EVENTS_T4).copy()
    return rng.choice(EVENTS_T5).copy()


def event_mod(state: GameState, key: str) -> int:
    if state.current_event is None or state.current_event.get("ignored", False):
        return 0
    return int(state.current_event.get(key, 0))


def tech_bonus(state: GameState, category: str, roll: int) -> int:
    return int(state.tech_upgrades.get(category, {}).get(roll, 0))


def roll_die(rng: random.Random) -> int:
    return rng.randint(1, 6)


def roll_hunt_die(
    state: GameState,
    rng: random.Random
) -> tuple[int, str | int, int]:

    face = rng.randint(1, 6)
    base = HUNT_REFERENCE[face]

    if base == "skull":
        return face, "skull", 0

    value = base + tech_bonus(state, "H", face)

    return face, base, value


def active_kinship_workers(state: GameState) -> int:
    return 2 * len(state.kinship_projects)


def has_technology_set(state: GameState) -> bool:
    return all(state.tech_tiles.count(item) >= needed for item, needed in TECH_REQUIREMENT.items())


# ============================================================
# TECHNOLOGY
# ============================================================

def _record_tech_upgrade(state: GameState) -> None:
    state.tech_upgrades_completed += 1
    if state.first_tech_upgrade_turn is None:
        state.first_tech_upgrade_turn = state.turn


def choose_technology_upgrade_sim(state: GameState, category: str = "F") -> tuple[str, int]:
    """Baseline tech policy: improve the lowest current result in a category."""
    if category == "F":
        scores = [(FOOD_REFERENCE[face] + tech_bonus(state, "F", face), face) for face in range(1, 7)]
    elif category == "W":
        scores = [(WORSHIP_REFERENCE[face][1] + tech_bonus(state, "W", face), face) for face in range(2, 7)]
    elif category == "H":
        scores = [
            (
                HUNT_REFERENCE[face] + tech_bonus(state, "H", face),
                face
            )
            for face in range(3, 7)
        ]
    else:
        raise ValueError("Simulation upgrades can only target F, W, or H")
    _, face = min(scores, key=lambda x: (x[0], x[1]))
    state.tech_upgrades[category][face] = tech_bonus(state, category, face) + 1
    _record_tech_upgrade(state)
    return category, face
def choose_adaptive_technology_upgrade(
    state: GameState
) -> tuple[str, int]:

    era = event_era(state.turn)

    prestige_cost_now = prestige_cost(era)

    # Behind on Prestige -> improve Worship.
    if (
        era not in state.prestige_chips
        and state.prayer_tokens < prestige_cost_now
    ):
        return choose_technology_upgrade_sim(
            state,
            "W"
        )

    # Food reserves becoming dangerous -> improve Food.
    if state.food < state.people * 2:
        return choose_technology_upgrade_sim(
            state,
            "F"
        )

    # Otherwise improve Hunting so it scales with Threat.
    return choose_technology_upgrade_sim(
        state,
        "H"
    )

def tech_upgrade_lowest_food(state: GameState) -> tuple[str, int]:
    return choose_technology_upgrade_sim(state, "F")
def tech_upgrade_lowest_hunt(
    state: GameState
) -> tuple[str, int]:
    return choose_technology_upgrade_sim(state, "H")
def tech_upgrade_highest_hunt(
    state: GameState
) -> tuple[str, int]:

    scores = []

    for face in range(3, 7):
        current = (
            HUNT_REFERENCE[face]
            + tech_bonus(state, "H", face)
        )

        scores.append((current, face))

    _, face = max(
        scores,
        key=lambda x: (x[0], -x[1])
    )

    state.tech_upgrades["H"][face] = (
        tech_bonus(state, "H", face) + 1
    )

    state.tech_upgrades_completed += 1

    if state.first_tech_upgrade_turn is None:
        state.first_tech_upgrade_turn = state.turn

    return "H", face

def tech_upgrade_random(state: GameState, rng: random.Random) -> tuple[str, int]:
    category = rng.choice(["F", "W"])
    face = rng.randint(1, 6) if category == "F" else rng.randint(2, 6)
    state.tech_upgrades[category][face] = tech_bonus(state, category, face) + 1
    _record_tech_upgrade(state)
    return category, face


def tech_upgrade_highest_food(state: GameState) -> tuple[str, int]:
    scores = [(FOOD_REFERENCE[face] + tech_bonus(state, "F", face), face) for face in range(1, 7)]
    _, face = max(scores, key=lambda x: (x[0], -x[1]))
    state.tech_upgrades["F"][face] = tech_bonus(state, "F", face) + 1
    _record_tech_upgrade(state)
    return "F", face


def tech_upgrade_alternate(state: GameState) -> tuple[str, int]:
    food_count = sum(state.tech_upgrades["F"].values())
    worship_count = sum(state.tech_upgrades["W"].values())
    return choose_technology_upgrade_sim(state, "F" if food_count <= worship_count else "W")


def tech_upgrade_random_category_lowest_face(state: GameState, rng: random.Random) -> tuple[str, int]:
    return choose_technology_upgrade_sim(state, rng.choice(["F", "W"]))


def check_technology_completion_sim(state: GameState, strategy: str, rng: random.Random) -> None:
    if not has_technology_set(state):
        return
    state.tech_sets_completed += 1
    state.tech_tiles = []

    if strategy in {"tech_food_low", "technology"}:
        tech_upgrade_lowest_food(state)
    elif strategy == "tech_food_high":
        tech_upgrade_highest_food(state)
    elif strategy == "tech_random":
        tech_upgrade_random(state, rng)
    elif strategy == "tech_alternate":
        tech_upgrade_alternate(state)
    elif strategy == "tech_random_category":
        tech_upgrade_random_category_lowest_face(state, rng)
    elif strategy == "worship":
        choose_technology_upgrade_sim(state, "W")
    elif strategy == "tech_hunt":
        choose_technology_upgrade_sim(state, "H")
    elif strategy == "tech_adaptive":
        choose_adaptive_technology_upgrade(state)

    elif strategy == "tech_worship":
        choose_technology_upgrade_sim(state, "W")

    elif strategy == "tech_balanced":
        total_upgrades = state.tech_upgrades_completed

        cycle = ["F", "H", "W"]
        category = cycle[total_upgrades % 3]

        choose_technology_upgrade_sim(
            state,
            category
        )
    else:
        choose_technology_upgrade_sim(state, "F")
# ============================================================
# HUNT-FOCUSED STRATEGY ENGINES
# ============================================================

def _sim_hunt_aggressive(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    Hunt-heavy strategy.

    After reserving workers needed for Prestige, send roughly
    75% of remaining workers to Hunt and the rest to Food.
    """

    worship_workers, remaining = _remaining_after_worship(
        state, available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    hunt_workers = max(1, (3 * remaining) // 4)

    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("H", hunt_workers),
            ("F", remaining - hunt_workers),
        ]
    )


def _sim_hunt_conservative(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    Hunt only when the expected value of the available hunting
    party provides a reasonable chance of meeting Threat.

    Otherwise, prioritize Food.
    """

    worship_workers, remaining = _remaining_after_worship(
        state, available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    event = state.current_event or {}

    threat = int(event.get("threat", 5))
    hunt_modifier = int(event.get("hunt_modifier", 0))

    # Average value of one Hunt die:
    # (0 + 0 + 2 + 3 + 4 + 5) / 6 = 14/6
    expected_per_hunter = 14 / 6

    expected_all_hunt = (
        remaining * expected_per_hunter
        + hunt_modifier
    )

    # Require a 20% expected-score cushion over Threat.
    hunt_is_reasonable = (
        hunt_modifier >= 0
        and expected_all_hunt >= threat * 1.20
    )

    if not hunt_is_reasonable:
        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("F", remaining),
            ]
        )

    # Use the smallest party that should theoretically have
    # enough expected score, plus one additional hunter.
    hunt_workers = max(
        1,
        math.ceil(
            ((threat - hunt_modifier) * 1.20)
            / expected_per_hunter
        )
    )

    if hunt_workers > remaining:
        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("F", remaining),
            ]
        )

    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("H", hunt_workers),
            ("F", remaining - hunt_workers),
        ]
    )


def _sim_hunt_threshold(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    Use Hunting primarily as an emergency food source.

    If Food is below a target reserve, favor Hunt.
    Once the reserve is secure, stop Hunting and develop
    the civilization more safely.
    """

    worship_workers, remaining = _remaining_after_worship(
        state, available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    target_food = max(
        10,
        state.people * 2
    )

    if state.food < target_food:
        hunt_workers = max(
            1,
            (2 * remaining) // 3
        )

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("H", hunt_workers),
                ("F", remaining - hunt_workers),
            ]
        )

    # Food reserve is already healthy.
    # Stop Hunting and invest in Technology/Food.
    tech_workers = 1 if remaining >= 3 else 0

    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("T", tech_workers),
            ("F", remaining - tech_workers),
        ]
    )


def _sim_hunt_large_party(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    When this strategy Hunts, it sends the entire remaining
    workforce as one large hunting party.

    This directly tests whether concentrating workers into one
    Hunt is safer/more effective than spreading them elsewhere.
    """

    worship_workers, remaining = _remaining_after_worship(
        state, available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    event = state.current_event or {}
    threat = int(event.get("threat", 5))
    hunt_modifier = int(event.get("hunt_modifier", 0))

    # Don't send a single remaining worker hunting.
    if remaining < 2:
        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("F", remaining),
            ]
        )

    # Hunt with everyone remaining.
    #
    # This intentionally does not reduce Hunt size to be "safe."
    # We want to test the large-party philosophy itself.
    if hunt_modifier >= 0 or threat <= 15:
        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("H", remaining),
            ]
        )

    # Very dangerous Hunt -> preserve workers for Food.
    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("F", remaining),
        ]
    )


def _sim_hunt_early(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    Hunt aggressively during the early game to build a food base.

    After Turn 14, transition toward safer Food/Technology play.
    """

    if state.turn <= 14:
        return _sim_hunt_aggressive(
            state,
            available
        )

    worship_workers, remaining = _remaining_after_worship(
        state, available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    # After the early phase, hunt only when Food is becoming scarce.
    target_food = max(
        12,
        state.people * 2
    )

    if state.food < target_food:
        return _sim_hunt_conservative(
            state,
            available
        )

    # Otherwise consolidate the early advantage.
    tech_workers = 1 if remaining >= 3 else 0

    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("T", tech_workers),
            ("F", remaining - tech_workers),
        ]
    )


def _sim_hunt_opportunistic(
    state: GameState,
    available: int
) -> dict[str, int]:
    """
    Hunt only when the current event creates a particularly
    attractive opportunity.

    Favor:
        - positive Hunt modifiers
        - low Threat
        - favorable expected Hunt score

    Otherwise use Food/Technology.
    """

    worship_workers, remaining = _remaining_after_worship(
        state,
        available
    )

    if remaining <= 0:
        return _allocate_from_priority(
            available,
            [("W", worship_workers)]
        )

    event = state.current_event or {}

    threat = int(event.get("threat", 5))
    hunt_modifier = int(event.get("hunt_modifier", 0))

    expected_per_hunter = 14 / 6

    expected_score = (
        remaining * expected_per_hunter
        + hunt_modifier
    )

    very_good_event = hunt_modifier >= 2
    low_threat = threat <= 8
    expected_to_succeed = expected_score >= threat * 1.10

    if (
        very_good_event
        or (low_threat and expected_to_succeed)
        or expected_to_succeed and hunt_modifier >= 0
    ):
        # Strong opportunity:
        # commit about 2/3 of the workforce.
        hunt_workers = max(
            1,
            (2 * remaining) // 3
        )

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("H", hunt_workers),
                ("F", remaining - hunt_workers),
            ]
        )

    # No compelling Hunt opportunity.
    tech_workers = 1 if remaining >= 3 else 0

    return _allocate_from_priority(
        available,
        [
            ("W", worship_workers),
            ("T", tech_workers),
            ("F", remaining - tech_workers),
        ]
    )

# ============================================================
# KINSHIP / SACRIFICE / WORSHIP / HUNT
# ============================================================

def resolve_kinship_projects(state: GameState) -> int:
    active: list[int] = []
    completed = 0
    for turns_left in state.kinship_projects:
        turns_left -= 1
        if turns_left <= 0:
            completed += 1
        else:
            active.append(turns_left)
    state.kinship_projects = active
    state.people += completed
    state.kinship_completed += completed
    state.max_people = max(state.max_people, state.people)
    state.max_population = max(state.max_population, state.people)
    return completed


def resolve_sacrifice_sim(state: GameState, roll: int, strategy: str, rng: random.Random) -> None:
    upgraded = tech_bonus(state, "W", roll) > 0
    state.sacrifices += 1
    state.people -= 1
    if state.people <= 0:
        state.people = 0
        state.death_cause = "sacrifice"
        return

    if strategy in {"technology", "worship", "tech_alternate", "tech_random_category", "tech_random"}:
        choice = 2
    elif strategy == "kinship":
        choice = 3
    elif strategy in {"food", "hunt", "risk_averse"}:
        choice = 1
    elif strategy == "random":
        choice = rng.choice([1, 2, 3])
    else:
        choice = 1 if state.food < max(3, state.people) else 2

    if choice == 1:
        state.food += 15 if upgraded else 10
    elif choice == 2:
        choose_technology_upgrade_sim(state, "F")
        if upgraded:
            choose_technology_upgrade_sim(state, "F")
    elif choice == 3:
        if upgraded:
            state.people += 2
        else:
            completed = len(state.kinship_projects)
            state.kinship_projects = []
            state.people += completed
        state.max_people = max(state.max_people, state.people)
        state.max_population = max(state.max_population, state.people)


def resolve_worship_roll(state: GameState, roll: int, strategy: str, rng: random.Random) -> None:
    effect, value = WORSHIP_REFERENCE[roll]
    if effect == "prayer":
        gained = value + tech_bonus(state, "W", roll) + event_mod(state, "prayer_modifier")
        state.prayer_tokens += gained
        state.prayer_earned += gained
    else:
        resolve_sacrifice_sim(state, roll, strategy, rng)


def resolve_hunt(state: GameState, count: int, strategy: str, rng: random.Random) -> dict:
    if count <= 0:
        return {"rolls": [], "score": 0, "skulls": 0, "success": True, "death": False}
    rolls: list[str | int] = []
    score = 0
    skulls = 0
    state.total_hunts += 1

    for _ in range(count):
        face_number, face_result, value = roll_hunt_die(state, rng)

        rolls.append(face_result)
        score += value

        if face_result == "skull":
            skulls += 1

    score += event_mod(state, "hunt_modifier")
    threat = int(state.current_event["threat"])
    success = score >= threat
    death = False

    if skulls == 0:
        # No skulls = automatic successful hunt.
        success = True
        state.food += score
        state.successful_hunts += 1

    elif score >= threat:
        # Skull(s) present, but the hunt still beats the threat.
        success = True
        state.food += score
        state.successful_hunts += 1

    else:
        # Skull(s) + failed threat check = death.
        success = False
        state.people = max(state.people - 1, 0)
        state.hunt_failures += 1
        state.hunt_deaths += 1
        death = True

        if state.people <= 0:
            state.death_cause = "hunt"

    return {"rolls": rolls, "score": score, "skulls": skulls, "success": success, "death": death}


def apply_food_roll(state: GameState, roll: int) -> int:
    gain = FOOD_REFERENCE[roll] + tech_bonus(state, "F", roll) + event_mod(state, "food_modifier")
    gain = max(gain, 0)
    state.food += gain
    state.total_food_rolls += 1
    state.total_food_gained += gain
    return gain


# ============================================================
# PRAYER / PRESTIGE DECISION
# ============================================================

def turns_left_in_era(turn: int) -> int:
    era = event_era(turn)
    return ERA_ENDS[era] - turn + 1


def prestige_missing(state: GameState) -> bool:
    return event_era(state.turn) not in state.prestige_chips


def strategy_prefers_prestige_now(
    state: GameState,
    strategy: str
) -> bool:

    era = event_era(state.turn)

    # Already have this era's chip.
    if era in state.prestige_chips:
        return False

    cost = prestige_cost(era)

    # Can't buy it yet.
    if state.prayer_tokens < cost:
        return False

    turns_left = turns_left_in_era(state.turn)

    # Prestige Early:
    # Buy as soon as affordable.
    if strategy == "prestige_early":
        return True

    # Prestige Late:
    # Wait until the final 2 turns.
    if strategy == "prestige_late":
        return turns_left <= 2

    # Other rational strategies:
    return turns_left <= {
        1: 3,
        2: 3,
        3: 6,
        4: 10,
        5: 15,
    }[era]


def choose_prayer_action(
    state: GameState,
    rng: random.Random,
    strategy: str
) -> str:

    era = event_era(state.turn)
    cost = prestige_cost(era)
    turns_left = turns_left_in_era(state.turn)

    # --------------------------------------------------------
    # FIRST PRIORITY:
    # If we can currently afford the required Prestige chip
    # and the strategy believes it is time to secure it,
    # Prestige comes before event protection.
    # --------------------------------------------------------

    if (
        era not in state.prestige_chips
        and state.prayer_tokens >= cost
        and strategy_prefers_prestige_now(state, strategy)
    ):
        state.prayer_tokens -= cost
        state.prestige_chips.add(era)
        state.prestige_prayer_spent += cost
        return "prestige"


def prepare_turn(state: GameState, rng: random.Random, strategy: str) -> dict:
    if state.people <= 0:
        return {"game_over": True, "available_workers": 0}

    state.current_event = draw_event(state.turn, rng)
    decision = choose_prayer_action(state, rng, strategy)

    food_loss = event_mod(state, "food_loss")
    if food_loss > 0:
        state.food = max(state.food - food_loss, 0)

    spoiled_food = 0
    if state.food > 20:
        spoiled_food = (state.food - 20) // 4
        state.food -= spoiled_food

    completed = resolve_kinship_projects(state)
    available_workers = state.people - active_kinship_workers(state)

    if available_workers < 0:
        state.death_cause = "kinship_overcommitment"
        state.people = 0

    return {
        "event": state.current_event["name"],
        "threat": state.current_event["threat"],
        "food_loss": food_loss,
        "food_spoiled": spoiled_food,
        "prayer_used": decision == "protection",
        "prestige_earned": decision == "prestige",
        "prestige_era": event_era(state.turn) if decision == "prestige" else None,
        "kinship_completed": completed,
        "available_workers": available_workers,
        "game_over": available_workers < 0 or state.people <= 0,
    }


# ============================================================
# STRATEGY HELPERS
# ============================================================

def valid_allocation(allocation: dict[str, int], available_workers: int) -> bool:
    if set(allocation) - VALID_CATEGORIES:
        return False
    if sum(allocation.values()) != available_workers:
        return False
    if allocation.get("K", 0) % 2 != 0:
        return False
    return all(count >= 0 for count in allocation.values())


def _allocate_from_priority(available: int, priorities: list[tuple[str, int]]) -> dict[str, int]:
    allocation: dict[str, int] = {}
    remaining = available
    for category, amount in priorities:
        if remaining <= 0:
            break
        if category == "K":
            amount = min(amount, remaining - (remaining % 2))
            amount -= amount % 2
        else:
            amount = min(amount, remaining)
        if amount > 0:
            allocation[category] = allocation.get(category, 0) + amount
            remaining -= amount
    if remaining > 0:
        allocation["F"] = allocation.get("F", 0) + remaining
    return allocation


def _prestige_worship_need(state: GameState) -> int:
    """
    Decide how many workers to devote to Worship so the strategy
    stays on pace to earn the current era's Prestige chip.

    The strategy starts building Prayer early rather than waiting
    until the final few turns.

    Worship rolls produce Prayer on 5 of 6 faces, so the expected
    Prayer yield per Worship roll is approximately 5/6.
    """

    era = event_era(state.turn)

    # Already have this era's Prestige chip.
    if era in state.prestige_chips:
        return 0

    available = max(
        0,
        state.people - active_kinship_workers(state)
    )

    if available <= 0:
        return 0

    cost = prestige_cost(era)
    prayer_needed = max(0, cost - state.prayer_tokens)

    if prayer_needed <= 0:
        return 0

    turns_left = turns_left_in_era(state.turn)
    if turns_left <= 0:
        return 0
    # Expected Prayer from one Worship roll.
    expected_prayer_per_roll = 5 / 6

    # Approximate number of Worship rolls needed to obtain
    # the remaining Prayer.
    rolls_needed = math.ceil(
        prayer_needed / expected_prayer_per_roll
    )

    # Spread the required Worship rolls over the remaining turns.
    rolls_per_turn = math.ceil(
        rolls_needed / turns_left
    )

    # Do not commit more than 3 workers to Worship unless the
    # deadline is extremely close.
    if turns_left >= 5:
        desired = max(0, min(1, rolls_per_turn))

    elif turns_left >= 3:
        desired = max(1, min(2, rolls_per_turn + 1))

    else:
        desired = min(3, max(1, rolls_per_turn + 1))
    if state.people <= 2 and turns_left > 2:
        return 0
    
    if state.people <= 3 and turns_left > 1:
        desired = min(desired, 1)
    # Never devote more Worship workers than people available.
    return min(desired, available)
    

def _remaining_after_worship(state: GameState, available: int) -> tuple[int, int]:
    worship_workers = min(_prestige_worship_need(state), available)
    return worship_workers, available - worship_workers


def random_allocation(state: GameState, rng: random.Random) -> dict[str, int]:
    available = state.people - active_kinship_workers(state)
    allocation = {category: 0 for category in VALID_CATEGORIES}
    remaining = available
    while remaining > 0:
        categories = ["F", "H", "T", "W"]
        if remaining >= 2:
            categories.append("K")
        category = rng.choice(categories)
        if category == "K":
            allocation["K"] += 2
            remaining -= 2
        else:
            allocation[category] += 1
            remaining -= 1
    return {k: v for k, v in allocation.items() if v > 0}


def _food_priority(state: GameState, available: int) -> dict[str, int]:
    w, rem = _remaining_after_worship(state, available)
    return _allocate_from_priority(available, [("W", w), ("F", rem)])


def _hunt_priority(state: GameState, available: int) -> dict[str, int]:
    w, rem = _remaining_after_worship(state, available)
    event = state.current_event or {}
    threat = int(event.get("threat", 5))
    bonus = int(event.get("hunt_modifier", 0))
    hunt_workers = rem if bonus >= 0 and threat <= 9 else max(1, rem // 2) if rem > 0 else 0
    return _allocate_from_priority(available, [("W", w), ("H", hunt_workers), ("F", rem - hunt_workers)])


def _kinship_priority(state: GameState, available: int) -> dict[str, int]:
    w, rem = _remaining_after_worship(state, available)
    # Only add projects while keeping at least one non-Kinship worker when possible.
    k = rem if rem % 2 == 0 else max(0, rem - 1)
    if rem >= 3:
        k = min(k, max(0, rem - 1))
    return _allocate_from_priority(available, [("W", w), ("K", k), ("F", rem - k)])


def _technology_priority(state: GameState, available: int) -> dict[str, int]:
    w, rem = _remaining_after_worship(state, available)
    t = max(1, rem // 2) if rem >= 2 else rem
    return _allocate_from_priority(available, [("W", w), ("T", t), ("F", rem - t)])


def _balanced_priority(state: GameState, available: int) -> dict[str, int]:
    w, rem = _remaining_after_worship(state, available)
    priorities: list[tuple[str, int]] = [("W", w)]
    if rem <= 0:
        return _allocate_from_priority(available, priorities)
    food_reserve = max(state.people * 2, 8)
    if state.food < food_reserve:
        food_workers = min(rem, max(1, state.people - state.food + 1))
        priorities.append(("F", food_workers))
        rem2 = rem - food_workers
        if rem2 >= 2:
            priorities.append(("K", 2))
            rem2 -= 2
        if rem2 > 0:
            priorities.append(("T", 1))
            rem2 -= 1
        if rem2 > 0:
            priorities.append(("H", rem2))
    else:
        if rem >= 2:
            priorities.append(("K", 2))
            rem -= 2
        if rem > 0:
            priorities.append(("T", 1))
            rem -= 1
        if rem > 0:
            priorities.append(("F", rem))
    return _allocate_from_priority(available, priorities)


def strategy_allocation(state: GameState, rng: random.Random, name: str) -> dict[str, int]:
    available = state.people - active_kinship_workers(state)
    if available < 0:
        return {}
    if available == 0:
        return {}

    if name == "random":
        return random_allocation(state, rng)

    # Mechanical baselines, now still required to pursue Prestige eventually.
    if name == "food":
        return _food_priority(state, available)
    if name == "hunt":
        return _hunt_priority(state, available)
        # ========================================================
    # HUNT EXPERIMENTS
    # ========================================================

    if name == "hunt_aggressive":
        return _sim_hunt_aggressive(
            state,
            available
        )

    if name == "hunt_conservative":
        return _sim_hunt_conservative(
            state,
            available
        )

    if name == "hunt_threshold":
        return _sim_hunt_threshold(
            state,
            available
        )

    if name == "hunt_large_party":
        return _sim_hunt_large_party(
            state,
            available
        )

    if name == "hunt_early":
        return _sim_hunt_early(
            state,
            available
        )

    if name == "hunt_opportunistic":
        return _sim_hunt_opportunistic(
            state,
            available
        )
    if name == "kinship":
        return _kinship_priority(state, available)
    if name == "technology":
        return _technology_priority(state, available)
    if name == "worship":
        w, rem = _remaining_after_worship(state, available)
        # Worship baseline deliberately overcommits to Worship.
        worship_workers = max(w, max(1, available // 2))
        return _allocate_from_priority(available, [("W", worship_workers), ("F", available - worship_workers)])

    # Five Technology policy experiments share the same core allocation,
    # with Worship introduced as a normal part of the strategy rather than
    # as an afterthought.
    if name in {"tech_food_low", "tech_food_high", "tech_random"}:
        return _technology_priority(state, available)

    if name == "tech_alternate":
        w, rem = _remaining_after_worship(state, available)
        # Extra Worship every other turn to support the Worship side of the experiment.
        extra_w = 1 if rem >= 2 and state.turn % 2 == 0 else 0
        w += extra_w
        rem -= extra_w
        t = max(1, rem // 2) if rem >= 2 else rem
        return _allocate_from_priority(available, [("W", w), ("T", t), ("F", rem - t)])

    if name == "tech_random_category":
        w, rem = _remaining_after_worship(state, available)
        extra_w = 1 if rem >= 2 and rng.random() < 0.25 else 0
        w += extra_w
        rem -= extra_w
        t = max(1, rem // 2) if rem >= 2 else rem
        return _allocate_from_priority(available, [("W", w), ("T", t), ("F", rem - t)])

    if name == "balanced":
        return _balanced_priority(state, available)

    if name == "risk_averse":
        w, rem = _remaining_after_worship(state, available)
        food_target = max(state.people * 3, 12)
        priorities: list[tuple[str, int]] = [("W", w)]
        if state.food < food_target:
            priorities.append(("F", rem))
        else:
            if rem >= 1:
                priorities.append(("T", min(1, rem)))
                rem -= 1
            if rem >= 2:
                priorities.append(("K", 2))
                rem -= 2
            if rem > 0:
                priorities.append(("F", rem))
        return _allocate_from_priority(available, priorities)

    if name == "risk_seeking":
        return _hunt_priority(state, available)

    if name == "early_risk":
        if state.turn <= 30:
            return _hunt_priority(state, available)
        return _balanced_priority(state, available)

    if name == "late_risk":
        if state.turn <= 30:
            return _food_priority(state, available)
        return _hunt_priority(state, available)

    if name == "stockpile_growth":
        w, rem = _remaining_after_worship(state, available)
        if state.food < 25 and state.turn <= 20:
            # Build a meaningful early reserve first.
            event = state.current_event or {}
            threat = int(event.get("threat", 5))
            hunt_bonus = int(event.get("hunt_modifier", 0))
            hunt_workers = rem if hunt_bonus >= 0 and threat <= 9 else max(1, rem // 2) if rem > 0 else 0
            return _allocate_from_priority(available, [("W", w), ("H", hunt_workers), ("F", rem - hunt_workers)])
        k = rem if rem % 2 == 0 else max(0, rem - 1)
        if rem >= 3:
            k = min(k, max(0, rem - 1))
        return _allocate_from_priority(available, [("W", w), ("K", k), ("F", rem - k)])

    if name == "tech_growth":
        # Strong Tech early; pivot toward Kinship once Food has become efficient.
        food_eff = sum(FOOD_REFERENCE[f] + tech_bonus(state, "F", f) for f in range(1, 7)) / 6
        w, rem = _remaining_after_worship(state, available)
        if food_eff < 3.0:
            t = max(1, rem // 2) if rem >= 2 else rem
            return _allocate_from_priority(available, [("W", w), ("T", t), ("F", rem - t)])
        k = rem if rem % 2 == 0 else max(0, rem - 1)
        if rem >= 3:
            k = min(k, max(0, rem - 1))
        return _allocate_from_priority(available, [("W", w), ("K", k), ("F", rem - k)])

    if name == "reserve_threshold":
        w, rem = _remaining_after_worship(state, available)
        reserve = max(2 * state.people, 10)
        if state.food < reserve:
            return _allocate_from_priority(available, [("W", w), ("F", rem)])
        priorities = [("W", w)]
        if rem >= 2:
            priorities.append(("K", 2))
            rem -= 2
        if rem > 0:
            priorities.append(("T", 1))
            rem -= 1
        if rem > 0:
            priorities.append(("H", rem))
        return _allocate_from_priority(available, priorities)

    if name == "population_threshold":
        target = 10
        w, rem = _remaining_after_worship(state, available)
        if state.people < target:
            k = rem if rem % 2 == 0 else max(0, rem - 1)
            if rem >= 3:
                k = min(k, max(0, rem - 1))
            return _allocate_from_priority(available, [("W", w), ("K", k), ("F", rem - k)])
        return _balanced_priority(state, available)

    if name == "prestige_early":
        # Deliberately secure the chip earlier than other rational strategies.
        w, rem = _remaining_after_worship(state, available)
        if prestige_missing(state):
            w = min(max(w, 2 if turns_left_in_era(state.turn) > 2 else w), available)
            rem = available - w
            return _allocate_from_priority(available, [("W", w), ("F", rem)])
        return _balanced_priority(state, available)

    if name == "prestige_late":
        # Spend early turns on development; Worship only ramps near the deadline.
        w, rem = _remaining_after_worship(state, available)
        if prestige_missing(state) and turns_left_in_era(state.turn) <= 3:
            w = min(max(w, 2), available)
            rem = available - w
        return _balanced_priority(state, available) if not (prestige_missing(state) and turns_left_in_era(state.turn) <= 3) else _allocate_from_priority(available, [("W", w), ("F", rem)])

    if name == "opportunistic":
        event = state.current_event or {}
        food_mod = int(event.get("food_modifier", 0))
        hunt_mod = int(event.get("hunt_modifier", 0))
        threat = int(event.get("threat", 5))
        w, rem = _remaining_after_worship(state, available)
        priorities: list[tuple[str, int]] = [("W", w)]
        if hunt_mod >= 2 and threat <= 12 and rem > 0:
            priorities.append(("H", rem))
        elif food_mod > 0 and rem > 0:
            priorities.append(("F", rem))
        elif state.food >= max(2 * state.people, 10) and rem >= 2:
            priorities.append(("K", 2))
            rem -= 2
            if rem > 0:
                priorities.append(("T", 1))
                rem -= 1
            if rem > 0:
                priorities.append(("F", rem))
        else:
            priorities.append(("F", rem))
        return _allocate_from_priority(available, priorities)

    if name == "tech_hunt":
        worship_workers, remaining = _remaining_after_worship(
            state,
            available
        )

        # After reserving Worship workers for Prestige,
        # split the remaining workforce between Technology and Hunt.
        tech_workers = (
            max(1, remaining // 2)
            if remaining >= 2
            else 0
        )

        hunt_workers = remaining - tech_workers

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("T", tech_workers),
                ("H", hunt_workers),
            ]
        )
    if name == "tech_worship":
        worship_workers, remaining = _remaining_after_worship(
            state,
            available
        )

        # Keep at least one worker on Worship in addition to the
        # workers needed for the current Prestige goal.
        extra_worship = 1 if remaining >= 2 else 0

        worship_workers += extra_worship
        remaining -= extra_worship

        tech_workers = (
            max(1, remaining // 2)
            if remaining >= 2
            else 0
        )

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("T", tech_workers),
                ("F", remaining - tech_workers),
            ]
        )
    if name == "tech_balanced":
        worship_workers, remaining = _remaining_after_worship(
            state,
            available
        )

        # Spread non-Prestige workers across Food, Hunt, and Tech.
        tech_workers = 1 if remaining >= 3 else 0
        hunt_workers = 1 if remaining - tech_workers >= 2 else 0

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("T", tech_workers),
                ("H", hunt_workers),
                ("F", remaining - tech_workers - hunt_workers),
            ]
        )
    if name == "tech_adaptive":
        worship_workers, remaining = _remaining_after_worship(
            state,
            available
        )

        event = state.current_event or {}

        threat = int(event.get("threat", 5))
        hunt_modifier = int(event.get("hunt_modifier", 0))

        food_need = max(
            0,
            state.people * 2 - state.food
        )

        # Favor Food when reserves are low.
        if food_need > 0:
            return _allocate_from_priority(
                available,
                [
                    ("W", worship_workers),
                    ("T", max(1, remaining // 2) if remaining >= 2 else 0),
                    ("F", remaining - (
                        max(1, remaining // 2)
                        if remaining >= 2 else 0
                    )),
                ]
            )

        # Favor Hunt when the current event is attractive.
        if (
            hunt_modifier > 0
            or (
                threat <= 10
                and hunt_modifier >= 0
            )
        ):
            tech_workers = 1 if remaining >= 3 else 0

            return _allocate_from_priority(
                available,
                [
                    ("W", worship_workers),
                    ("T", tech_workers),
                    ("H", remaining - tech_workers),
                ]
            )

        # Otherwise prioritize Technology + Food.
        tech_workers = (
            max(1, remaining // 2)
            if remaining >= 2
            else 0
        )

        return _allocate_from_priority(
            available,
            [
                ("W", worship_workers),
                ("T", tech_workers),
                ("F", remaining - tech_workers),
            ]
        )
    raise ValueError(f"Unknown strategy: {name}")


# ============================================================
# TURN / GAME LOOP
# ============================================================

def _update_diagnostics(state: GameState) -> None:
    state.max_population = max(state.max_population, state.people)
    if state.turn >= 10:
        if state.min_population_after_turn_10 is None:
            state.min_population_after_turn_10 = state.people
        else:
            state.min_population_after_turn_10 = min(state.min_population_after_turn_10, state.people)
    if state.turn == 30:
        state.food_turn_30 = state.food
        state.people_turn_30 = state.people
    elif state.turn == 60:
        state.food_turn_60 = state.food
        state.people_turn_60 = state.people
    elif state.turn == 90:
        state.food_turn_90 = state.food
        state.people_turn_90 = state.people


def run_turn(
    state: GameState,
    allocation: dict[str, int],
    rng: random.Random,
    strategy: str = "balanced",
    prepared: dict | None = None,
) -> dict:
    if state.people <= 0:
        return {"turn": state.turn, "ended": True, "game_over": True}
    if prepared is None:
        prepared = prepare_turn(state, rng, strategy)

    available_workers = int(prepared["available_workers"])
    if prepared.get("game_over"):
        return {
            "turn": state.turn,
            "event": state.current_event["name"] if state.current_event else "None",
            "available_workers": available_workers,
            "game_over": True,
            "cause": state.death_cause or ("kinship_overcommitment" if available_workers < 0 else "population_zero"),
            "prayer_used": prepared.get("prayer_used", False),
            "prestige_earned": prepared.get("prestige_earned", False),
            "prestige_era": prepared.get("prestige_era"),
            "kinship_completed": prepared.get("kinship_completed", 0),
        }

    if not valid_allocation(allocation, available_workers):
        raise ValueError(f"Invalid allocation {allocation} for {available_workers} available workers")

    kinship_count = allocation.get("K", 0)
    new_projects = kinship_count // 2
    kinship_timer = 3 + event_mod(state, "kinship_modifier")
    state.kinship_projects.extend([kinship_timer] * new_projects)
    state.kinship_started += new_projects

    hunt_data = resolve_hunt(state, allocation.get("H", 0), strategy, rng)
    if state.people <= 0:
        state.turn += 1
        state.total_turns += 1
        _update_diagnostics(state)
        return {
            "turn": state.turn - 1,
            "event": state.current_event["name"],
            "threat": state.current_event["threat"],
            "allocation": allocation.copy(),
            "available_workers": available_workers,
            "kinship_started": new_projects,
            "kinship_completed": int(prepared.get("kinship_completed", 0)),
            "hunt_count": allocation.get("H", 0),
            "hunt_score": hunt_data["score"],
            "hunt_skulls": hunt_data["skulls"],
            "hunt_success": hunt_data["success"],
            "hunt_death": hunt_data["death"],
            "food_rolls": [],
            "food_gained": 0,
            "food_loss": int(prepared.get("food_loss", 0)),
            "food_spoiled": int(prepared.get("food_spoiled", 0)),
            "prayer_used": bool(prepared.get("prayer_used", False)),
            "prestige_earned": bool(prepared.get("prestige_earned", False)),
            "prestige_era": prepared.get("prestige_era"),
            "fed": False,
            "lost_to_food": False,
            "people_end": state.people,
            "food_end": state.food,
            "game_over": True,
        }

    food_results = [apply_food_roll(state, roll_die(rng)) for _ in range(allocation.get("F", 0))]

    for _ in range(allocation.get("T", 0)):
        roll = roll_die(rng)
        effect, value = TECHNOLOGY_REFERENCE[roll]
        if effect == "item":
            state.tech_tiles.append(value)
            check_technology_completion_sim(state, strategy, rng)

    for _ in range(allocation.get("W", 0)):
        resolve_worship_roll(state, roll_die(rng), strategy, rng)
        if state.people <= 0:
            break

    fed = state.food >= state.people
    lost_to_food = False
    if fed:
        state.food -= state.people
    else:
        state.people = max(state.people - 1, 0)
        state.food = 0
        lost_to_food = True
        if state.people <= 0:
            state.death_cause = "starvation"
    current_era = event_era(state.turn)

    if (
        state.turn == ERA_ENDS[current_era]
        and current_era not in state.prestige_chips
    ):
        state.death_cause = "prestige_deadline"
        game_over = True
    _update_diagnostics(state)

    state.turn += 1
    state.total_turns += 1
    state.max_people = max(state.max_people, state.people)
    state.max_food = max(state.max_food, state.food)

    return {
        "turn": state.turn - 1,
        "event": state.current_event["name"],
        "threat": state.current_event["threat"],
        "allocation": allocation.copy(),
        "available_workers": available_workers,
        "kinship_started": new_projects,
        "kinship_completed": int(prepared.get("kinship_completed", 0)),
        "hunt_count": allocation.get("H", 0),
        "hunt_score": hunt_data["score"],
        "hunt_skulls": hunt_data["skulls"],
        "hunt_success": hunt_data["success"],
        "hunt_death": hunt_data["death"],
        "food_rolls": food_results,
        "food_gained": sum(food_results),
        "food_loss": int(prepared.get("food_loss", 0)),
        "food_spoiled": int(prepared.get("food_spoiled", 0)),
        "prayer_used": bool(prepared.get("prayer_used", False)),
        "prestige_earned": bool(prepared.get("prestige_earned", False)),
        "prestige_era": prepared.get("prestige_era"),
        "fed": fed,
        "lost_to_food": lost_to_food,
        "people_end": state.people,
        "food_end": state.food,
        "game_over": state.people <= 0,
    }


def run_game(strategy: str = "balanced", seed: int | None = None, max_turns: int = 100) -> tuple[GameState, list[dict]]:
    rng = random.Random(seed)
    state = GameState()
    turn_rows: list[dict] = []

    for _ in range(max_turns):
        if state.people <= 0:
            break
        prepared = prepare_turn(state, rng, strategy)
        if prepared.get("game_over"):
            turn_rows.append({
                "turn": state.turn,
                "event": state.current_event["name"] if state.current_event else "None",
                "available_workers": prepared.get("available_workers", 0),
                "game_over": True,
                "cause": state.death_cause or ("kinship_overcommitment" if prepared.get("available_workers", 0) < 0 else "population_zero"),
                "prayer_used": prepared.get("prayer_used", False),
                "prestige_earned": prepared.get("prestige_earned", False),
                "prestige_era": prepared.get("prestige_era"),
                "kinship_completed": prepared.get("kinship_completed", 0),
            })
            break

        allocation = strategy_allocation(state, rng, strategy)
        result = run_turn(state, allocation, rng, strategy=strategy, prepared=prepared)
        turn_rows.append(result)
        if result.get("game_over") or state.people <= 0:
            break

    state.won = (
        max_turns >= 100
        and state.total_turns >= 100
        and state.people > 0
        and len(state.prestige_chips) == 5
    )
    return state, turn_rows
