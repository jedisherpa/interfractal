"""Bounded synthetic-key checks; no application or human claim is tested."""
from itertools import product
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent


def physical(task, state, plan):
    route = task["routes"][plan["route"]]
    frame = task["frames"][plan["frame"]]
    battery = task["batteries"][plan["battery"]]
    return (
        plan["route"] not in state["closed_routes"]
        and frame["width"] <= route["width"]
        and route["travel"] + frame["setup"] <= task["common_brief"]["available_minutes"]
        and battery["runtime"] >= task["common_brief"]["required_runtime"]
    )


def authorized_under_task_rule(task, state):
    """Only this fixture's declared rule; not a general authorization engine."""
    version = state["proposal_version"]
    actors = [card["actor"] for card in task["role_cards"]]
    return (
        all(state["endorsement_versions"].get(actor) == version for actor in actors)
        and state["mandate"]["version"] == version
        and state["proposal"]["route"] in state["mandate"]["routes"]
    )


def action_ready(task, state):
    return physical(task, state, state["proposal"]) and authorized_under_task_rule(task, state)


def resource_assignments(world, units):
    """Enumerate injective battery assignments to simultaneous kit requests."""
    if units > world["kit_count"]:
        return []
    return [list(a) for a in product(world["available_long_batteries"], repeat=units)
            if len(set(a)) == units]


def main():
    task = json.loads((ROOT / "lantern_task.json").read_text())
    rows, evaluated = [], 0
    for state in task["states"]:
        feasible = []
        for route, frame, battery in product(task["routes"], task["frames"], task["batteries"]):
            evaluated += 1
            plan = {"route": route, "frame": frame, "battery": battery}
            if physical(task, state, plan):
                feasible.append("|".join((route, frame, battery)))
        feasible.sort()
        obs = {
            "proposed_plan_physically_feasible": physical(task, state, state["proposal"]),
            "authorized_under_task_rule": authorized_under_task_rule(task, state),
            "action_ready": action_ready(task, state),
        }
        assert feasible == state["expected_physical_plans"], (state["id"], feasible)
        for name, value in obs.items():
            assert value == state["expected_" + name], (state["id"], name, value)
        rows.append({"state": state["id"], "physical_plans": feasible, **obs})
    # Exact observable-insufficiency counterexample, not a dynamics/closure test:
    # equal route/count summaries conceal different current readiness.
    state3, state4 = task["states"][2:4]
    count = len(task["role_cards"])
    coarse3 = {"route": state3["proposal"]["route"], "participants": count}
    coarse4 = {"route": state4["proposal"]["route"], "participants": count}
    assert coarse3 == coarse4 and action_ready(task, state3) != action_ready(task, state4)

    resource = json.loads((ROOT / "capability_summary_counterexample.json").read_text())
    resource_rows = []
    for world in resource["worlds"]:
        for units in resource["requested_simultaneous_units"]:
            assignments = resource_assignments(world, units)
            result = bool(assignments)
            assert result == world["expected_request_feasibility"][str(units)]
            resource_rows.append({"world": world["id"], "requested_units": units,
                                  "feasible": result, "witness_assignments": assignments})
    w1, w2 = resource["worlds"]
    assert w1["outward_summary"] == w2["outward_summary"]
    assert bool(resource_assignments(w1, 2)) != bool(resource_assignments(w2, 2))
    for world in resource["worlds"]:
        for units in resource["requested_simultaneous_units"]:
            predicted = units <= min(world["kit_count"], len(world["available_long_batteries"]))
            assert predicted == bool(resource_assignments(world, units))
    result = {
        "status": "PASS", "kind": "bounded synthetic fixture key consistency",
        "states": rows, "candidate_plans_checked": evaluated,
        "proposed_plan_observations_checked": len(rows),
        "readiness_counterexample": "S3/S4 share route/count but differ in current readiness.",
        "capability_request_checks": resource_rows,
        "capability_counterexample": "Equal two-kit offers conceal one versus two exclusive batteries; only the latter serves two simultaneous requests.",
        "not_tested": ["deployed software", "visualizer rendering", "human understanding",
                       "collective interaction advantage", "predictive dynamics", "arbitrary authorization policies"]
    }
    (ROOT / "synthetic_check_result.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
