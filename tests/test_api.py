"""
Backend API Integration Tests
==============================
Tests FastAPI endpoints using httpx TestClient.
Includes regression tests for the Phase 02 backend restructure.
"""

import pathlib
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


# ==================== Original Tests (14) ====================


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


# ==================== New: Security Header Tests (BACK-08) ====================


class TestSecurityHeaders:
    """Verify security headers are present on all responses."""

    def test_security_headers_present(self, client):
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"

    def test_response_time_header(self, client):
        response = client.get("/health")
        assert "X-Response-Time" in response.headers

    def test_request_id_header(self, client):
        response = client.get("/health")
        assert "X-Request-ID" in response.headers


# ==================== New: Architecture Tests (BACK-01, BACK-02) ====================


class TestArchitecture:
    """Verify backend architecture constraints."""

    def test_no_globals_in_backend_app(self):
        """BACK-02: Zero global keywords in backend/app/ code."""
        backend_dir = pathlib.Path("backend/app")
        for py_file in backend_dir.rglob("*.py"):
            content = py_file.read_text(encoding="utf-8")
            lines = content.split("\n")
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                # Allow 'global _state' in state.py reset_state()
                if py_file.name == "state.py" and "_state" in stripped:
                    continue
                assert not stripped.startswith("global "), \
                    f"Found 'global' in {py_file}:{i}: {stripped}"

    def test_no_route_definitions_in_main(self):
        """BACK-01: No @app.get or @app.post in main.py."""
        main_py = pathlib.Path("backend/app/main.py").read_text(encoding="utf-8")
        assert "@app.get" not in main_py, "Route definition found in main.py"
        assert "@app.post" not in main_py, "Route definition found in main.py"

    def test_backend_api_is_thin_proxy(self):
        """backend_api.py should be a thin proxy (< 15 lines of code)."""
        content = pathlib.Path("backend_api.py").read_text(encoding="utf-8")
        code_lines = [l for l in content.strip().split("\n")
                      if l.strip() and not l.strip().startswith("#")
                      and not l.strip().startswith('\"\"\"')
                      and not l.strip().startswith("'")]
        assert len(code_lines) <= 15, f"backend_api.py has {len(code_lines)} code lines, expected <= 15"

    def test_routers_exist(self):
        """BACK-01: All 4 router files exist."""
        for name in ["health", "routing", "training", "analytics"]:
            assert pathlib.Path(f"backend/app/routers/{name}.py").exists(), \
                f"Router {name}.py missing"


# ==================== New: Regression Tests ====================


class TestRegressionResponseShapes:
    """Ensure refactored endpoints return identical response shapes."""

    @pytest.mark.parametrize("url", [
        "/health",
        "/api/training-status",
        "/api/system-stats",
    ])
    def test_get_endpoints_return_ok_envelope(self, client, url):
        r = client.get(url)
        assert r.status_code == 200
        data = r.json()
        assert "ok" in data
        assert "message" in data
        assert "data" in data

    def test_road_network_shape(self, client):
        r = client.get("/api/road-network", params={"grid_size": 5})
        assert r.status_code == 200
        d = r.json()["data"]
        assert all(k in d for k in [
            "nodes", "edges", "charging_stations", "nodes_pos", "edges_list"
        ])

    def test_training_status_shape(self, client):
        r = client.get("/api/training-status")
        d = r.json()["data"]
        assert all(k in d for k in [
            "is_training", "progress", "current_step", "metrics"
        ])

    def test_stop_training_not_running_409(self, client):
        r = client.post("/api/stop-training")
        assert r.status_code == 409


# ==================== New: SSE Endpoint Test (BACK-04) ====================


class TestSSEEndpoint:
    """Verify SSE training stream endpoint."""

    def test_training_stream_returns_event_stream(self, client):
        """SSE endpoint exists and returns correct content type."""
        response = client.get("/api/training/stream")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "text/event-stream" in content_type
