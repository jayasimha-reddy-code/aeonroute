"""
Backend Module Tests - Road Graph
==================================
Unit tests for road_graph.py module.
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.road_graph import RoadGraphManager, create_grid_network
import networkx as nx


@pytest.fixture
def small_graph():
    """Create a small 3x3 graph for testing."""
    return create_grid_network(grid_size=3, num_charging_stations=1)


@pytest.fixture
def medium_graph():
    """Create a 5x5 graph for testing."""
    return create_grid_network(grid_size=5, num_charging_stations=2)


class TestGridNetworkCreation:
    """Test grid network creation."""
    
    def test_create_grid_network_returns_valid_networkx_graph(self):
        G = create_grid_network(grid_size=5, num_charging_stations=1)
        assert isinstance(G, nx.Graph)
    
    def test_grid_size_creates_correct_number_of_nodes(self):
        """Grid of size 5 should have 25 nodes."""
        G = create_grid_network(grid_size=5, num_charging_stations=1)
        assert G.number_of_nodes() == 25
    
    def test_nodes_have_required_attributes(self, small_graph):
        """All nodes should have pos, is_charging, road_type attributes."""
        G = small_graph
        for node in G.nodes():
            node_data = G.nodes[node]
            assert 'pos' in node_data
            assert 'is_charging' in node_data
            assert isinstance(node_data['is_charging'], bool)
    
    def test_edges_have_required_attributes(self, small_graph):
        """All edges should have weight, distance, road_type attributes."""
        G = small_graph
        for u, v in G.edges():
            edge_data = G[u][v]
            assert 'weight' in edge_data
            assert 'distance' in edge_data
            assert 'road_type' in edge_data
    
    def test_charging_stations_are_placed(self, medium_graph):
        """At least one node should be a charging station."""
        G = medium_graph
        charging_nodes = [n for n in G.nodes() if G.nodes[n]['is_charging']]
        assert len(charging_nodes) > 0
    
    def test_small_grid_boundary_works(self):
        """3x3 grid (minimum) should work without error."""
        G = create_grid_network(grid_size=3, num_charging_stations=1)
        assert G.number_of_nodes() == 9
    
    @pytest.mark.slow
    def test_large_grid_boundary_works(self):
        """50x50 grid (maximum) should work without error."""
        G = create_grid_network(grid_size=50, num_charging_stations=10)
        assert G.number_of_nodes() == 2500
