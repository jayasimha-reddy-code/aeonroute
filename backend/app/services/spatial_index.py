"""Spatial Index for charging stations — O(log n) nearest-station lookup.

Wraps scipy.spatial.KDTree to replace the O(n) linear scan in
routing_service._inject_charging_stops().

Coordinate projection:
  Lat/lon are converted to approximate metres using:
    x ≈ lon × 111_320 × cos(lat)
    y ≈ lat × 110_574
  This gives ~1% accuracy over small areas (< 100 km) which is
  sufficient for nearest-station queries in Hyderabad.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("ev_routing")

try:
    from scipy.spatial import KDTree
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    logger.warning("scipy not available — StationSpatialIndex will use linear fallback")


def _latlon_to_metres(lat: float, lon: float) -> Tuple[float, float]:
    """Approximate lat/lon → metres (Cartesian)."""
    x = lon * 111_320.0 * math.cos(math.radians(lat))
    y = lat * 110_574.0
    return x, y


class StationSpatialIndex:
    """KDTree-based spatial index for EV charging stations.

    Usage:
        idx = StationSpatialIndex(stations)
        nearest = idx.nearest(lat=17.36, lon=78.47, k=3)
    """

    def __init__(self, stations: List[Dict[str, Any]]) -> None:
        self._stations = stations
        self._coords_m: List[Tuple[float, float]] = []
        self._tree: Optional[Any] = None

        if not stations:
            return

        coords = []
        for s in stations:
            lat = s.get("lat")
            lon = s.get("lon")
            if lat is not None and lon is not None:
                coords.append(_latlon_to_metres(float(lat), float(lon)))
            else:
                coords.append((0.0, 0.0))  # fallback

        self._coords_m = coords

        if HAS_SCIPY and coords:
            arr = np.array(coords, dtype=np.float64)
            self._tree = KDTree(arr)
            logger.debug("[SpatialIndex] Built KDTree with %d stations", len(coords))

    # ─────────────────────────────────────────────── public API ──────────────

    def nearest(
        self,
        lat: float,
        lon: float,
        k: int = 1,
    ) -> List[Dict[str, Any]]:
        """Return up to k nearest stations sorted by distance (closest first).

        Returns list of station dicts with added 'distance_m' key.
        """
        if not self._stations:
            return []

        qx, qy = _latlon_to_metres(lat, lon)

        if self._tree is not None:
            k_actual = min(k, len(self._stations))
            dists, idxs = self._tree.query([qx, qy], k=k_actual)
            if k_actual == 1:
                dists = [dists]
                idxs = [idxs]
            results = []
            for dist, i in zip(dists, idxs):
                s = dict(self._stations[i])
                s["distance_m"] = float(dist)
                results.append(s)
            return results

        # Linear fallback
        scored = []
        for s in self._stations:
            sx, sy = _latlon_to_metres(float(s.get("lat", 0)), float(s.get("lon", 0)))
            dist = math.sqrt((qx - sx) ** 2 + (qy - sy) ** 2)
            s2 = dict(s)
            s2["distance_m"] = dist
            scored.append(s2)
        scored.sort(key=lambda x: x["distance_m"])
        return scored[:k]

    def within_radius(
        self,
        lat: float,
        lon: float,
        radius_km: float,
    ) -> List[Dict[str, Any]]:
        """Return all stations within radius_km of (lat, lon)."""
        if not self._stations:
            return []

        radius_m = radius_km * 1000.0
        qx, qy = _latlon_to_metres(lat, lon)

        if self._tree is not None:
            idxs = self._tree.query_ball_point([qx, qy], r=radius_m)
            results = []
            for i in idxs:
                sx, sy = self._coords_m[i]
                dist = math.sqrt((qx - sx) ** 2 + (qy - sy) ** 2)
                s = dict(self._stations[i])
                s["distance_m"] = dist
                results.append(s)
            results.sort(key=lambda x: x["distance_m"])
            return results

        # Linear fallback
        return [
            s for s in self.nearest(lat, lon, k=len(self._stations))
            if s["distance_m"] <= radius_m
        ]
