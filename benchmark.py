#!/usr/bin/env python3
"""Benchmark Suite — compare all routing algorithms over N random routes.

Usage:
    python benchmark.py --num-routes 100 --output results/benchmark/
    python benchmark.py --algorithms dijkstra astar eco gnn hybrid --num-routes 50
    python benchmark.py --help

Output:
    - Console table with comparison statistics
    - CSV: results/benchmark/benchmark_<timestamp>.csv
    - JSON: results/benchmark/benchmark_<timestamp>.json
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import random
import statistics
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Ensure project root is on sys.path
_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _PROJECT_ROOT)

_ALGORITHMS = ["dijkstra", "astar", "eco", "scenic", "q_learning", "gnn", "hybrid"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="EV Routing Benchmark Suite — compare all algorithms over random routes"
    )
    p.add_argument("--num-routes", type=int, default=100, help="Number of random routes (default: 100)")
    p.add_argument(
        "--algorithms", nargs="+", default=_ALGORITHMS,
        help=f"Algorithms to benchmark (default: all). Choices: {_ALGORITHMS}"
    )
    p.add_argument("--output", default="results/benchmark", help="Output directory (default: results/benchmark)")
    p.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    p.add_argument("--battery-soc", type=float, default=80.0, help="Battery SOC %% (default: 80)")
    p.add_argument("--battery-kwh", type=float, default=60.0, help="Battery capacity kWh (default: 60)")
    p.add_argument("--no-csv", action="store_true", help="Skip CSV output")
    p.add_argument("--quiet", action="store_true", help="Suppress per-route output")
    return p.parse_args()


def load_infrastructure():
    """Load Hyderabad graph + state."""
    print("Loading Hyderabad graph...")
    from backend.app.services.graph_service import get_hyderabad_graph
    from backend.app.services.station_service import get_charging_stations, snap_stations_to_graph
    from backend.app.state import get_state, AppState

    hg = get_hyderabad_graph()
    stations = get_charging_stations(17.3850, 78.4867)
    snap_stations_to_graph(stations, hg)

    state: AppState = get_state()
    state.hyderabad_graph = hg
    state.charging_stations = stations

    # Try spatial index
    try:
        from backend.app.services.spatial_index import StationSpatialIndex
        state.spatial_index = StationSpatialIndex(stations)
    except Exception as e:
        print(f"  ⚠ Spatial index skipped: {e}")

    # Try GNN service
    try:
        from backend.app.services.gnn_routing_service import get_gnn_service
        gnn_svc = get_gnn_service()
        gnn_svc.load_model(graph=hg)
        state.gnn_service = gnn_svc
        print(f"  ✓ GNN service: model_loaded={gnn_svc.is_loaded}")
    except Exception as e:
        print(f"  ⚠ GNN service skipped: {e}")

    print(f"  ✓ Graph: {hg.num_nodes} nodes, {hg.num_edges} edges, {len(stations)} stations")
    return state, hg


def run_one(state, algorithm: str, source: int, dest: int, battery_soc: float, battery_kwh: float) -> Dict[str, Any]:
    """Run a single route and return metrics."""
    from backend.app.services.routing_service import generate_route
    t0 = time.perf_counter()
    try:
        result = generate_route(state, source, dest, battery_soc, battery_kwh, algorithm, 0.18)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        props = result["route"]["properties"]
        return {
            "algorithm": algorithm,
            "source": source,
            "dest": dest,
            "success": True,
            "distance_km": props.get("distance_km", 0),
            "energy_kwh": props.get("energy_kwh", 0),
            "time_minutes": props.get("time_minutes", 0),
            "path_len": len(props.get("path_node_ids", [])),
            "charging_stops": len(props.get("charging_stops", [])),
            "battery_remaining_pct": props.get("battery_remaining_pct", 0),
            "gnn_score": props.get("gnn_score"),
            "ai_confidence": props.get("ai_confidence"),
            "computation_ms": round(elapsed_ms, 2),
        }
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "algorithm": algorithm,
            "source": source,
            "dest": dest,
            "success": False,
            "distance_km": 0,
            "energy_kwh": 0,
            "time_minutes": 0,
            "path_len": 0,
            "charging_stops": 0,
            "battery_remaining_pct": 0,
            "gnn_score": None,
            "ai_confidence": None,
            "computation_ms": round(elapsed_ms, 2),
            "error": str(exc)[:80],
        }


def aggregate(raw: List[Dict], algorithm: str) -> Dict[str, Any]:
    """Aggregate raw samples for one algorithm."""
    samples = [r for r in raw if r["algorithm"] == algorithm]
    successes = [s for s in samples if s["success"]]
    n = len(samples)
    ns = len(successes)

    def safe_mean(vals):
        return round(statistics.mean(vals), 3) if vals else 0.0

    def safe_std(vals):
        return round(statistics.stdev(vals), 3) if len(vals) > 1 else 0.0

    dists = [s["distance_km"] for s in successes]
    energies = [s["energy_kwh"] for s in successes]
    times = [s["time_minutes"] for s in successes]
    comps = [s["computation_ms"] for s in samples]

    return {
        "algorithm": algorithm,
        "num_samples": n,
        "num_success": ns,
        "success_rate": round(ns / max(n, 1), 3),
        "avg_distance_km": safe_mean(dists),
        "std_distance_km": safe_std(dists),
        "avg_energy_kwh": safe_mean(energies),
        "std_energy_kwh": safe_std(energies),
        "avg_time_minutes": safe_mean(times),
        "avg_computation_ms": safe_mean(comps),
        "median_computation_ms": round(statistics.median(comps), 2) if comps else 0.0,
    }


def print_table(agg_results: List[Dict]) -> None:
    """Print a pretty comparison table."""
    print("\n" + "=" * 100)
    print("EV ROUTING BENCHMARK RESULTS")
    print("=" * 100)
    header = f"{'Algorithm':<20} {'Success%':>9} {'Dist(km)':>10} {'Energy(kWh)':>12} {'Time(min)':>10} {'Compute(ms)':>12}"
    print(header)
    print("-" * 100)
    for r in sorted(agg_results, key=lambda x: -x["success_rate"]):
        print(
            f"{r['algorithm']:<20} "
            f"{r['success_rate']*100:>8.1f}% "
            f"{r['avg_distance_km']:>10.2f} "
            f"{r['avg_energy_kwh']:>12.3f} "
            f"{r['avg_time_minutes']:>10.1f} "
            f"{r['avg_computation_ms']:>11.1f}ms"
        )
    print("=" * 100)


def main():
    args = parse_args()
    rng = random.Random(args.seed)
    algorithms = [a for a in args.algorithms if a in _ALGORITHMS]

    if not algorithms:
        print("No valid algorithms specified.")
        sys.exit(1)

    state, hg = load_infrastructure()
    os.makedirs(args.output, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    print(f"\nBenchmarking {len(algorithms)} algorithms over {args.num_routes} routes...")
    print(f"Algorithms: {', '.join(algorithms)}")

    raw_results: List[Dict] = []
    for i in range(args.num_routes):
        src = rng.randint(0, hg.num_nodes - 1)
        dst = rng.randint(0, hg.num_nodes - 1)
        while dst == src:
            dst = rng.randint(0, hg.num_nodes - 1)

        if not args.quiet and (i + 1) % 10 == 0:
            print(f"  Route {i+1}/{args.num_routes} ({src} → {dst})")

        for alg in algorithms:
            r = run_one(state, alg, src, dst, args.battery_soc, args.battery_kwh)
            raw_results.append(r)

    # Aggregate
    agg_results = [aggregate(raw_results, alg) for alg in algorithms]
    print_table(agg_results)

    # Save CSV
    if not args.no_csv and raw_results:
        csv_path = os.path.join(args.output, f"benchmark_{timestamp}.csv")
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(raw_results[0].keys()))
            writer.writeheader()
            writer.writerows(raw_results)
        print(f"\n✓ Raw results saved: {csv_path}")

        agg_csv_path = os.path.join(args.output, f"benchmark_agg_{timestamp}.csv")
        with open(agg_csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(agg_results[0].keys()))
            writer.writeheader()
            writer.writerows(agg_results)
        print(f"✓ Aggregate results saved: {agg_csv_path}")

    # Save JSON
    json_path = os.path.join(args.output, f"benchmark_{timestamp}.json")
    with open(json_path, "w") as f:
        json.dump({
            "metadata": {
                "timestamp": timestamp,
                "num_routes": args.num_routes,
                "algorithms": algorithms,
                "seed": args.seed,
                "battery_soc": args.battery_soc,
                "battery_kwh": args.battery_kwh,
            },
            "aggregate": agg_results,
        }, f, indent=2)
    print(f"✓ JSON report saved: {json_path}")


if __name__ == "__main__":
    main()
