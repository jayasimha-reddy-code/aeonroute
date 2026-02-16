"""
Root conftest.py - Windows asyncio event loop fix.

On Windows, the default ProactorEventLoop causes fatal crashes with pytest-asyncio.
This module sets WindowsSelectorEventLoopPolicy at import time (before test collection)
and provides a session-scoped autouse fixture as belt-and-suspenders.
"""

import sys
import asyncio

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
