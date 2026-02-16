# environment.py
"""
EV Routing Environment Module
==============================
A graph-based reinforcement learning environment for Electric Vehicle routing.

This environment simulates:
- EV navigation on a road network graph
- Battery consumption and management
- Traffic conditions (from SG-GAN)
- Charging station visits
- Time-varying conditions

Compatible with OpenAI Gymnasium interface.
"""

import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import warnings

from src.road_graph import RoadGraph, EVState, ChargingStation


@dataclass
class EnvironmentConfig:
    """Configuration for the EV Routing Environment."""
    grid_size: int = 10              # Size of the road grid
    max_battery: float = 100.0       # Maximum battery percentage
    battery_capacity_kwh: float = 60.0  # Battery capacity in kWh
    energy_cost_base: float = 0.2    # Base energy cost kWh/km
    max_steps: int = 200             # Maximum steps per episode
    charging_time_penalty: float = -5.0  # Penalty for charging (time cost)
    destination_reward: float = 100.0    # Reward for reaching destination
    battery_empty_penalty: float = -100.0  # Penalty for running out of battery
    step_penalty: float = -0.1       # Small penalty per step to encourage efficiency
    progress_reward_scale: float = 5.0  # Reward scale for moving toward destination
    seed: int = 42                   # Random seed


class EVRoutingEnvironment(gym.Env):
    """
    Graph-based EV Routing Environment.
    
    The agent (EV) navigates from a source node to a destination node
    on a road network graph while managing battery and considering traffic.
    
    State Space:
    - Current node position (one-hot or index)
    - Battery state of charge (%)
    - Distance to destination (normalized)
    - Time of day (normalized)
    - Traffic level at current location
    - Is at charging station (binary)
    
    Action Space:
    - Move to neighbor node i (discrete: 0 to max_neighbors-1)
    - Charge at current station (last action)
    
    Rewards:
    - Negative energy consumption (to minimize energy)
    - Bonus for moving closer to destination
    - Large bonus for reaching destination
    - Penalty for running out of battery
    - Small penalty for each step (time cost)
    """
    
    metadata = {'render_modes': ['human', 'ansi'], 'render_fps': 4}
    
    def __init__(self, 
                 config: Optional[EnvironmentConfig] = None,
                 grid_size: int = 10,
                 max_battery: float = 100.0,
                 traffic_data: Optional[np.ndarray] = None,
                 energy_cost_base: float = 0.2,
                 render_mode: Optional[str] = None):
        """
        Initialize the EV Routing Environment.
        
        Args:
            config: Environment configuration object
            grid_size: Size of the road grid (if config not provided)
            max_battery: Maximum battery percentage (if config not provided)
            traffic_data: Pre-generated traffic scenarios from SG-GAN
            energy_cost_base: Base energy cost per km (if config not provided)
            render_mode: Rendering mode ('human' or 'ansi')
        """
        super(EVRoutingEnvironment, self).__init__()
        
        # Use config if provided, otherwise use individual parameters
        if config is not None:
            self.config = config
        else:
            self.config = EnvironmentConfig(
                grid_size=grid_size,
                max_battery=max_battery,
                energy_cost_base=energy_cost_base
            )
        
        self.render_mode = render_mode
        
        # Create road graph
        self.road_graph = RoadGraph(
            grid_size=self.config.grid_size,
            seed=self.config.seed
        )
        
        # Update traffic if provided
        if traffic_data is not None:
            self.update_traffic(traffic_data)
        
        # Environment state
        self.ev_state: Optional[EVState] = None
        self.source_node: int = 0
        self.destination_node: int = self.road_graph.num_nodes - 1
        
        # Episode tracking
        self.current_step: int = 0
        self.episode_energy_used: float = 0.0
        self.episode_distance: float = 0.0
        self.visited_nodes: List[int] = []
        self.route_history: List[int] = []
        
        # Calculate maximum number of actions (max neighbors + 1 for charging)
        max_neighbors = max(self.road_graph.graph.out_degree(n) 
                          for n in self.road_graph.graph.nodes())
        self.max_actions = max_neighbors + 1  # +1 for charging action
        
        # Define action space
        # Actions 0 to max_actions-2: Move to neighbor i
        # Action max_actions-1: Charge at current station
        self.action_space = spaces.Discrete(self.max_actions)
        
        # Define observation space
        # [node_x, node_y, battery_soc, dist_to_dest, time_of_day, 
        #  traffic_level, is_at_charging_station, can_reach_destination]
        self.observation_space = spaces.Box(
            low=np.array([0, 0, 0, 0, 0, 0, 0, 0], dtype=np.float32),
            high=np.array([1, 1, 1, 1, 1, 1, 1, 1], dtype=np.float32),
            dtype=np.float32
        )
        
        # For compatibility with old interface
        self.grid_size = self.config.grid_size
        self.max_battery = self.config.max_battery
        self.energy_cost_base = self.config.energy_cost_base
        self.max_steps = self.config.max_steps
        
    def update_traffic(self, traffic_data: np.ndarray):
        """
        Update traffic patterns with new data (e.g., from SG-GAN).
        
        Args:
            traffic_data: Traffic data of shape (num_roads, time_steps)
        """
        self.road_graph.update_traffic_from_gan(traffic_data)
    
    def _get_observation(self) -> np.ndarray:
        """
        Get current observation vector.
        
        Returns:
            Observation array of shape (8,)
        """
        if self.ev_state is None:
            return np.zeros(8, dtype=np.float32)
        
        # Get node positions
        node_data = self.road_graph.graph.nodes[self.ev_state.current_node]
        dest_data = self.road_graph.graph.nodes[self.destination_node]
        
        # Normalize position
        node_x = node_data['x'] / self.road_graph.grid_size
        node_y = node_data['y'] / self.road_graph.grid_size
        
        # Battery state of charge
        battery_soc = self.ev_state.battery_soc / 100.0
        
        # Distance to destination (normalized)
        dx = dest_data['x'] - node_data['x']
        dy = dest_data['y'] - node_data['y']
        dist_to_dest = np.sqrt(dx**2 + dy**2) / (self.road_graph.grid_size * np.sqrt(2))
        
        # Time of day
        time_of_day = self.ev_state.time_hours / 24.0
        
        # Traffic level at current location
        neighbors = self.road_graph.get_neighbors(self.ev_state.current_node)
        if neighbors:
            edge = (self.ev_state.current_node, neighbors[0])
            traffic = self.road_graph.get_traffic_multiplier(edge, self.ev_state.time_minutes)
            traffic_level = min(traffic / 2.0, 1.0)  # Normalize
        else:
            traffic_level = 0.5
        
        # Is at charging station
        is_at_charging = 1.0 if self.ev_state.current_node in self.road_graph.charging_stations else 0.0
        
        # Can reach destination (rough estimate)
        path = self.road_graph.shortest_path(self.ev_state.current_node, self.destination_node)
        if path:
            # Estimate energy needed
            energy_needed = len(path) * self.config.energy_cost_base
            can_reach = 1.0 if self.ev_state.remaining_energy_kwh >= energy_needed else 0.0
        else:
            can_reach = 0.0
        
        return np.array([
            node_x, node_y, battery_soc, dist_to_dest,
            time_of_day, traffic_level, is_at_charging, can_reach
        ], dtype=np.float32)
    
    def get_state(self) -> Tuple:
        """
        Get current state as tuple (for Q-learning compatibility).
        
        Returns:
            State tuple: (node, battery_level, hour, traffic_level)
        """
        if self.ev_state is None:
            return (0, 100, 0, 0.5)
        
        # Discretize battery into levels
        battery_level = int(self.ev_state.battery_soc // 10)  # 0-10
        
        # Get hour
        hour = int(self.ev_state.time_hours)
        
        # Get average traffic
        neighbors = self.road_graph.get_neighbors(self.ev_state.current_node)
        if neighbors:
            edge = (self.ev_state.current_node, neighbors[0])
            traffic = self.road_graph.get_traffic_multiplier(edge, self.ev_state.time_minutes)
            traffic_level = int(traffic * 10) / 10  # Discretize
        else:
            traffic_level = 0.5
        
        return (self.ev_state.current_node, battery_level, hour, traffic_level)
    
    def _get_valid_actions(self) -> List[int]:
        """
        Get list of valid actions from current state.
        
        Returns:
            List of valid action indices
        """
        valid_actions = []
        
        if self.ev_state is None:
            return [self.max_actions - 1]  # Only charging (which will fail)
        
        neighbors = self.road_graph.get_neighbors(self.ev_state.current_node)
        
        # Check each neighbor
        for i, neighbor in enumerate(neighbors):
            if i >= self.max_actions - 1:
                break  # Don't exceed action space
            
            edge = (self.ev_state.current_node, neighbor)
            cost = self.road_graph.calculate_edge_cost(edge, self.ev_state)
            
            if cost['feasible']:
                valid_actions.append(i)
        
        # Charging action is always "valid" (but may have no effect)
        if self.ev_state.current_node in self.road_graph.charging_stations:
            if self.ev_state.battery_soc < 100:
                valid_actions.append(self.max_actions - 1)
        
        return valid_actions if valid_actions else [0]  # Return at least one action
    
    def _step_execute(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """
        Core step executor which implements the new-style Gymnasium API and
        returns (observation, reward, terminated, truncated, info).
        """
        assert self.ev_state is not None, "Call reset() before step()"

        self.current_step += 1
        reward = self.config.step_penalty  # Base step penalty
        terminated = False
        truncated = False
        info = {'action': action, 'action_type': 'unknown'}

        # Get current position info
        current_node = self.ev_state.current_node
        neighbors = self.road_graph.get_neighbors(current_node)

        # Check if already at destination
        if current_node == self.destination_node:
            reward = self.config.destination_reward
            terminated = True
            info['reached'] = True
            info['action_type'] = 'destination_reached'
            return self._get_observation(), reward, terminated, truncated, info

        # Process action
        if action == self.max_actions - 1:
            # Charging action
            info['action_type'] = 'charge'

            if current_node in self.road_graph.charging_stations:
                station = self.road_graph.charging_stations[current_node]

                if self.ev_state.battery_soc < 100:
                    # Calculate charging
                    energy_to_full = (100 - self.ev_state.battery_soc) / 100 * self.ev_state.battery_capacity_kwh
                    charge_time = station.charge_time_minutes(min(energy_to_full, 20))  # Max 20 kWh per action

                    charged_amount = min(20, energy_to_full)  # kWh
                    soc_gain = (charged_amount / self.ev_state.battery_capacity_kwh) * 100

                    old_soc = self.ev_state.battery_soc
                    self.ev_state.battery_soc = min(100, self.ev_state.battery_soc + soc_gain)
                    self.ev_state.time_minutes += int(charge_time)

                    reward = self.config.charging_time_penalty
                    info['charged_kwh'] = charged_amount
                    info['new_soc'] = self.ev_state.battery_soc
                    info['charge_time_minutes'] = charge_time
                else:
                    # Already full
                    reward = -2  # Small penalty for useless action
                    info['error'] = 'battery_full'
            else:
                # Not at charging station
                reward = -5  # Penalty for invalid action
                info['error'] = 'not_at_charging_station'

        elif action < len(neighbors):
            # Movement action
            target_node = neighbors[action]
            edge = (current_node, target_node)
            cost = self.road_graph.calculate_edge_cost(edge, self.ev_state)

            info['action_type'] = 'move'
            info['target_node'] = target_node

            if cost['feasible']:
                # Calculate distance to destination before and after
                old_dist = self._distance_to_destination(current_node)
                new_dist = self._distance_to_destination(target_node)

                # Execute movement
                self.ev_state.current_node = target_node
                self.ev_state.battery_soc -= (cost['energy_kwh'] / self.ev_state.battery_capacity_kwh) * 100
                self.ev_state.time_minutes += int(cost['time_minutes'])
                self.ev_state.total_distance_km += cost['distance_km']
                self.ev_state.total_energy_kwh += cost['energy_kwh']

                # Track episode stats
                self.episode_energy_used += cost['energy_kwh']
                self.episode_distance += cost['distance_km']
                self.visited_nodes.append(target_node)
                self.route_history.append(target_node)

                # Calculate reward
                energy_penalty = -cost['energy_kwh'] * 0.5  # Penalize energy use
                progress_reward = (old_dist - new_dist) * self.config.progress_reward_scale

                reward = energy_penalty + progress_reward

                info['energy_used'] = cost['energy_kwh']
                info['time_used'] = cost['time_minutes']
                info['distance'] = cost['distance_km']
                info['traffic'] = cost['traffic_level']

                # Check if reached destination
                if target_node == self.destination_node:
                    reward += self.config.destination_reward
                    terminated = True
                    info['reached'] = True

                # Check if battery depleted
                if self.ev_state.battery_soc <= 0:
                    reward = self.config.battery_empty_penalty
                    terminated = True
                    info['reached'] = False
                    info['reason'] = 'battery_depleted'
            else:
                # Not enough battery for this move
                reward = -10  # Penalty for attempting infeasible action
                info['error'] = 'insufficient_battery'
                info['energy_needed'] = cost['energy_kwh']
                info['energy_available'] = self.ev_state.remaining_energy_kwh
        else:
            # Invalid action (neighbor index out of range)
            reward = -5
            info['error'] = 'invalid_neighbor_index'
            info['num_neighbors'] = len(neighbors)

        # Check for truncation (max steps)
        if self.current_step >= self.config.max_steps:
            truncated = True
            info['reason'] = 'max_steps_exceeded'

        # Add state info
        info['current_node'] = self.ev_state.current_node
        info['battery_soc'] = self.ev_state.battery_soc
        info['time_minutes'] = self.ev_state.time_minutes
        info['step'] = self.current_step

        return self._get_observation(), reward, terminated, truncated, info

    def step_with_info(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """New-style API: return (observation, reward, terminated, truncated, info)."""
        return self._step_execute(action)

    def step(self, action: int):
        """Legacy-compatible API: return (state, reward, done, info).

        This wrapper calls the new-style executor and converts the return
        to the old 4-tuple format expected by existing code/tests.
        """
        obs, reward, terminated, truncated, info = self._step_execute(action)
        done = terminated or truncated
        # Prefer `get_state()` if available (discrete/legacy state), otherwise return observation
        state = self.get_state() if hasattr(self, 'get_state') else obs
        return state, reward, done, info
    
    def _distance_to_destination(self, node: int) -> float:
        """Calculate Euclidean distance from node to destination."""
        node_data = self.road_graph.graph.nodes[node]
        dest_data = self.road_graph.graph.nodes[self.destination_node]
        
        dx = dest_data['x'] - node_data['x']
        dy = dest_data['y'] - node_data['y']
        
        return np.sqrt(dx**2 + dy**2)
    
    def reset_with_info(self, seed: Optional[int] = None, 
                        options: Optional[Dict] = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Reset the environment for a new episode and return (observation, info).
        This is the new-style API.
        """
        super().reset(seed=seed)

        # Parse options
        if options is None:
            options = {}

        # Set source and destination
        if 'source' in options:
            self.source_node = options['source']
        else:
            self.source_node = 0

        if 'destination' in options:
            self.destination_node = options['destination']
        else:
            self.destination_node = self.road_graph.num_nodes - 1

        # Initialize EV state
        initial_soc = options.get('initial_soc', 100.0)
        initial_time = options.get('initial_time', 480)  # 8 AM

        self.ev_state = EVState(
            battery_soc=initial_soc,
            battery_capacity_kwh=self.config.battery_capacity_kwh,
            energy_rate=self.config.energy_cost_base,
            current_node=self.source_node,
            time_minutes=initial_time,
            total_distance_km=0.0,
            total_energy_kwh=0.0
        )

        # Reset episode tracking
        self.current_step = 0
        self.episode_energy_used = 0.0
        self.episode_distance = 0.0
        self.visited_nodes = [self.source_node]
        self.route_history = [self.source_node]

        info = {
            'source': self.source_node,
            'destination': self.destination_node,
            'initial_soc': initial_soc,
            'initial_time': initial_time,
            'num_charging_stations': len(self.road_graph.charging_stations),
            'grid_size': self.road_graph.grid_size
        }

        # For old interface compatibility
        self.current_pos = (
            self.road_graph.graph.nodes[self.source_node]['x'],
            self.road_graph.graph.nodes[self.source_node]['y']
        )
        self.current_battery = self.ev_state.battery_soc
        self.time_step = 0
        self.episode_steps = 0

        return self._get_observation(), info

    def reset(self, seed: Optional[int] = None, options: Optional[Dict] = None):
        """Legacy-compatible reset: returns legacy state only.

        Calls `reset_with_info` internally and returns the legacy state
        representation used elsewhere in the codebase/tests.
        """
        obs, info = self.reset_with_info(seed=seed, options=options)
        return self.get_state() if hasattr(self, 'get_state') else obs
    
    def render(self):
        """Render the current state."""
        if self.render_mode == 'human':
            self._render_human()
        elif self.render_mode == 'ansi':
            return self._render_ansi()
    
    def _render_human(self):
        """Print current state to console."""
        if self.ev_state is None:
            print("Environment not initialized. Call reset() first.")
            return
        
        print(f"\n{'='*50}")
        print(f"Step: {self.current_step}")
        print(f"Current Node: {self.ev_state.current_node}")
        print(f"Destination: {self.destination_node}")
        print(f"Battery SoC: {self.ev_state.battery_soc:.1f}%")
        print(f"Time: {self.ev_state.time_hours:.1f}h")
        print(f"Distance traveled: {self.ev_state.total_distance_km:.2f} km")
        print(f"Energy used: {self.ev_state.total_energy_kwh:.2f} kWh")
        
        at_charging = "Yes" if self.ev_state.current_node in self.road_graph.charging_stations else "No"
        print(f"At charging station: {at_charging}")
        
        neighbors = self.road_graph.get_neighbors(self.ev_state.current_node)
        print(f"Available neighbors: {neighbors[:5]}{'...' if len(neighbors) > 5 else ''}")
    
    def _render_ansi(self) -> str:
        """Return ASCII representation of current state."""
        if self.ev_state is None:
            return "Environment not initialized"
        
        lines = [
            f"Node: {self.ev_state.current_node} -> {self.destination_node}",
            f"Battery: {'█' * int(self.ev_state.battery_soc // 10)}{'░' * (10 - int(self.ev_state.battery_soc // 10))} {self.ev_state.battery_soc:.0f}%",
            f"Step: {self.current_step}/{self.config.max_steps}"
        ]
        return "\n".join(lines)
    
    def get_info(self) -> Dict:
        """Get current episode information."""
        if self.ev_state is None:
            return {}
        
        return {
            'current_node': self.ev_state.current_node,
            'destination': self.destination_node,
            'battery_soc': self.ev_state.battery_soc,
            'energy_used': self.episode_energy_used,
            'distance_traveled': self.episode_distance,
            'steps': self.current_step,
            'time_minutes': self.ev_state.time_minutes,
            'route': self.route_history.copy(),
            'at_charging_station': self.ev_state.current_node in self.road_graph.charging_stations
        }
    
    # Compatibility methods for old interface
    @property
    def charging_stations(self):
        """Return charging stations in old format."""
        return {
            (self.road_graph.graph.nodes[node]['x'], 
             self.road_graph.graph.nodes[node]['y']): 25
            for node in self.road_graph.charging_stations.keys()
        }
    
    @property
    def destination(self):
        """Return destination in old format."""
        node = self.destination_node
        return (self.road_graph.graph.nodes[node]['x'],
                self.road_graph.graph.nodes[node]['y'])
    
    @property
    def start_pos(self):
        """Return start position in old format."""
        node = self.source_node
        return (self.road_graph.graph.nodes[node]['x'],
                self.road_graph.graph.nodes[node]['y'])


# ============================================================================
# WRAPPER FOR OLD INTERFACE
# ============================================================================

class LegacyEVRoutingEnvironment(EVRoutingEnvironment):
    """
    Wrapper for backward compatibility with old grid-based interface.
    
    This allows existing code using the old (x, y) coordinate system
    to work with the new graph-based environment.
    """
    
    def __init__(self, grid_size: int = 5, max_battery: float = 100,
                 traffic_data: Optional[np.ndarray] = None,
                 energy_cost_base: float = 5.0):
        """Initialize with old-style parameters."""
        config = EnvironmentConfig(
            grid_size=grid_size,
            max_battery=max_battery,
            energy_cost_base=energy_cost_base / 25.0,  # Convert from old scale
            max_steps=150
        )
        super().__init__(config=config, traffic_data=traffic_data)
        
        # Override action space for old interface (5 actions)
        self.action_space = spaces.Discrete(5)
        
        # Override observation space for old interface
        self.observation_space = spaces.Box(
            low=np.array([0, 0, 0, 0, 0], dtype=np.float32),
            high=np.array([grid_size-1, grid_size-1, max_battery, 1.0, 23], 
                         dtype=np.float32),
            dtype=np.float32
        )
    
    def get_state(self) -> Tuple:
        """Get state in old format: (x, y, battery, traffic, hour)."""
        if self.ev_state is None:
            return (0, 0, 100, 0.5, 0)
        
        node_data = self.road_graph.graph.nodes[self.ev_state.current_node]
        x = node_data['x']
        y = node_data['y']
        battery = int(self.ev_state.battery_soc)
        hour = int(self.ev_state.time_hours)
        
        # Get traffic
        neighbors = self.road_graph.get_neighbors(self.ev_state.current_node)
        if neighbors:
            edge = (self.ev_state.current_node, neighbors[0])
            traffic = self.road_graph.get_traffic_multiplier(edge, self.ev_state.time_minutes)
            traffic = min(max(traffic / 2.0, 0), 1.0)
        else:
            traffic = 0.5
        
        return (x, y, battery, traffic, hour)
    
    def step(self, action: int):
        """Execute step with old action format."""
        # Map old actions to new graph-based actions
        # 0 = North (up), 1 = South (down), 2 = East (right), 
        # 3 = West (left), 4 = Charge
        
        if action == 4:
            # Charging action
            new_action = self.max_actions - 1
        else:
            # Movement action - find the neighbor in the correct direction
            current_node = self.ev_state.current_node
            current_x = self.road_graph.graph.nodes[current_node]['x']
            current_y = self.road_graph.graph.nodes[current_node]['y']
            
            # Determine target position based on action
            if action == 0:  # North (y decreases)
                target_x, target_y = current_x, current_y - 1
            elif action == 1:  # South (y increases)
                target_x, target_y = current_x, current_y + 1
            elif action == 2:  # East (x increases)
                target_x, target_y = current_x + 1, current_y
            elif action == 3:  # West (x decreases)
                target_x, target_y = current_x - 1, current_y
            else:
                target_x, target_y = current_x, current_y
            
            # Find neighbor at target position
            neighbors = self.road_graph.get_neighbors(current_node)
            new_action = 0
            
            for i, neighbor in enumerate(neighbors):
                n_x = self.road_graph.graph.nodes[neighbor]['x']
                n_y = self.road_graph.graph.nodes[neighbor]['y']
                if n_x == target_x and n_y == target_y:
                    new_action = i
                    break
        
        # Call parent step (new-style API)
        obs, reward, terminated, truncated, info = super().step_with_info(new_action)
        
        # Return in old format (4-tuple)
        done = terminated or truncated
        
        # Update old-style attributes
        if self.ev_state:
            node_data = self.road_graph.graph.nodes[self.ev_state.current_node]
            self.current_pos = (node_data['x'], node_data['y'])
            self.current_battery = self.ev_state.battery_soc
        
        return self.get_state(), reward, done, info
    
    def reset(self, seed=None, options=None):
        """Reset with old-style return format."""
        obs, info = super().reset_with_info(seed=seed, options=options)
        
        # Update old-style attributes
        node_data = self.road_graph.graph.nodes[self.source_node]
        self.current_pos = (node_data['x'], node_data['y'])
        self.current_battery = self.ev_state.battery_soc
        
        return self.get_state()


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("🚗 EV Routing Environment")
    print("=" * 60)
    
    # Create environment
    print("\n📍 Creating environment...")
    env = EVRoutingEnvironment(grid_size=10)
    
    # Reset (new-style API)
    obs, info = env.reset_with_info()
    print(f"✅ Environment created and reset")
    print(f"   Initial observation shape: {obs.shape}")
    print(f"   Source: {info['source']}")
    print(f"   Destination: {info['destination']}")
    print(f"   Charging stations: {info['num_charging_stations']}")
    
    # Take some random steps
    print(f"\n🎮 Testing with random actions...")
    total_reward = 0
    
    for step in range(20):
        # Random valid action
        valid_actions = env._get_valid_actions()
        action = np.random.choice(valid_actions)
        
        obs, reward, terminated, truncated, info = env.step_with_info(action)
        total_reward += reward
        
        print(f"   Step {step + 1}: Action={action}, Reward={reward:.2f}, "
              f"Node={info.get('current_node', 'N/A')}, "
              f"Battery={info.get('battery_soc', 0):.1f}%")
        
        if terminated or truncated:
            print(f"\n✅ Episode ended: {info}")
            break
    
    print(f"\n📊 Episode Summary:")
    print(f"   Total Reward: {total_reward:.2f}")
    print(f"   Steps: {env.current_step}")
    print(f"   Energy Used: {env.episode_energy_used:.2f} kWh")
    print(f"   Distance: {env.episode_distance:.2f} km")
    
    # Test legacy environment
    print(f"\n🔄 Testing legacy environment...")
    legacy_env = LegacyEVRoutingEnvironment(grid_size=5, max_battery=100)
    state = legacy_env.reset()
    print(f"   Legacy state format: {state}")
    
    state, reward, done, info = legacy_env.step(2)  # Move East
    print(f"   After moving East: {state}, Reward: {reward:.2f}")
    
    print("\n✅ Environment module working correctly!")
