"""
Backend API Integration Tests
==============================
Tests FastAPI endpoints using httpx TestClient.
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from backend_api import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as c:
        yield c


class TestHealthEndpoint:
    """Health check endpoint tests."""

    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client):
        response = client.get("/health")
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        assert data["data"]["status"] == "healthy"
        assert "timestamp" in data["data"]

    def test_health_has_response_time_header(self, client):
        response = client.get("/health")
        assert "X-Response-Time" in response.headers
        assert response.headers["X-Response-Time"].endswith("ms")


class TestRoadNetworkEndpoint:
    """Road network endpoint tests."""

    def test_road_network_returns_200(self, client):
        response = client.get("/api/road-network", params={"grid_size": 5})
        assert response.status_code == 200

    def test_road_network_response_structure(self, client):
        response = client.get("/api/road-network", params={"grid_size": 5})
        data = response.json()["data"]
        assert "nodes" in data
        assert "edges" in data
        assert "charging_stations" in data
        assert "nodes_pos" in data
        assert "edges_list" in data

    def test_road_network_clamps_grid_size_min(self, client):
        """Grid size below 3 should be clamped to 3."""
        response = client.get("/api/road-network", params={"grid_size": 1})
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["nodes"] > 0

    def test_road_network_clamps_grid_size_max(self, client):
        """Grid size above 50 should be clamped to 50."""
        response = client.get("/api/road-network", params={"grid_size": 100})
        assert response.status_code == 200

    def test_road_network_caching(self, client):
        """Second request with same grid_size should use cache."""
        r1 = client.get("/api/road-network", params={"grid_size": 5})
        r2 = client.get("/api/road-network", params={"grid_size": 5})
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Both should return same data
        assert r1.json()["data"]["nodes"] == r2.json()["data"]["nodes"]


class TestSystemStatsEndpoint:
    """System stats endpoint tests."""

    def test_system_stats_returns_200(self, client):
        response = client.get("/api/system-stats")
        assert response.status_code == 200

    def test_system_stats_response_structure(self, client):
        response = client.get("/api/system-stats")
        data = response.json()["data"]
        assert "road_network" in data
        assert "models" in data
        assert "training_status" in data

    def test_system_stats_models_have_boolean_flags(self, client):
        response = client.get("/api/system-stats")
        models = response.json()["data"]["models"]
        assert isinstance(models["gan_trained"], bool)
        assert isinstance(models["agent_trained"], bool)
        assert isinstance(models["gnn_gan_trained"], bool)


class TestTrainingEndpoints:
    """Training lifecycle tests."""

    def test_training_status_returns_200(self, client):
        response = client.get("/api/training-status")
        assert response.status_code == 200

    def test_training_status_structure(self, client):
        response = client.get("/api/training-status")
        data = response.json()["data"]
        assert "is_training" in data
        assert "progress" in data
        assert "current_step" in data

    def test_stop_training_when_not_running(self, client):
        """Stopping training when not running should return 409."""
        response = client.post("/api/stop-training")
        assert response.status_code == 409


class TestErrorHandling:
    """Error handling and validation tests."""

    def test_generate_route_invalid_body(self, client):
        """Missing required fields should return 422."""
        response = client.post("/api/generate-route", json={})
        assert response.status_code == 422

    def test_generate_route_same_source_dest(self, client):
        """Source == destination should be rejected."""
        response = client.post("/api/generate-route", json={
            "source": 5,
            "destination": 5,
            "ev_state": {
                "battery_soc": 80,
                "current_node": 5,
            },
            "num_candidates": 3,
        })
        assert response.status_code == 422

    def test_404_for_unknown_route(self, client):
        """Unknown API paths should return 404."""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
