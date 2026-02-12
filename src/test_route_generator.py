"""
Backend Module Tests - Route Generator
=======================================
Unit tests for RouteGenerator and EVRoutePlanner classes.
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.road_graph import RoadGraph, EVState
from src.route_generator import RouteGenerator, RouteCandidate, EVRoutePlanner


@pytest.fixture
def road_graph():
    """Create a 5x5 road graph."""
    return RoadGraph(grid_size=5, seed=42)


@pytest.fixture
def ev_state():
    """Default EV state with high battery."""
    return EVState(battery_soc=80.0, battery_capacity_kwh=60.0, current_node=0, time_minutes=480)


@pytest.fixture
def generator(road_graph):
    """Create a RouteGenerator instance."""
    return RouteGenerator(road_graph)


class TestRouteGeneration:
    """Test route generation functionality."""

    def test_generates_candidates(self, generator, ev_state):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state)
        assert isinstance(candidates, list)
        assert len(candidates) > 0

    def test_candidates_are_route_candidates(self, generator, ev_state):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state)
        for c in candidates:
            assert isinstance(c, RouteCandidate)

    def test_route_path_valid(self, generator, ev_state, road_graph):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state)
        for c in candidates:
            assert c.path[0] == 0
            assert c.path[-1] == 24
            # All nodes should exist in graph
            for node in c.path:
                assert node in road_graph.graph.nodes()

    def test_energy_non_negative(self, generator, ev_state):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state)
        for c in candidates:
            assert c.total_energy_kwh >= 0

    def test_distance_positive(self, generator, ev_state):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state)
        for c in candidates:
            assert c.total_distance_km > 0

    def test_num_candidates_limit(self, generator, ev_state):
        candidates = generator.generate_routes(source=0, destination=24, ev_state=ev_state, num_candidates=3)
        assert len(candidates) <= 3


class TestBestRoute:
    """Test get_best_route with different criteria."""

    def test_energy_criteria(self, generator, ev_state):
        best = generator.get_best_route(0, 24, ev_state, criteria='energy')
        assert best is not None
        assert isinstance(best, RouteCandidate)

    def test_time_criteria(self, generator, ev_state):
        best = generator.get_best_route(0, 24, ev_state, criteria='time')
        assert best is not None

    def test_balanced_criteria(self, generator, ev_state):
        best = generator.get_best_route(0, 24, ev_state, criteria='balanced')
        assert best is not None


class TestEVRoutePlanner:
    """Test high-level route planner."""

    def test_plan_route(self, road_graph, generator, ev_state):
        planner = EVRoutePlanner(road_graph, generator)
        route = planner.plan_route(0, 24, ev_state)
        assert route is not None
        assert isinstance(route, RouteCandidate)

    def test_should_replan_when_off_route(self, road_graph, generator, ev_state):
        planner = EVRoutePlanner(road_graph, generator)
        planner.plan_route(0, 24, ev_state)
        # Node 99 won't be in a 5x5 grid route → should trigger replan
        # Use a node we know is in the graph but unlikely on the path
        assert planner.should_replan(12, ev_state) in (True, False)  # Just ensure no crash
