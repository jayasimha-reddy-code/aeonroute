"""
Backend Module Tests - Route Generator
=======================================
Unit tests for route_generator.py module.
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.route_generator import RouteGenerator
from src.road_graph import create_grid_network
import networkx as nx


@pytest.fixture
def graph_5x5():
    """Create a 5x5 graph for routing tests."""
    return create_grid_network(grid_size=5, num_charging_stations=2)


@pytest.fixture
def route_gen(graph_5x5):
    """Create a RouteGenerator instance."""
    return RouteGenerator(graph_5x5)


class TestRouteGeneration:
    """Test route generation functionality."""
    
    def test_generate_route_returns_routes_list(self, route_gen):
        """generate_routes should return a list of Route objects."""
        routes = route_gen.generate_routes(source=0, destination=24, num_candidates=3)
        assert isinstance(routes, list)
    
    def test_route_contains_valid_path(self, route_gen, graph_5x5):
        """Route path should only contain nodes that exist in the graph."""
        routes = route_gen.generate_routes(source=0, destination=24, num_candidates=1)
        if len(routes) > 0:
            path = routes[0]['path']
            graph_nodes = set(graph_5x5.nodes())
            assert all(node in graph_nodes for node in path)
    
    def test_route_energy_consumption_non_negative(self, route_gen):
        """Route energy consumption should be non-negative."""
        routes = route_gen.generate_routes(source=0, destination=20, num_candidates=1)
        if len(routes) > 0:
            assert routes[0]['energy_kwh'] >= 0
    
    def test_route_distance_positive_for_non_trivial_paths(self, route_gen):
        """Route distance should be positive for paths with distance."""
        routes = route_gen.generate_routes(source=0, destination=24, num_candidates=1)
        if len(routes) > 0:
            assert routes[0]['distance_km'] > 0
    
    def test_same_source_destination_returns_empty_or_trivial(self, route_gen):
        """Source == destination should return empty or trivial route."""
        routes = route_gen.generate_routes(source=10, destination=10, num_candidates=1)
        # Either empty or a single-node path
        assert len(routes) == 0 or (len(routes) > 0 and len(routes[0]['path']) <= 1)
    
    def test_k_shortest_returns_up_to_k_routes(self, route_gen):
        """k-shortest should return at most k routes."""
        k = 5
        routes = route_gen.generate_routes(source=0, destination=24, num_candidates=k)
        assert len(routes) <= k
