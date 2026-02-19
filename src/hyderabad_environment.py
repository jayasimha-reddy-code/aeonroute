"""Hyderabad RL environment for Q-Learning over real OSMnx road graph.

States = graph node indices (0-based). Actions = neighbor edge indices.
Reward includes distance penalty, battery management, charging, and progress.
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Optional, Tuple, Dict, Any, List
import logging
import math

logger = logging.getLogger("ev_routing")


class HyderabadRoutingEnvironment(gym.Env):
    """Gymnasium-compatible RL environment over the real Hyderabad road graph."""

    metadata = {"render_modes": ["ansi"]}

    def __init__(
        self,
        graph=None,
        max_steps: int = 300,
        battery_capacity_kwh: float = 60.0,
        energy_rate_kwh_per_km: float = 0.18,
    ):
        super().__init__()

        # Load graph lazily if not provided
        if graph is None:
            from backend.app.services.graph_service import get_hyderabad_graph
            graph = get_hyderabad_graph()
        self.hgraph = graph
        self.num_nodes = graph.num_nodes

        self.max_steps = max_steps
        self.battery_capacity_kwh = battery_capacity_kwh
        self.energy_rate = energy_rate_kwh_per_km

        # Compute max degree for action space
        self._max_degree = 1
        for idx in range(self.num_nodes):
            deg = len(graph.get_neighbors(idx))
            if deg > self._max_degree:
                self._max_degree = deg

        self.action_space = spaces.Discrete(self._max_degree)
        # Observation: [node_idx_normalized, battery_soc, dist_to_dest, progress]
        self.observation_space = spaces.Box(
            low=np.array([0, 0, 0, 0], dtype=np.float32),
            high=np.array([1, 1, 1, 1], dtype=np.float32),
        )

        # Episode state
        self.current_node: int = 0
        self.destination: int = self.num_nodes - 1
        self.battery_soc: float = 100.0
        self.steps: int = 0
        self.visited: set = set()
        self._initial_dist: float = 1.0

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[Dict[str, Any]] = None,
        source: Optional[int] = None,
        destination: Optional[int] = None,
    ) -> Tuple[int, Dict[str, Any]]:
        super().reset(seed=seed)

        if source is not None:
            self.current_node = source
        else:
            self.current_node = self.np_random.integers(0, self.num_nodes)

        if destination is not None:
            self.destination = destination
        else:
            self.destination = self.np_random.integers(0, self.num_nodes)
            while self.destination == self.current_node:
                self.destination = self.np_random.integers(0, self.num_nodes)

        self.battery_soc = 100.0
        self.steps = 0
        self.visited = {self.current_node}
        self._initial_dist = self._euclidean_dist(self.current_node, self.destination)
        if self._initial_dist < 1e-6:
            self._initial_dist = 1.0

        return self.current_node, {"destination": self.destination}

    def step(self, action: int) -> Tuple[int, float, bool, bool, Dict[str, Any]]:
        neighbors = self.hgraph.get_neighbors(self.current_node)
        self.steps += 1

        # Invalid action (index out of bounds for this node's neighbors)
        if action >= len(neighbors) or len(neighbors) == 0:
            reward = -1.0
            truncated = self.steps >= self.max_steps
            return self.current_node, reward, False, truncated, {"invalid_action": True}

        next_node = neighbors[action]
        edge = self.hgraph.get_edge_data(self.current_node, next_node)
        distance_km = edge.get("distance_km", 0.5)
        energy_cost = distance_km * self.energy_rate

        # Battery consumption
        energy_kwh = (self.battery_soc / 100.0) * self.battery_capacity_kwh
        energy_kwh -= energy_cost
        if energy_kwh <= 0:
            # Battery depleted
            self.battery_soc = 0
            return self.current_node, -50.0, True, False, {"battery_depleted": True}
        self.battery_soc = (energy_kwh / self.battery_capacity_kwh) * 100.0

        # Move
        prev_node = self.current_node
        self.current_node = next_node
        self.visited.add(next_node)

        # --- Reward calculation ---
        reward = 0.0

        # Distance penalty
        reward -= distance_km

        # Step penalty
        reward -= 0.1

        # Progress reward (Euclidean distance reduction)
        prev_dist = self._euclidean_dist(prev_node, self.destination)
        curr_dist = self._euclidean_dist(self.current_node, self.destination)
        progress = prev_dist - curr_dist
        reward += progress * 2.0

        # Charging station bonus (if battery low)
        if self.current_node in self.hgraph.charging_stations and self.battery_soc < 30:
            reward += 10.0
            self.battery_soc = 100.0  # Recharge

        # Destination reached
        terminated = self.current_node == self.destination
        if terminated:
            reward += 100.0

        truncated = self.steps >= self.max_steps

        info = {
            "distance_km": distance_km,
            "battery_soc": self.battery_soc,
            "steps": self.steps,
        }
        return self.current_node, reward, terminated, truncated, info

    def _euclidean_dist(self, a: int, b: int) -> float:
        pos_a = self.hgraph.get_node_pos(a)
        pos_b = self.hgraph.get_node_pos(b)
        dx = pos_a["x"] - pos_b["x"]
        dy = pos_a["y"] - pos_b["y"]
        return math.sqrt(dx * dx + dy * dy)