from __future__ import annotations

"""User-facing Version 4 of the Kinship board game.

This file is a terminal interface built around the current Version 4 rules in
`game_engine_v4.py`. Put both files in the same folder and run this file.

Current playtest rules:
- 100-turn game; to win, be alive at the end of Turn 100 with all five Prestige chips.
- Five eras: Turns 1-7, 8-14, 15-30, 31-60, 61-99.
- Prestige costs: 1 / 3 / 5 / 7 / 9 Prayer Tokens by era.
- 1 Worship face is Sacrifice; 5 Worship faces are Prayer.
- 2 Prayer protects from event effects, but never removes Hunt Threat.
- Hunt: if there are no skulls, the hunt succeeds automatically; if skulls are
  rolled, the hunt must meet Threat or one person dies.
- Technology requires 1 Stick + 1 Rope + 1 Rock and grants one permanent
  upgrade to an eligible Food, Hunt, or Worship face.
- Food spoilage applies to food carried into a turn above 20.
"""

import sys
from typing import Optional

from game_engine_v4 import (
    EVENTS_T1,
    EVENTS_T2,
    EVENTS_T3,
    EVENTS_T4,
    EVENTS_T5,
    FOOD_REFERENCE,
    HUNT_REFERENCE,
    TECHNOLOGY_REFERENCE,
    WORSHIP_REFERENCE,
    ERA_ENDS,
    GameState,
    active_kinship_workers,
    apply_food_roll,
    draw_event,
    event_era,
    event_mod,
    has_technology_set,
    prestige_cost,
    resolve_hunt,
    resolve_sacrifice_sim,
    resolve_worship_roll,
    roll_die,
    tech_bonus,
)


# ---------------------------------------------------------------------------
# Constants / display helpers
# ---------------------------------------------------------------------------

WELCOME = r"""
============================================================
                    KINSHIP - VERSION 4
============================================================
Build a civilization that can survive 100 turns and earn
Prestige in every era.

At any input prompt, type Q to quit the game.
"""


class QuitGame(Exception):
    pass


def ask(prompt: str) -> str:
    """Read input and allow Q to quit from any input prompt."""
    value = input(prompt).strip()
    if value.lower() == "q":
        raise QuitGame
    return value


def pause(prompt: str = "Press Enter to continue...") -> None:
    ask(prompt)


def current_era_name(era: int) -> str:
    return f"Era {era}"


def format_allocation(allocation: dict[str, int]) -> str:
    order = ["F", "K", "H", "T", "W"]
    parts = []
    for category in order:
        amount = allocation.get(category, 0)
        if amount:
            parts.append(f"{amount}{category}")
    return " ".join(parts) if parts else "none"


def food_face_value(state: GameState, face: int) -> int:
    return FOOD_REFERENCE[face] + tech_bonus(state, "F", face)


def hunt_face_value(state: GameState, face: int) -> str:
    base = HUNT_REFERENCE[face]
    if base == "skull":
        return "Skull"
    return str(base + tech_bonus(state, "H", face))


def worship_face_value(state: GameState, face: int) -> str:
    effect, base = WORSHIP_REFERENCE[face]
    bonus = tech_bonus(state, "W", face)
    if effect == "sacrifice":
        return "Sacrifice" if bonus == 0 else "Devout Sacrifice"
    return f"Prayer x{base + bonus}"


def print_status(state: GameState) -> None:
    print("\n------------------------------------------------------------")
    print(
        f"Turn {state.turn} | {current_era_name(event_era(state.turn))} | "
        f"People: {state.people} | Food: {state.food} | Prayer: {state.prayer_tokens}"
    )
    print(
        f"Prestige: {len(state.prestige_chips)}/5 | "
        f"Chips earned: {sorted(state.prestige_chips) if state.prestige_chips else 'none'}"
    )
    if state.kinship_projects:
        print(f"Kinship projects active: {state.kinship_projects}")
    if state.tech_tiles:
        print(f"Technology pieces: {state.tech_tiles}")
    print("------------------------------------------------------------")


def describe_event(event: dict) -> None:
    print(f"\nEVENT: {event['name']}")
    print(f"Threat: {event['threat']}")
    print(event["description"])


# ---------------------------------------------------------------------------
# Prayer / Prestige
# ---------------------------------------------------------------------------


def handle_prayer_decision(state: GameState, protection_enabled: bool) -> bool:
    """Handle the Prayer/Prestige decision after the event is revealed.

    When protection_enabled is False, the protection option is hidden so the
    player is not repeatedly asked about spending 2 Prayer to ignore events.
    Prestige remains available and is still mutually exclusive with protection.

    Returns True if the event is protected/ignored.
    """
    era = event_era(state.turn)
    cost = prestige_cost(era)
    have_chip = era in state.prestige_chips

    can_protect = protection_enabled and state.prayer_tokens >= 2
    can_prestige = (not have_chip) and state.prayer_tokens >= cost

    if not can_protect and not can_prestige:
        return False

    print(f"\nPrayer Tokens available: {state.prayer_tokens}")

    options = {}
    number = 1

    if can_protect:
        print(f"{number}. Spend 2 Prayer to protect against this event")
        print("   (Protection never removes the Hunt Threat.)")
        options[str(number)] = "protect"
        number += 1

    if can_prestige:
        print(f"{number}. Spend {cost} Prayer to earn the {current_era_name(era)} Prestige chip")
        options[str(number)] = "prestige"
        number += 1

    print(f"{number}. Save Prayer")
    options[str(number)] = "save"

    while True:
        choice = ask("Choose: ")
        if choice not in options:
            print("Please choose one of the listed options.")
            continue

        action = options[choice]
        if action == "protect":
            state.prayer_tokens -= 2
            state.prayer_spent += 2
            state.events_ignored += 1
            state.current_event["ignored"] = True
            print("\nYour prayers have been answered. The event has been ignored.")
            return True

        if action == "prestige":
            state.prayer_tokens -= cost
            state.prestige_prayer_spent += cost
            state.prestige_chips.add(era)
            print(
                f"\nThe gods recognize your devotion. You earned the "
                f"{current_era_name(era)} Prestige chip."
            )
            return False

        print("You save your Prayer for another turn.")
        return False


# ---------------------------------------------------------------------------
# Allocation / input
# ---------------------------------------------------------------------------


def parse_allocation(text: str, available: int) -> dict[str, int]:
    """Parse inputs such as '4K 1W' or '2F 2T 1W'."""
    if not text:
        raise ValueError("Please enter an allocation.")

    tokens = text.upper().replace(",", " ").split()
    allocation = {"F": 0, "K": 0, "H": 0, "T": 0, "W": 0}

    for token in tokens:
        if len(token) < 2:
            raise ValueError(f"Invalid token: {token}")

        code = token[-1]
        number_text = token[:-1]

        if code not in allocation:
            raise ValueError(f"Unknown category: {code}")
        if not number_text.isdigit():
            raise ValueError(f"Invalid amount: {number_text}")

        amount = int(number_text)
        allocation[code] += amount

    total = sum(allocation.values())

    if total != available:
        raise ValueError(
            f"You must assign exactly {available} people. You assigned {total}."
        )

    if allocation["K"] % 2 != 0:
        raise ValueError("Kinship workers must be assigned in pairs.")

    return {k: v for k, v in allocation.items() if v > 0}


def get_allocation(state: GameState, available: int, prayer_protection_enabled: bool) -> tuple[dict[str, int], bool]:
    print(
        f"\nAssign {available} available people.\n"
        "F = Food | K = Kinship (pairs) | H = Hunt | T = Technology | W = Worship\n"
        "Example: 2F 2T 1W"
    )

    while True:
        mode_text = "ON" if prayer_protection_enabled else "OFF"
        raw = ask(f"Assignment [Prayer protection {mode_text}; P=toggle]: ")

        if raw.strip().lower() == "p":
            prayer_protection_enabled = not prayer_protection_enabled
            state_label = "ON" if prayer_protection_enabled else "OFF"
            print(f"Prayer protection prompt is now {state_label}.")
            continue

        try:
            allocation = parse_allocation(raw, available)
            print(f"Allocation: {format_allocation(allocation)}")
            return allocation, prayer_protection_enabled
        except ValueError as exc:
            print(exc)


# ---------------------------------------------------------------------------
# Technology
# ---------------------------------------------------------------------------


def technology_material_counts(state: GameState) -> dict[str, int]:
    return {
        "stick": state.tech_tiles.count("stick"),
        "rope": state.tech_tiles.count("rope"),
        "rock": state.tech_tiles.count("rock"),
    }


def show_technology_options(state: GameState) -> None:
    print("\nTECHNOLOGY UPGRADE")
    print("Choose one die face to permanently improve by +1.")
    print("\nFood die:")
    for face in range(1, 7):
        current = food_face_value(state, face)
        print(f"  F{face}: {current} -> {current + 1}")

    print("\nHunt die:")
    for face in range(3, 7):
        current = hunt_face_value(state, face)
        numeric = int(current)
        print(f"  H{face}: {numeric} -> {numeric + 1}")

    print("\nWorship die:")
    for face in range(1, 7):
        current = worship_face_value(state, face)
        if face == 1:
            new_value = "Devout Sacrifice"
        else:
            old_prayer = 1 + tech_bonus(state, "W", face)
            new_value = f"Prayer x{old_prayer + 1}"
        print(f"  W{face}: {current} -> {new_value}")


def apply_human_technology_upgrade(state: GameState) -> None:
    show_technology_options(state)
    print("\nType the face you want to upgrade, such as F3, H5, or W2.")

    while True:
        choice = ask("Upgrade: ").upper()

        if len(choice) != 2 or choice[0] not in {"F", "H", "W"} or not choice[1].isdigit():
            print("Use F1-F6, H3-H6, or W1-W6.")
            continue

        category = choice[0]
        face = int(choice[1])

        if category == "F" and face not in range(1, 7):
            print("Food faces are F1-F6.")
            continue
        if category == "H" and face not in range(3, 7):
            print("Hunt food faces are H3-H6. Skull faces cannot be upgraded.")
            continue
        if category == "W" and face not in range(1, 7):
            print("Worship faces are W1-W6.")
            continue

        old = (
            food_face_value(state, face)
            if category == "F"
            else hunt_face_value(state, face)
            if category == "H"
            else worship_face_value(state, face)
        )

        state.tech_upgrades[category][face] = tech_bonus(state, category, face) + 1
        state.tech_upgrades_completed += 1

        if state.first_tech_upgrade_turn is None:
            state.first_tech_upgrade_turn = state.turn

        new = (
            food_face_value(state, face)
            if category == "F"
            else hunt_face_value(state, face)
            if category == "H"
            else worship_face_value(state, face)
        )

        print(f"\nUpgraded {choice}: {old} -> {new}")
        return


def resolve_human_technology(state: GameState) -> None:
    if not has_technology_set(state):
        return

    counts = technology_material_counts(state)
    print(
        "\nTechnology set completed! "
        f"You had {counts['stick']} Stick, {counts['rope']} Rope, and {counts['rock']} Rock."
    )
    print("All Technology pieces are consumed for this upgrade.")
    state.tech_tiles.clear()
    state.tech_sets_completed += 1
    apply_human_technology_upgrade(state)


# ---------------------------------------------------------------------------
# Kinship / turn resolution
# ---------------------------------------------------------------------------


def resolve_kinship_start(state: GameState) -> int:
    completed = 0
    active = []
    for turns_left in state.kinship_projects:
        turns_left -= 1
        if turns_left <= 0:
            completed += 1
        else:
            active.append(turns_left)

    state.kinship_projects = active
    if completed:
        state.people += completed
        state.kinship_completed += completed
        state.max_people = max(state.max_people, state.people)
        state.max_population = max(state.max_population, state.people)
        print(f"{completed} Kinship project(s) completed. You gained {completed} person(s).")
    return completed


def start_kinship(state: GameState, count: int) -> int:
    projects = count // 2
    if projects <= 0:
        return 0
    timer = 3 + event_mod(state, "kinship_modifier")
    state.kinship_projects.extend([timer] * projects)
    state.kinship_started += projects
    print(f"Started {projects} Kinship project(s).")
    return projects


def resolve_technology_rolls(state: GameState, count: int) -> None:
    for _ in range(count):
        roll = roll_die(RNG)
        effect, value = TECHNOLOGY_REFERENCE[roll]
        print(f"Technology roll: {roll} -> {value.title()}")
        if effect == "item":
            state.tech_tiles.append(value)
            print(f"  Gained 1 {value.title()}.")
            if has_technology_set(state):
                resolve_human_technology(state)


def resolve_worship_rolls(state: GameState, count: int) -> None:
    for _ in range(count):
        roll = roll_die(RNG)
        effect, value = WORSHIP_REFERENCE[roll]

        if effect == "prayer":
            gained = value + tech_bonus(state, "W", roll) + event_mod(state, "prayer_modifier")
            state.prayer_tokens += gained
            state.prayer_earned += gained
            print(f"Worship roll: {roll} -> +{gained} Prayer")
        else:
            print(f"Worship roll: {roll} -> SACRIFICE")
            resolve_human_sacrifice(state, roll)
            if state.people <= 0:
                break


def resolve_human_sacrifice(state: GameState, roll: int) -> None:
    upgraded = tech_bonus(state, "W", roll) > 0
    state.sacrifices += 1
    state.people -= 1

    print(f"A member of the tribe is sacrificed. People remaining: {state.people}")

    if state.people <= 0:
        state.people = 0
        state.death_cause = "sacrifice"
        print("The sacrifice leaves the tribe with no people.")
        return

    print("Choose the sacrifice's benefit:")
    if upgraded:
        print("1. +15 Food")
        print("2. 2 free Technology upgrades")
        print("3. Gain 1 person")
    else:
        print("1. +10 Food")
        print("2. 1 free Technology upgrade")
        print("3. Finish all active Kinship projects")

    while True:
        choice = ask("Sacrifice benefit: ")
        if choice not in {"1", "2", "3"}:
            print("Please choose 1, 2, or 3.")
            continue
        break

    if choice == "1":
        gain = 15 if upgraded else 10
        state.food += gain
        print(f"You gained {gain} Food.")

    elif choice == "2":
        upgrades = 2 if upgraded else 1
        print(f"You receive {upgrades} free Technology upgrade(s).")
        for i in range(upgrades):
            print(f"\nFree Technology upgrade {i + 1} of {upgrades}")
            apply_human_technology_upgrade(state)

    else:
        if upgraded:
            state.people += 2
            state.max_people = max(state.max_people, state.people)
            state.max_population = max(state.max_population, state.people)
            print("Devout sacrifice: you gain 1 net person.")
        else:
            completed = len(state.kinship_projects)
            state.kinship_projects.clear()
            state.people += completed
            state.max_people = max(state.max_people, state.people)
            state.max_population = max(state.max_population, state.people)
            print(f"Finished {completed} Kinship project(s) and gained {completed} person(s).")


def feed_tribe(state: GameState) -> bool:
    fed = state.food >= state.people
    if fed:
        state.food -= state.people
        print(f"Everyone was fed. Food left over: {state.food}")
        return True

    state.people = max(state.people - 1, 0)
    state.food = 0
    print("There was not enough Food to feed everyone. The tribe loses 1 person.")
    if state.people <= 0:
        state.death_cause = "starvation"
    return False


def check_prestige_deadline(state: GameState, turn: int) -> bool:
    era = event_era(turn)
    if turn != ERA_ENDS[era]:
        return False
    if era in state.prestige_chips:
        return False

    state.death_cause = "prestige_deadline"
    print(
        f"\nThe {current_era_name(era)} has ended without its Prestige chip."
    )
    print("The civilization cannot win. GAME OVER.")
    return True


def print_post_game_stats(state: GameState) -> None:
    """Show a concise post-game summary for human playtesting."""
    print("\n" + "=" * 60)
    print("                    POST-GAME STATS")
    print("=" * 60)

    if state.won:
        print("RESULT: VICTORY")
    else:
        print("RESULT: GAME OVER")
        if state.death_cause:
            print(f"Cause: {state.death_cause}")

    print(f"Turns survived:        {state.total_turns}")
    print(f"Final population:      {state.people}")
    print(f"Maximum population:    {state.max_population}")
    print(f"Final Food:            {state.food}")
    print(f"Maximum Food:          {state.max_food}")
    print(f"Prayer earned:         {state.prayer_earned}")
    print(f"Prayer spent:          {state.prayer_spent}")
    print(f"Prestige chips:        {len(state.prestige_chips)}/5")

    if state.prestige_chips:
        print(f"Eras completed:        {sorted(state.prestige_chips)}")
    else:
        print("Eras completed:        none")

    print(f"Hunts:                 {state.total_hunts}")
    print(f"Successful Hunts:      {state.successful_hunts}")
    print(f"Hunt failures:         {state.hunt_failures}")
    print(f"Hunt deaths:           {state.hunt_deaths}")
    print(f"Kinship started:       {state.kinship_started}")
    print(f"Kinship completed:     {state.kinship_completed}")
    print(f"Technology upgrades:   {state.tech_upgrades_completed}")
    print(f"Technology sets:       {state.tech_sets_completed}")
    print(f"Sacrifices:            {state.sacrifices}")
    print(f"Events ignored:        {state.events_ignored}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Game
# ---------------------------------------------------------------------------


def run_game_human() -> GameState:
    global RNG
    RNG = __import__("random").Random()

    state = GameState()
    prayer_protection_enabled = True

    print(WELCOME)
    print("Prayer protection prompt: ON")
    print("At any Assignment prompt, press P to toggle the event-protection prompt on/off.")
    pause()

    while state.turn <= 100 and state.people > 0:
        turn = state.turn
        print("\n" + "=" * 60)
        print(f"TURN {turn}")
        print("=" * 60)

        # Turn 100 is the final victory check. No additional event is needed.
        if turn == 100:
            state.won = state.people > 0 and len(state.prestige_chips) == 5
            state.total_turns = 100
            if state.won:
                print("\n============================================================")
                print("                        VICTORY!")
                print("============================================================")
                print("Your civilization survived 100 turns and earned all five Prestige chips.")
            else:
                print("\nTurn 100 reached, but the civilization has not met the Prestige requirement.")
            print_post_game_stats(state)
            return state

        state.current_event = draw_event(turn, RNG)
        describe_event(state.current_event)
        print_status(state)

        # Prayer decision happens after seeing the event but before allocation.
        handle_prayer_decision(state, prayer_protection_enabled)

        # Event effects now apply unless protected.
        food_loss = event_mod(state, "food_loss")
        if food_loss:
            state.food = max(state.food - food_loss, 0)
            print(f"Food loss from event: {food_loss}")

        # Version C spoilage.
        spoiled_food = 0
        if state.food > 20:
            spoiled_food = (state.food - 20) // 4
            state.food -= spoiled_food
            print(f"Food spoiled: {spoiled_food}")

        # Kinship projects complete before worker allocation.
        resolve_kinship_start(state)

        available = state.people - active_kinship_workers(state)
        if available < 0:
            state.death_cause = "kinship_overcommitment"
            print("Too many people are committed to Kinship projects. GAME OVER.")
            break
        if state.people <= 0:
            break

        print(f"Start of turn: {state.people} people, {state.food} food")
        allocation, prayer_protection_enabled = get_allocation(state, available, prayer_protection_enabled)

        # Kinship
        start_kinship(state, allocation.get("K", 0))

        # Hunt
        hunt_data = resolve_hunt(state, allocation.get("H", 0), "human", RNG)
        if allocation.get("H", 0):
            print(
                f"Hunt result: {hunt_data['rolls']} -> "
                f"{hunt_data['score']} Food | skulls: {hunt_data['skulls']} | "
                f"{'SUCCESS' if hunt_data['success'] else 'FAILED'}"
            )
            if hunt_data["death"]:
                print("The failed Hunt cost 1 person.")

        if state.people <= 0:
            break

        # Food
        if allocation.get("F", 0):
            food_results = [
                apply_food_roll(state, roll_die(RNG))
                for _ in range(allocation.get("F", 0))
            ]
            print(f"Food production: {food_results} -> +{sum(food_results)} Food")

        # Technology
        if allocation.get("T", 0):
            resolve_technology_rolls(state, allocation.get("T", 0))

        # Worship
        if allocation.get("W", 0):
            resolve_worship_rolls(state, allocation.get("W", 0))

        if state.people <= 0:
            break

        # Feed.
        feed_tribe(state)

        # Diagnostics.
        state.max_population = max(state.max_population, state.people)
        state.max_people = max(state.max_people, state.people)
        state.max_food = max(state.max_food, state.food)

        if turn == 30:
            state.food_turn_30 = state.food
            state.people_turn_30 = state.people
        elif turn == 60:
            state.food_turn_60 = state.food
            state.people_turn_60 = state.people
        elif turn == 90:
            state.food_turn_90 = state.food
            state.people_turn_90 = state.people

        state.total_turns += 1

        if state.people <= 0:
            break

        if check_prestige_deadline(state, turn):
            break

        print_status(state)
        pause("Next turn?")
        state.turn += 1

    if state.people <= 0:
        if not state.death_cause:
            state.death_cause = "population_zero"
        print("\nGAME OVER.")
        print(f"Cause: {state.death_cause}")

    print_post_game_stats(state)
    return state


if __name__ == "__main__":
    try:
        final_state = run_game_human()
        if final_state.won:
            sys.exit(0)
    except QuitGame:
        print("\nGame quit.")
        sys.exit(0)
