"""
Root conftest.py - Windows asyncio event loop fix.

On Windows, the default ProactorEventLoop causes fatal crashes with pytest-asyncio.
This module sets WindowsSelectorEventLoopPolicy at import time (before test collection)
and provides a session-scoped autouse fixture as belt-and-suspenders.

Additionally disables faulthandler to suppress cosmetic TensorFlow STATUS_BREAKPOINT
crashes on Windows that do not affect test results.
"""

import sys
import os
import asyncio

# Suppress TensorFlow C++ noise and GPU probing that triggers Windows SEH exceptions
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

# Force matplotlib to use non-interactive Agg backend BEFORE it gets imported.
# Without this, matplotlib initializes the Tk backend, and when TestClient runs
# tests in a background anyio thread, tkinter objects get garbage-collected in the
# wrong thread causing "Tcl_AsyncDelete: async handler deleted by the wrong thread"
# which is a FATAL Tcl error that kills the process.
os.environ.setdefault("MPLBACKEND", "Agg")

# Disable faulthandler early — TF's C++ runtime triggers STATUS_BREAKPOINT (0x80000003)
# on Windows which faulthandler reports as a fatal exception even though the process survives
import faulthandler
faulthandler.disable()

# Module-level fix: runs at import time, before test collection
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import pytest


@pytest.fixture(scope="session", autouse=True)
def _windows_event_loop_policy():
    """Belt-and-suspenders: ensure WindowsSelectorEventLoopPolicy on Windows."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield
    # Restore default policy on teardown
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(None)


# ---------------------------------------------------------------------------
# Backend DI mock fixtures — isolate API tests from TensorFlow / real models
# ---------------------------------------------------------------------------

from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from backend.app.state import AppState, get_state
from backend_api import app


@pytest.fixture
def mock_app_state() -> AppState:
    """Lightweight AppState with mocked system — no TF or real models needed."""
    state = AppState()

    mock_system = MagicMock()

    # Road-graph mock — returns realistic structures so fetch_road_network() works
    mock_graph = MagicMock()
    mock_graph.nodes.return_value = [
        (i, {"x": float(i % 5), "y": float(i // 5)}) for i in range(25)
    ]
    mock_graph.number_of_nodes.return_value = 25
    mock_graph.number_of_edges.return_value = 40
    mock_graph.edges.return_value = [
        (i, i + 1, {
            "distance_km": 1.0,
            "base_energy_kwh_per_km": 0.15,
            "base_time_minutes": 2.0,
            "road_type": "local",
        })
        for i in range(0, 40)
    ]

    mock_road_graph = MagicMock()
    mock_road_graph.graph = mock_graph
    mock_road_graph.num_nodes = 25
    mock_road_graph.charging_stations = [3, 7, 12]

    mock_system.road_graph = mock_road_graph
    # Models not trained
    mock_system.gan = None
    mock_system.agent = None
    mock_system.gnn_gan = None
    mock_system.route_generator = None

    state.system = mock_system
    return state


@pytest.fixture
def client(mock_app_state: AppState):
    """Test client with DI-overridden mock state (no real TF models)."""
    app.dependency_overrides[get_state] = lambda: mock_app_state
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def real_client():
    """Test client using the real AppState (lifespan-initialised system)."""
    with TestClient(app) as c:
        yield c
