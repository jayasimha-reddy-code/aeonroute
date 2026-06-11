"""Graph service - loads real Hyderabad road network from OpenStreetMap via OSMnx.

Uses the free Overpass API (no API key needed). Caches the downloaded graph
to data/hyderabad/hyderabad_drive.graphml so subsequent boots load from disk.
"""

import os
import logging
import networkx as nx
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger("ev_routing")

# Cache directory
_CACHE_DIR = Path("data/hyderabad")
_CACHE_FILE = _CACHE_DIR / "hyderabad_drive.graphml"


class HyderabadGraph:
    """Wrapper around an OSMnx-downloaded Hyderabad road network."""

    def __init__(self, graph: nx.DiGraph, charging_station_nodes: Optional[List[int]] = None):
        self.graph = graph
        self.num_nodes = graph.number_of_nodes()
        self.num_edges = graph.number_of_edges()
        self.charging_stations: List[int] = charging_station_nodes or []

        # Node ID mapping: OSMnx uses large OSM node IDs; we map to 0..N-1
        self._osm_to_idx: Dict[int, int] = {}
        self._idx_to_osm: Dict[int, int] = {}
        for idx, osm_id in enumerate(sorted(graph.nodes())):
            self._osm_to_idx[osm_id] = idx
            self._idx_to_osm[idx] = osm_id

        # Compute bounds
        lats = [graph.nodes[n].get("y", 0) for n in graph.nodes()]
        lons = [graph.nodes[n].get("x", 0) for n in graph.nodes()]
        self.bounds = {
            "north": max(lats) if lats else 0,
            "south": min(lats) if lats else 0,
            "east": max(lons) if lons else 0,
            "west": min(lons) if lons else 0,
        }

        # Feature dimensions for RL compatibility
        self.node_feature_dim = 6
        self.edge_feature_dim = 8

    def osm_to_idx(self, osm_id: int) -> int:
        return self._osm_to_idx.get(osm_id, -1)

    def idx_to_osm(self, idx: int) -> int:
        return self._idx_to_osm.get(idx, -1)

    def get_neighbors(self, idx: int) -> List[int]:
        """Get neighbor indices (0-based) for a given node index."""
        osm_id = self.idx_to_osm(idx)
        if osm_id == -1:
            return []
        osm_neighbors = list(self.graph.successors(osm_id))
        return [self._osm_to_idx[n] for n in osm_neighbors if n in self._osm_to_idx]

    def get_node_pos(self, idx: int) -> Dict[str, float]:
        """Get lat/lon for a 0-based node index."""
        osm_id = self.idx_to_osm(idx)
        if osm_id == -1:
            return {"x": 0.0, "y": 0.0}
        data = self.graph.nodes[osm_id]
        return {"x": float(data.get("x", 0)), "y": float(data.get("y", 0))}

    def get_edge_data(self, from_idx: int, to_idx: int) -> Dict[str, Any]:
        """Get edge attributes between two 0-based indices."""
        from_osm = self.idx_to_osm(from_idx)
        to_osm = self.idx_to_osm(to_idx)
        if from_osm == -1 or to_osm == -1:
            return {}
        if self.graph.has_edge(from_osm, to_osm):
            data = self.graph.edges[from_osm, to_osm]
            length_m = float(data.get("length", 100))
            return {
                "distance_km": length_m / 1000.0,
                "base_time_minutes": (length_m / 1000.0) / 40.0 * 60.0,  # ~40 km/h avg
                "road_type": str(data.get("highway", "residential")),
                "base_energy_kwh_per_km": 0.18,  # avg EV consumption
            }
        return {}

    def nearest_node(self, lat: float, lon: float) -> int:
        """Find nearest graph node to given lat/lon. Returns 0-based index."""
        try:
            import osmnx as ox
            osm_id = ox.nearest_nodes(self.graph, X=lon, Y=lat)
            return self._osm_to_idx.get(osm_id, 0)
        except Exception:
            # Brute-force fallback
            best_idx = 0
            best_dist = float("inf")
            for idx in range(self.num_nodes):
                pos = self.get_node_pos(idx)
                d = (pos["y"] - lat) ** 2 + (pos["x"] - lon) ** 2
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            return best_idx


def _download_graph(center_lat: float, center_lon: float, radius_m: int) -> nx.DiGraph:
    """Download Hyderabad road network from Overpass API via OSMnx."""
    import osmnx as ox

    logger.info("Downloading Hyderabad road network (radius=%dm)...", radius_m)
    G = ox.graph_from_point(
        (center_lat, center_lon),
        dist=radius_m,
        network_type="drive",
        simplify=True,
    )
    # Convert MultiDiGraph -> DiGraph (collapse parallel edges, keep shortest)
    if isinstance(G, nx.MultiDiGraph):
        DG = nx.DiGraph()
        for n, data in G.nodes(data=True):
            DG.add_node(n, **data)
        for u, v, key, data in G.edges(keys=True, data=True):
            if not DG.has_edge(u, v):
                DG.add_edge(u, v, **data)
            else:
                # keep shortest edge
                if data.get("length", float("inf")) < DG.edges[u, v].get("length", float("inf")):
                    DG.edges[u, v].update(data)
        G = DG

    logger.info("Downloaded graph: %d nodes, %d edges", G.number_of_nodes(), G.number_of_edges())
    return G


def _save_graph(G: nx.DiGraph, path: Path):
    """Save graph to GraphML cache."""
    import osmnx as ox
    path.parent.mkdir(parents=True, exist_ok=True)
    # Save as GraphML via osmnx (handles attribute types)
    mg = nx.MultiDiGraph(G)
    ox.save_graphml(mg, filepath=str(path))
    logger.info("Graph cached to %s", path)


def _load_graph(path: Path) -> nx.DiGraph:
    """Load cached graph from GraphML."""
    import osmnx as ox
    mg = ox.load_graphml(filepath=str(path))
    # Convert back to DiGraph
    DG = nx.DiGraph()
    for n, data in mg.nodes(data=True):
        DG.add_node(n, **data)
    for u, v, key, data in mg.edges(keys=True, data=True):
        if not DG.has_edge(u, v):
            DG.add_edge(u, v, **data)
    return DG


def _largest_scc(G: nx.DiGraph) -> nx.DiGraph:
    """Extract the largest strongly-connected component so routing never fails."""
    comps = list(nx.strongly_connected_components(G))
    if len(comps) <= 1:
        return G
    largest = max(comps, key=len)
    logger.info("Keeping largest SCC: %d / %d nodes (%d components dropped)",
                len(largest), G.number_of_nodes(), len(comps) - 1)
    return G.subgraph(largest).copy()


def get_hyderabad_graph(force_download: bool = False) -> HyderabadGraph:
    """Get (and cache) the Hyderabad road graph. Thread-safe singleton.

    First call downloads from Overpass API; subsequent calls use disk cache.
    """
    if hasattr(HyderabadGraph, "_instance") and HyderabadGraph._instance is not None and not force_download:
        return HyderabadGraph._instance

    from backend.app.config import settings

    if _CACHE_FILE.exists() and not force_download:
        logger.info("Loading cached Hyderabad graph from %s", _CACHE_FILE)
        G = _load_graph(_CACHE_FILE)
    else:
        G = _download_graph(
            settings.OSMNX_CENTER_LAT,
            settings.OSMNX_CENTER_LON,
            settings.OSMNX_RADIUS_METERS,
        )
        _save_graph(G, _CACHE_FILE)

    G = _largest_scc(G)
    instance = HyderabadGraph(G)
    logger.info(
        "Hyderabad graph ready: %d nodes, %d edges, bounds=%s",
        instance.num_nodes,
        instance.num_edges,
        instance.bounds,
    )
    HyderabadGraph._instance = instance
    return instance