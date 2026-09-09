from __future__ import annotations

"""Monte Carlo simulator for Version 4 of Kinship.

Version 4 uses:
- 100-turn maximum game length.
- Victory only if the tribe is alive at Turn 100 and has one Prestige chip
  from each of the five eras.
- Linear Prestige costs of 6/7/8/9/10 Prayer Tokens.
- Five Technology upgrade experiments plus twelve baseline/rational strategies.

No CSV files are written. The simulator prints summaries and saves a few
PNG graphs in the output directory.
"""

from collections import Counter
from pathlib import Path
import statistics
import random

import matplotlib.pyplot as plt

from game_engine_v4 import (
    run_game,
    event_era,
    GameState,
)

# ============================================================
# SETTINGS
# ============================================================

GAMES_PER_STRATEGY = 100
MAX_TURNS = 100
OUTPUT_DIR = Path("simulation_graphs_v4")

STRATEGIES = [
    # Mechanical controls
    "random",
    "food",
    "hunt",
    "kinship",
    "technology",
    "worship",

    # Rational / behavioral strategies
    "balanced",
    "risk_averse",
    "risk_seeking",
    "early_risk",
    "late_risk",
    "opportunistic",

    # Additional strategies requested for deeper testing
    "stockpile_growth",
    "tech_growth",
    "reserve_threshold",
    "prestige_early",
    "prestige_late",

    # Technology policy experiments
    "tech_food_low",
    "tech_food_high",
    "tech_random",
    "tech_alternate",
    "tech_random_category",
    "tech_hunt",
    "tech_worship",
    "tech_balanced",
    "tech_adaptive",

    "hunt_aggressive",
    "hunt_conservative",
    "hunt_threshold",
    "hunt_large_party",
    "hunt_early",
    "hunt_opportunistic",
]

DISPLAY_NAMES = {
    "random": "Random",
    "food": "Pure Food",
    "hunt": "Pure Hunt",
    "kinship": "Pure Kinship",
    "technology": "Pure Technology",
    "worship": "Pure Worship",
    "balanced": "Balanced",
    "risk_averse": "Risk-Averse",
    "risk_seeking": "Risk-Seeking",
    "early_risk": "Early-Risk",
    "late_risk": "Late-Risk",
    "opportunistic": "Opportunistic",
    "stockpile_growth": "Stockpile -> Growth",
    "tech_growth": "Tech -> Growth",
    "reserve_threshold": "Reserve Threshold",
    "prestige_early": "Prestige Early",
    "prestige_late": "Prestige Late",
    "tech_food_low": "Tech: Weak Food",
    "tech_food_high": "Tech: Strong Food",
    "tech_random": "Tech: Random",
    "tech_alternate": "Tech: Alternate",
    "tech_random_category": "Tech: Random Category",
    "hunt_aggressive": "Hunt: Aggressive",
    "hunt_conservative": "Hunt: Conservative",
    "hunt_threshold": "Hunt: Food Threshold",
    "hunt_large_party": "Hunt: Large Party",
    "hunt_early": "Hunt: Early",
    "hunt_opportunistic": "Hunt: Opportunistic",
    "tech_hunt": "Tech: Hunt",
    "tech_worship": "Tech: Worship",
    "tech_balanced": "Tech: Balanced",
    "tech_adaptive": "Tech: Adaptive",
}

# ============================================================
# HELPERS
# ============================================================

def mean(values: list[float]) -> float:
    return statistics.mean(values) if values else 0.0


def median_value(values: list[float]) -> float:
    return statistics.median(values) if values else 0.0


def pct(condition_values: list[bool]) -> float:
    return sum(condition_values) / len(condition_values) if condition_values else 0.0


def strategy_seed(strategy: str, game_number: int) -> int:
    """Stable seed that does not depend on Python's randomized hash()."""
    code = sum((index + 1) * ord(char) for index, char in enumerate(strategy))
    return 100000 + game_number * 1000 + code


def run_one_strategy(strategy: str) -> tuple[list[dict], list[dict]]:
    """Return game-level rows and all turn-level rows for one strategy."""
    game_rows: list[dict] = []
    turn_rows: list[dict] = []

    for game_number in range(1, GAMES_PER_STRATEGY + 1):
        seed = strategy_seed(strategy, game_number)
        state, turns = run_game(strategy=strategy, seed=seed, max_turns=MAX_TURNS)

        for turn_row in turns:
            row = turn_row.copy()
            row["strategy"] = strategy
            row["game_number"] = game_number
            turn_rows.append(row)

        if state.won:
            end_reason = "victory"
        elif state.people <= 0:
            end_reason = state.death_cause or "population_zero"
        elif state.total_turns >= MAX_TURNS:
            end_reason = "survived_without_all_prestige"
        else:
            end_reason = "other"

        game_rows.append({
            "strategy": strategy,
            "game_number": game_number,
            "seed": seed,
            "won": state.won,
            "turns": state.total_turns,
            "people": state.people,
            "food": state.food,
            "max_people": state.max_people,
            "max_food": state.max_food,
            "tech_sets": state.tech_sets_completed,
            "tech_upgrades": state.tech_upgrades_completed,
            "first_tech_turn": state.first_tech_upgrade_turn,
            "kinship_started": state.kinship_started,
            "kinship_completed": state.kinship_completed,
            "prayer_earned": state.prayer_earned,
            "prayer_spent": state.prayer_spent,
            "prestige_chips": len(state.prestige_chips),
            "prestige_prayer_spent": state.prestige_prayer_spent,
            "sacrifices": state.sacrifices,
            "events_ignored": state.events_ignored,
            "hunt_deaths": state.hunt_deaths,
            "successful_hunts": state.successful_hunts,
            "hunt_failures": state.hunt_failures,
            "death_cause": state.death_cause,
            "end_reason": end_reason,
            "food_30": state.food_turn_30,
            "food_60": state.food_turn_60,
            "food_90": state.food_turn_90,
            "people_30": state.people_turn_30,
            "people_60": state.people_turn_60,
            "people_90": state.people_turn_90,
            "max_population": state.max_population,
            "min_population_after_10": state.min_population_after_turn_10,
            "prestige_eras": tuple(sorted(state.prestige_chips)),
        })

    return game_rows, turn_rows


# ============================================================
# PRINTED RESULTS
# ============================================================

def print_summary(all_game_rows: list[dict]) -> None:
    print("\nVERSION 4 SIMULATION")
    print("=" * 120)
    print(
        f"{'Strategy':<23}"
        f"{'Win':>9}"
        f"{'Avg Turns':>12}"
        f"{'Median':>10}"
        f"{'Avg People':>12}"
        f"{'Avg Food':>11}"
        f"{'Prestige':>11}"
        f"{'Hunt Deaths':>14}"
    )
    print("-" * 120)

    for strategy in STRATEGIES:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        if not rows:
            continue
        wins = pct([r["won"] for r in rows])
        turns = [r["turns"] for r in rows]
        print(
            f"{DISPLAY_NAMES[strategy]:<23}"
            f"{wins:>8.1%}"
            f"{mean(turns):>12.2f}"
            f"{median_value(turns):>10.2f}"
            f"{mean([r['people'] for r in rows]):>12.2f}"
            f"{mean([r['food'] for r in rows]):>11.2f}"
            f"{mean([r['prestige_chips'] for r in rows]):>11.2f}"
            f"{mean([r['hunt_deaths'] for r in rows]):>14.2f}"
        )


def print_prestige_diagnostics(all_game_rows: list[dict]) -> None:
    print("\nPRESTIGE DIAGNOSTICS")
    print("=" * 110)
    print(
        f"{'Strategy':<23}"
        f"{'Avg Chips':>11}"
        f"{'Era 1':>9}"
        f"{'Era 2':>9}"
        f"{'Era 3':>9}"
        f"{'Era 4':>9}"
        f"{'Era 5':>9}"
        f"{'Avg Prayer':>14}"
    )
    print("-" * 110)

    for strategy in STRATEGIES:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        if not rows:
            continue

        era_rates = []
        for era in range(1, 6):
            era_rates.append(
                pct([era in r["prestige_eras"] for r in rows])
            )

        print(
            f"{DISPLAY_NAMES[strategy]:<23}"
            f"{mean([r['prestige_chips'] for r in rows]):>11.2f}"
            f"{era_rates[0]:>8.1%}"
            f"{era_rates[1]:>8.1%}"
            f"{era_rates[2]:>8.1%}"
            f"{era_rates[3]:>8.1%}"
            f"{era_rates[4]:>8.1%}"
            f"{mean([r['prestige_prayer_spent'] for r in rows]):>14.2f}"
        )


def print_technology_diagnostics(all_game_rows: list[dict]) -> None:
    tech_names = [
        "technology",
        "tech_food_low",
        "tech_food_high",
        "tech_random",
        "tech_alternate",
        "tech_random_category",
    ]

    print("\nTECHNOLOGY DIAGNOSTICS")
    print("=" * 115)
    print(
        f"{'Strategy':<23}"
        f"{'Upgrades':>11}"
        f"{'First Tech':>12}"
        f"{'Max Pop':>10}"
        f"{'Food 30':>10}"
        f"{'Food 60':>10}"
        f"{'Food 90':>10}"
        f"{'Pop 30':>10}"
        f"{'Pop 60':>10}"
        f"{'Pop 90':>10}"
    )
    print("-" * 115)

    for strategy in tech_names:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        if not rows:
            continue

        def existing(key: str) -> float:
            vals = [r[key] for r in rows if r[key] is not None]
            return mean(vals)

        print(
            f"{DISPLAY_NAMES[strategy]:<23}"
            f"{mean([r['tech_upgrades'] for r in rows]):>11.2f}"
            f"{existing('first_tech_turn'):>12.2f}"
            f"{mean([r['max_population'] for r in rows]):>10.2f}"
            f"{existing('food_30'):>10.2f}"
            f"{existing('food_60'):>10.2f}"
            f"{existing('food_90'):>10.2f}"
            f"{existing('people_30'):>10.2f}"
            f"{existing('people_60'):>10.2f}"
            f"{existing('people_90'):>10.2f}"
        )


def print_end_reasons(all_game_rows: list[dict]) -> None:
    print("\nEND REASONS")
    print("=" * 80)

    for strategy in STRATEGIES:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        counts = Counter(r["end_reason"] for r in rows)
        print(f"\n{DISPLAY_NAMES[strategy]}")
        for reason, count in sorted(counts.items()):
            print(f"  {reason:<34} {count / len(rows):>6.1%}")


# ============================================================
# GRAPHS
# ============================================================

def graph_victory_rate(all_game_rows: list[dict]) -> None:
    values = []
    labels = []
    for strategy in STRATEGIES:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        values.append(100 * pct([r["won"] for r in rows]))
        labels.append(DISPLAY_NAMES[strategy])

    fig, ax = plt.subplots(figsize=(12, 8))
    ax.barh(labels, values)
    ax.set_xlabel("Victory rate (%)")
    ax.set_title("Version 4 Victory Rate by Strategy")
    ax.invert_yaxis()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "victory_rate.png", dpi=180)
    plt.close(fig)


def graph_survival_distribution(all_game_rows: list[dict]) -> None:
    data = []
    labels = []
    for strategy in STRATEGIES:
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        data.append([r["turns"] for r in rows])
        labels.append(DISPLAY_NAMES[strategy])

    fig, ax = plt.subplots(figsize=(14, 10))
    ax.boxplot(data, vert=False, tick_labels=labels, showfliers=False)
    ax.set_xlabel("Turn reached")
    ax.set_title("Survival Distribution by Strategy")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "survival_distribution.png", dpi=180)
    plt.close(fig)


def graph_population_and_food(all_turn_rows: list[dict]) -> None:
    selected = [
        "balanced",
        "risk_averse",
        "risk_seeking",
        "stockpile_growth",
        "tech_growth",
        "technology",
    ]

    # Population
    fig, ax = plt.subplots(figsize=(12, 7))
    for strategy in selected:
        rows = [r for r in all_turn_rows if r["strategy"] == strategy and r.get("people_end") is not None]
        by_turn: dict[int, list[int]] = {}
        for row in rows:
            by_turn.setdefault(int(row["turn"]), []).append(int(row["people_end"]))
        turns = sorted(by_turn)
        values = [mean(by_turn[t]) for t in turns]
        ax.plot(turns, values, label=DISPLAY_NAMES[strategy])
    ax.set_xlabel("Turn")
    ax.set_ylabel("Average population")
    ax.set_title("Average Population Over Time")
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "population_over_time.png", dpi=180)
    plt.close(fig)

    # Food
    fig, ax = plt.subplots(figsize=(12, 7))
    for strategy in selected:
        rows = [r for r in all_turn_rows if r["strategy"] == strategy and r.get("food_end") is not None]
        by_turn: dict[int, list[int]] = {}
        for row in rows:
            by_turn.setdefault(int(row["turn"]), []).append(int(row["food_end"]))
        turns = sorted(by_turn)
        values = [mean(by_turn[t]) for t in turns]
        ax.plot(turns, values, label=DISPLAY_NAMES[strategy])
    ax.set_xlabel("Turn")
    ax.set_ylabel("Average stored Food")
    ax.set_title("Average Food Over Time")
    ax.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "food_over_time.png", dpi=180)
    plt.close(fig)


def graph_prestige_by_era(all_game_rows: list[dict]) -> None:
    strategies = [
        "balanced",
        "risk_averse",
        "risk_seeking",
        "stockpile_growth",
        "tech_growth",
        "prestige_early",
        "prestige_late",
    ]

    fig, ax = plt.subplots(figsize=(12, 7))
    eras = [1, 2, 3, 4, 5]
    positions = list(range(len(eras)))
    width = 0.11

    for index, strategy in enumerate(strategies):
        rows = [r for r in all_game_rows if r["strategy"] == strategy]
        rates = [100 * pct([era in r["prestige_eras"] for r in rows]) for era in eras]
        offsets = [p + (index - (len(strategies) - 1) / 2) * width for p in positions]
        ax.bar(offsets, rates, width=width, label=DISPLAY_NAMES[strategy])

    ax.set_xticks(positions)
    ax.set_xticklabels(["Era 1", "Era 2", "Era 3", "Era 4", "Era 5"])
    ax.set_ylabel("Games earning era chip (%)")
    ax.set_title("Prestige Acquisition by Era")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "prestige_by_era.png", dpi=180)
    plt.close(fig)


def make_graphs(all_game_rows: list[dict], all_turn_rows: list[dict]) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    graph_victory_rate(all_game_rows)
    graph_survival_distribution(all_game_rows)
    graph_population_and_food(all_turn_rows)
    graph_prestige_by_era(all_game_rows)


# ============================================================
# MAIN
# ============================================================
OUTPUT_DIR.mkdir(exist_ok=True)


def main() -> None:
    print(
        f"Running Version 4: {GAMES_PER_STRATEGY} games per strategy, "
        f"{MAX_TURNS} turns max."
    )
    for graph in OUTPUT_DIR.glob("*.png"):
        graph.unlink()
    all_game_rows: list[dict] = []
    all_turn_rows: list[dict] = []

    for strategy in STRATEGIES:
        print(f"Running strategy: {DISPLAY_NAMES[strategy]}")
        game_rows, turn_rows = run_one_strategy(strategy)
        all_game_rows.extend(game_rows)
        all_turn_rows.extend(turn_rows)

    print_summary(all_game_rows)
    print_prestige_diagnostics(all_game_rows)
    print_technology_diagnostics(all_game_rows)
    print_end_reasons(all_game_rows)
    make_graphs(all_game_rows, all_turn_rows)

    print("\nGraphs saved to:")
    print(f"  {OUTPUT_DIR / 'victory_rate.png'}")
    print(f"  {OUTPUT_DIR / 'survival_distribution.png'}")
    print(f"  {OUTPUT_DIR / 'population_over_time.png'}")
    print(f"  {OUTPUT_DIR / 'food_over_time.png'}")
    print(f"  {OUTPUT_DIR / 'prestige_by_era.png'}")


if __name__ == "__main__":
    main()
