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
