"""
Backend Module Tests - Road Graph
==================================
Unit tests for the RoadGraph class and related components.
"""

import pytest

from src.road_graph import RoadGraph, EVState, ChargingStation, RoadType


@pytest.fixture
def small_graph():
    """Create a small 5x5 graph for testing."""
    return RoadGraph(grid_size=5, seed=42)


@pytest.fixture
def default_ev():
    """Create a default EV state."""
    return EVState(battery_soc=80.0, battery_capacity_kwh=60.0, current_node=0, time_minutes=480)


class TestRoadGraphCreation:
    """Test RoadGraph initialization."""

    def test_creates_correct_number_of_nodes(self, small_graph):
        assert small_graph.num_nodes == 25

    def test_graph_is_directed(self, small_graph):
        import networkx as nx
        assert isinstance(small_graph.graph, nx.DiGraph)

    def test_nodes_have_position(self, small_graph):
        for node in small_graph.graph.nodes():
            data = small_graph.graph.nodes[node]
            assert 'x' in data
            assert 'y' in data

    def test_edges_have_distance(self, small_graph):
        for u, v in small_graph.graph.edges():
            data = small_graph.graph.edges[u, v]
            assert 'distance_km' in data
            assert data['distance_km'] > 0

    def test_edges_have_road_type(self, small_graph):
        for u, v in small_graph.graph.edges():
            data = small_graph.graph.edges[u, v]
            assert 'road_type' in data
            assert isinstance(data['road_type'], RoadType)


class TestChargingStations:
    """Test charging station placement."""

    def test_charging_stations_exist(self, small_graph):
        assert len(small_graph.charging_stations) > 0

    def test_charging_station_nodes_flagged(self, small_graph):
        for node_id in small_graph.charging_stations:
            assert small_graph.graph.nodes[node_id]['is_charging_station'] is True

    def test_charge_time_calculation(self):
        station = ChargingStation(node_id=0, charging_power_kw=50.0)
        time = station.charge_time_minutes(25.0)  # 25 kWh
        assert time == pytest.approx(30.0)  # 25/50 * 60 = 30 min


class TestEVState:
    """Test EV state properties."""

    def test_remaining_energy(self, default_ev):
        # 80% of 60 kWh = 48 kWh
        assert default_ev.remaining_energy_kwh == pytest.approx(48.0)

    def test_estimated_range(self, default_ev):
        # 48 kWh / 0.2 kWh/km = 240 km
        assert default_ev.estimated_range_km == pytest.approx(240.0)

    def test_time_hours(self, default_ev):
        # 480 min / 60 = 8.0 hours
        assert default_ev.time_hours == pytest.approx(8.0)

    def test_to_array_shape(self, default_ev):
        arr = default_ev.to_array()
        assert arr.shape == (5,)

    def test_copy_creates_independent(self, default_ev):
        copy = default_ev.copy()
        copy.battery_soc = 50.0
        assert default_ev.battery_soc == 80.0


class TestRouting:
    """Test shortest path and edge cost."""

    def test_shortest_path_exists(self, small_graph):
        path = small_graph.shortest_path(0, 24)  # Corner to corner in 5x5
        assert len(path) > 0
        assert path[0] == 0
        assert path[-1] == 24

    def test_edge_cost_returns_required_keys(self, small_graph, default_ev):
        edges = list(small_graph.graph.edges())
        cost = small_graph.calculate_edge_cost(edges[0], default_ev)
        assert 'energy_kwh' in cost
        assert 'time_minutes' in cost
        assert 'distance_km' in cost
        assert 'feasible' in cost

    def test_edge_cost_energy_positive(self, small_graph, default_ev):
        edges = list(small_graph.graph.edges())
        cost = small_graph.calculate_edge_cost(edges[0], default_ev)
        assert cost['energy_kwh'] > 0

    def test_traffic_patterns_shape(self, small_graph):
        num_edges = small_graph.graph.number_of_edges()
        assert small_graph.traffic_patterns.shape == (num_edges, 24)
