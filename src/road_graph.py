# road_graph.py
"""
Road Graph Module for EV Routing System
========================================
Implements a graph-based road network with:
- OSM-like road structure
- Traffic conditions on edges
- Energy consumption calculations
- Charging station locations
- EV state management

This module represents the "Road Graph (OSM + Traffic + Energy)" component
from the architecture diagram.
"""

import numpy as np
import networkx as nx
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Set
import json
from enum import Enum


class RoadType(Enum):
    """Road types affecting speed and energy consumption."""
    HIGHWAY = "highway"       # Fast, energy efficient at constant speed
    ARTERIAL = "arterial"     # Medium speed roads
    RESIDENTIAL = "residential"  # Slow, more stop-and-go
    CHARGING_ACCESS = "charging_access"  # Roads to charging stations


@dataclass
class EVState:
    """
    EV State Features - tracks the current state of the electric vehicle.
    
    Components:
    - Battery State of Charge (SoC): Current battery level as percentage
    - Energy consumption rate: kWh per km based on conditions
    - Remaining range: Estimated distance that can be traveled
    - Current position: Node ID in the road graph
    - Time: Current simulation time (for traffic patterns)
    """
    battery_soc: float = 100.0      # Battery State of Charge (0-100%)
    battery_capacity_kwh: float = 60.0  # Battery capacity in kWh
    energy_rate: float = 0.2        # Base kWh per km
    current_node: int = 0           # Current position in graph
    time_minutes: int = 480         # Current time (8:00 AM = 480 minutes)
    total_distance_km: float = 0.0  # Total distance traveled
    total_energy_kwh: float = 0.0   # Total energy consumed
    
    @property
    def remaining_energy_kwh(self) -> float:
        """Remaining energy in battery (kWh)."""
        return (self.battery_soc / 100.0) * self.battery_capacity_kwh
    
    @property
    def estimated_range_km(self) -> float:
        """Estimated remaining range based on current consumption rate."""
        if self.energy_rate <= 0:
            return float('inf')
        return self.remaining_energy_kwh / self.energy_rate
    
    @property
    def time_hours(self) -> float:
        """Current time as hours (for traffic lookup)."""
        return (self.time_minutes / 60.0) % 24
    
    def to_array(self) -> np.ndarray:
        """Convert to numpy array for neural network input."""
        return np.array([
            self.battery_soc / 100.0,          # Normalized SoC
            self.remaining_energy_kwh / self.battery_capacity_kwh,  # Normalized remaining energy
            min(self.estimated_range_km / 100.0, 1.0),  # Normalized range (capped at 100km)
            self.time_hours / 24.0,            # Normalized time
            self.energy_rate                   # Energy rate
        ], dtype=np.float32)
    
    def copy(self) -> 'EVState':
        """Create a copy of the current state."""
        return EVState(
            battery_soc=self.battery_soc,
            battery_capacity_kwh=self.battery_capacity_kwh,
            energy_rate=self.energy_rate,
            current_node=self.current_node,
            time_minutes=self.time_minutes,
            total_distance_km=self.total_distance_km,
            total_energy_kwh=self.total_energy_kwh
        )


@dataclass 
class ChargingStation:
    """Charging station information."""
    node_id: int                    # Graph node where station is located
    name: str = "Charging Station"
    charging_power_kw: float = 50.0  # Charging power (kW)
    num_ports: int = 2              # Number of charging ports
    price_per_kwh: float = 0.15     # Price per kWh
    
    def charge_time_minutes(self, energy_needed_kwh: float) -> float:
        """Calculate time to charge given amount of energy."""
        return (energy_needed_kwh / self.charging_power_kw) * 60


class RoadGraph:
    """
    Graph-based road network for EV routing.
    
    This class creates and manages a road network graph where:
    - Nodes represent intersections/locations
    - Edges represent road segments with:
        - Distance (km)
        - Base travel time (minutes)
        - Road type
        - Traffic conditions (time-varying)
        - Energy cost
    """
    
    def __init__(self, grid_size: int = 10, seed: int = 42):
        """
        Initialize road graph.
        
        Args:
            grid_size: Size of the grid (grid_size x grid_size nodes)
            seed: Random seed for reproducibility
        """
        self.grid_size = grid_size
        self.seed = seed
        np.random.seed(seed)
        
        # Create the road graph
        self.graph = nx.DiGraph()  # Directed graph for one-way streets support
        self.num_nodes = grid_size * grid_size
        
        # Build the network
        self._build_grid_network()
        self._add_diagonal_roads()
        self._assign_road_types()
        self._add_charging_stations()
        
        # Traffic data (can be updated by SG-GAN)
        self.traffic_patterns = self._generate_base_traffic_patterns()
        
        # Feature dimensions for neural networks
        self.node_feature_dim = 6   # Node features
        self.edge_feature_dim = 8   # Edge features
        
    def _build_grid_network(self):
        """Create a grid-based road network."""
        # Add nodes
        for i in range(self.num_nodes):
            row = i // self.grid_size
            col = i % self.grid_size
            
            self.graph.add_node(i, 
                pos=(col, row),
                x=col,
                y=row,
                is_charging_station=False,
                charging_station=None
            )
        
        # Add edges (roads) - bidirectional grid connections
        for i in range(self.num_nodes):
            row = i // self.grid_size
            col = i % self.grid_size
            
            # Right neighbor
            if col < self.grid_size - 1:
                j = i + 1
                self._add_road(i, j)
                self._add_road(j, i)
            
            # Bottom neighbor
            if row < self.grid_size - 1:
                j = i + self.grid_size
                self._add_road(i, j)
                self._add_road(j, i)
    
    def _add_diagonal_roads(self):
        """Add some diagonal roads for more realistic network."""
        np.random.seed(self.seed + 1)
        
        for i in range(self.num_nodes):
            row = i // self.grid_size
            col = i % self.grid_size
            
            # Add diagonal connections with probability 0.3
            if row < self.grid_size - 1 and col < self.grid_size - 1:
                if np.random.random() < 0.3:
                    j = i + self.grid_size + 1  # Bottom-right diagonal
                    self._add_road(i, j, distance_multiplier=1.41)
                    self._add_road(j, i, distance_multiplier=1.41)
    
    def _add_road(self, from_node: int, to_node: int, distance_multiplier: float = 1.0):
        """Add a road segment between two nodes."""
        # Base distance (1 km per grid unit)
        from_pos = self.graph.nodes[from_node]['pos']
        to_pos = self.graph.nodes[to_node]['pos']
        
        dx = to_pos[0] - from_pos[0]
        dy = to_pos[1] - from_pos[1]
        distance = np.sqrt(dx**2 + dy**2) * distance_multiplier
        
        # Base travel time (assume 50 km/h average)
        base_time_minutes = (distance / 50.0) * 60
        
        self.graph.add_edge(from_node, to_node,
            distance_km=distance,
            base_time_minutes=base_time_minutes,
            road_type=RoadType.ARTERIAL,  # Default type
            speed_limit_kmh=50,
            elevation_change_m=0,         # Can be updated with real data
            base_energy_kwh_per_km=0.2    # Base energy consumption
        )
    
    def _assign_road_types(self):
        """Assign road types to create a realistic network."""
        np.random.seed(self.seed + 2)
        
        # Main arteries (cross the grid)
        mid = self.grid_size // 2
        
        for edge in self.graph.edges():
            i, j = edge
            row_i = i // self.grid_size
            col_i = i % self.grid_size
            
            # Highways: main cross roads
            if row_i == mid or col_i == mid:
                self.graph.edges[edge]['road_type'] = RoadType.HIGHWAY
                self.graph.edges[edge]['speed_limit_kmh'] = 80
                self.graph.edges[edge]['base_energy_kwh_per_km'] = 0.18
            
            # Residential: edges only
            elif row_i == 0 or row_i == self.grid_size - 1 or \
                 col_i == 0 or col_i == self.grid_size - 1:
                self.graph.edges[edge]['road_type'] = RoadType.RESIDENTIAL
                self.graph.edges[edge]['speed_limit_kmh'] = 30
                self.graph.edges[edge]['base_energy_kwh_per_km'] = 0.25
    
    def _add_charging_stations(self):
        """Add charging stations to the network."""
        np.random.seed(self.seed + 3)
        
        self.charging_stations: Dict[int, ChargingStation] = {}
        
        # Place charging stations strategically
        # At corners, center, and a few random locations
        station_locations = [
            0,                                              # Top-left
            self.grid_size - 1,                            # Top-right
            self.num_nodes - self.grid_size,               # Bottom-left
            self.num_nodes - 1,                            # Bottom-right
            self.num_nodes // 2,                           # Center
        ]
        
        # Add a few more random stations
        for _ in range(3):
            node = np.random.randint(0, self.num_nodes)
            if node not in station_locations:
                station_locations.append(node)
        
        for idx, node_id in enumerate(station_locations):
            station = ChargingStation(
                node_id=node_id,
                name=f"Station_{idx}",
                charging_power_kw=np.random.choice([50, 100, 150]),
                num_ports=np.random.randint(2, 6),
                price_per_kwh=np.random.uniform(0.10, 0.25)
            )
            
            self.charging_stations[node_id] = station
            self.graph.nodes[node_id]['is_charging_station'] = True
            self.graph.nodes[node_id]['charging_station'] = station
    
    def _generate_base_traffic_patterns(self) -> np.ndarray:
        """
        Generate base traffic patterns for 24 hours.
        
        Returns:
            Array of shape (num_edges, 24) with traffic multipliers
        """
        num_edges = self.graph.number_of_edges()
        traffic = np.ones((num_edges, 24))
        
        # Add time-of-day patterns
        for hour in range(24):
            # Morning rush: 7-9 AM
            if 7 <= hour <= 9:
                traffic[:, hour] *= np.random.uniform(1.3, 1.8, num_edges)
            # Evening rush: 5-7 PM
            elif 17 <= hour <= 19:
                traffic[:, hour] *= np.random.uniform(1.4, 1.9, num_edges)
            # Night: 10 PM - 6 AM
            elif hour >= 22 or hour <= 6:
                traffic[:, hour] *= np.random.uniform(0.3, 0.6, num_edges)
            # Normal hours
            else:
                traffic[:, hour] *= np.random.uniform(0.8, 1.2, num_edges)
        
        return traffic
    
    def update_traffic_from_gan(self, gan_traffic: np.ndarray):
        """
        Update traffic patterns with GAN-generated data.
        
        Args:
            gan_traffic: Array of shape (num_edges, 24) from SG-GAN
        """
        # Validate shape
        if gan_traffic.shape[0] != self.graph.number_of_edges():
            # Resize if needed
            gan_traffic = np.resize(gan_traffic, (self.graph.number_of_edges(), 24))
        
        # Ensure positive values
        gan_traffic = np.clip(gan_traffic, 0.1, 3.0)
        
        self.traffic_patterns = gan_traffic
    
    def get_traffic_multiplier(self, edge: Tuple[int, int], time_minutes: int) -> float:
        """Get traffic multiplier for an edge at given time."""
        hour = int((time_minutes / 60) % 24)
        edge_idx = list(self.graph.edges()).index(edge)
        return self.traffic_patterns[edge_idx, hour]
    
    def calculate_edge_cost(self, edge: Tuple[int, int], ev_state: EVState) -> Dict:
        """
        Calculate the cost of traversing an edge.
        
        Returns:
            Dictionary with:
            - energy_kwh: Energy required
            - time_minutes: Time required
            - distance_km: Distance
            - feasible: Whether EV can make this trip
        """
        edge_data = self.graph.edges[edge]
        traffic = self.get_traffic_multiplier(edge, ev_state.time_minutes)
        
        distance = edge_data['distance_km']
        base_energy = edge_data['base_energy_kwh_per_km']
        base_time = edge_data['base_time_minutes']
        
        # Adjust for traffic (more traffic = more energy due to stop-and-go)
        energy_multiplier = 1 + (traffic - 1) * 0.3
        time_multiplier = traffic
        
        # Adjust for road type
        road_type = edge_data['road_type']
        if road_type == RoadType.HIGHWAY:
            energy_multiplier *= 0.9  # More efficient on highway
        elif road_type == RoadType.RESIDENTIAL:
            energy_multiplier *= 1.2  # More stop-and-go
        
        energy_kwh = distance * base_energy * energy_multiplier
        time_minutes = base_time * time_multiplier
        
        return {
            'energy_kwh': energy_kwh,
            'time_minutes': time_minutes,
            'distance_km': distance,
            'traffic_level': traffic,
            'feasible': ev_state.remaining_energy_kwh >= energy_kwh
        }
    
    def get_neighbors(self, node: int) -> List[int]:
        """Get all neighboring nodes (possible next moves)."""
        return list(self.graph.successors(node))
    
    def get_node_features(self, node: int, destination: int, ev_state: EVState) -> np.ndarray:
        """
        Get feature vector for a node.
        
        Features:
        - Normalized x, y position
        - Is charging station (0/1)
        - Distance to destination (normalized)
        - Degree centrality
        - Is destination (0/1)
        """
        node_data = self.graph.nodes[node]
        dest_data = self.graph.nodes[destination]
        
        # Position features
        x = node_data['x'] / self.grid_size
        y = node_data['y'] / self.grid_size
        
        # Distance to destination
        dx = dest_data['x'] - node_data['x']
        dy = dest_data['y'] - node_data['y']
        dist_to_dest = np.sqrt(dx**2 + dy**2) / (self.grid_size * np.sqrt(2))
        
        # Charging station
        is_charging = 1.0 if node_data['is_charging_station'] else 0.0
        
        # Degree centrality (connectivity)
        degree = self.graph.degree(node) / (4 * 2)  # Normalize by max possible
        
        # Is destination
        is_dest = 1.0 if node == destination else 0.0
        
        return np.array([x, y, is_charging, dist_to_dest, degree, is_dest], dtype=np.float32)
    
    def get_edge_features(self, edge: Tuple[int, int], ev_state: EVState) -> np.ndarray:
        """
        Get feature vector for an edge.
        
        Features:
        - Distance (normalized)
        - Energy required (normalized by remaining battery)
        - Time required (normalized)
        - Traffic level
        - Road type (one-hot: highway, arterial, residential)
        - Feasibility (0/1)
        """
        cost = self.calculate_edge_cost(edge, ev_state)
        edge_data = self.graph.edges[edge]
        
        # Basic features
        distance = cost['distance_km'] / 2.0  # Normalize by max edge distance
        energy = cost['energy_kwh'] / ev_state.remaining_energy_kwh if ev_state.remaining_energy_kwh > 0 else 1.0
        time = cost['time_minutes'] / 10.0  # Normalize
        traffic = cost['traffic_level'] / 2.0  # Normalize
        
        # Road type one-hot
        road_type = edge_data['road_type']
        is_highway = 1.0 if road_type == RoadType.HIGHWAY else 0.0
        is_arterial = 1.0 if road_type == RoadType.ARTERIAL else 0.0
        is_residential = 1.0 if road_type == RoadType.RESIDENTIAL else 0.0
        
        # Feasibility
        feasible = 1.0 if cost['feasible'] else 0.0
        
        return np.array([
            distance, energy, time, traffic,
            is_highway, is_arterial, is_residential, feasible
        ], dtype=np.float32)
    
    def get_adjacency_matrix(self) -> np.ndarray:
        """Get adjacency matrix of the graph."""
        return nx.adjacency_matrix(self.graph).toarray()
    
    def shortest_path(self, source: int, target: int) -> List[int]:
        """Find shortest path between two nodes."""
        try:
            return nx.shortest_path(self.graph, source, target, weight='distance_km')
        except nx.NetworkXNoPath:
            return []
    
    def energy_optimal_path(self, source: int, target: int, ev_state: EVState) -> List[int]:
        """Find energy-optimal path considering current EV state."""
        # Create weight function based on energy
        def energy_weight(u, v, d):
            cost = self.calculate_edge_cost((u, v), ev_state)
            if not cost['feasible']:
                return float('inf')
            return cost['energy_kwh']
        
        try:
            return nx.dijkstra_path(self.graph, source, target, weight=energy_weight)
        except nx.NetworkXNoPath:
            return []
    
    def encode_route(self, route: List[int]) -> np.ndarray:
        """
        Encode a route as a feature matrix for neural network input.
        
        Args:
            route: List of node IDs
        
        Returns:
            Array of shape (max_route_length, node_feature_dim + edge_feature_dim)
        """
        max_length = self.num_nodes  # Maximum possible route length
        feature_dim = self.node_feature_dim + self.edge_feature_dim
        encoded = np.zeros((max_length, feature_dim), dtype=np.float32)
        
        ev_state = EVState(current_node=route[0])
        
        for i, node in enumerate(route):
            if i >= max_length:
                break
            
            # Node features (destination = last node in route)
            node_features = self.get_node_features(node, route[-1], ev_state)
            
            # Edge features (if not last node)
            if i < len(route) - 1:
                edge = (node, route[i + 1])
                edge_features = self.get_edge_features(edge, ev_state)
            else:
                edge_features = np.zeros(self.edge_feature_dim, dtype=np.float32)
            
            encoded[i] = np.concatenate([node_features, edge_features])
            ev_state.current_node = node
        
        return encoded
    
    def to_dict(self) -> Dict:
        """Serialize graph to dictionary."""
        return {
            'grid_size': self.grid_size,
            'num_nodes': self.num_nodes,
            'nodes': dict(self.graph.nodes(data=True)),
            'edges': [(u, v, d) for u, v, d in self.graph.edges(data=True)],
            'charging_stations': {k: vars(v) for k, v in self.charging_stations.items()},
            'traffic_patterns': self.traffic_patterns.tolist()
        }
    
    def visualize(self, route: List[int] = None, ax=None):
        """Visualize the road graph."""
        import matplotlib.pyplot as plt
        
        if ax is None:
            fig, ax = plt.subplots(1, 1, figsize=(10, 10))
        
        # Node positions
        pos = {i: (self.graph.nodes[i]['x'], self.graph.nodes[i]['y']) 
               for i in self.graph.nodes()}
        
        # Draw edges
        nx.draw_networkx_edges(self.graph, pos, ax=ax, alpha=0.3, arrows=False)
        
        # Draw regular nodes
        regular_nodes = [n for n in self.graph.nodes() 
                        if not self.graph.nodes[n]['is_charging_station']]
        nx.draw_networkx_nodes(self.graph, pos, nodelist=regular_nodes, 
                              node_size=100, node_color='lightblue', ax=ax)
        
        # Draw charging stations
        charging_nodes = list(self.charging_stations.keys())
        nx.draw_networkx_nodes(self.graph, pos, nodelist=charging_nodes,
                              node_size=200, node_color='green', 
                              node_shape='s', ax=ax)
        
        # Draw route if provided
        if route and len(route) > 1:
            route_edges = [(route[i], route[i+1]) for i in range(len(route)-1)]
            nx.draw_networkx_edges(self.graph, pos, edgelist=route_edges,
                                  edge_color='red', width=3, ax=ax)
            
            # Highlight start and end
            nx.draw_networkx_nodes(self.graph, pos, nodelist=[route[0]],
                                  node_size=300, node_color='blue', ax=ax)
            nx.draw_networkx_nodes(self.graph, pos, nodelist=[route[-1]],
                                  node_size=300, node_color='orange', ax=ax)
        
        ax.set_title("Road Network Graph")
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        
        return ax


# ============================================================================
# HISTORICAL ROUTE DATA GENERATOR
# ============================================================================

class HistoricalRouteGenerator:
    """
    Generate synthetic historical EV routes for training the GAN.
    
    This simulates the "Historical EV Routes (Real-world Route Dataset)"
    from the architecture diagram.
    """
    
    def __init__(self, road_graph: RoadGraph, seed: int = 42):
        self.road_graph = road_graph
        self.seed = seed
        np.random.seed(seed)
    
    def generate_routes(self, num_routes: int = 1000) -> List[Dict]:
        """
        Generate historical EV routes.
        
        Each route contains:
        - path: List of node IDs
        - ev_state: Initial EV state
        - source: Start node
        - destination: End node
        - total_energy: Energy consumed
        - total_time: Time taken
        - charging_stops: List of charging stops
        """
        routes = []
        
        for _ in range(num_routes):
            # Random source and destination
            source = np.random.randint(0, self.road_graph.num_nodes)
            destination = np.random.randint(0, self.road_graph.num_nodes)
            
            # Ensure different start and end
            while destination == source:
                destination = np.random.randint(0, self.road_graph.num_nodes)
            
            # Generate route (mix of shortest and random variations)
            route = self._generate_realistic_route(source, destination)
            
            if route:
                # Calculate route statistics
                ev_state = EVState(
                    battery_soc=np.random.uniform(50, 100),
                    current_node=source,
                    time_minutes=np.random.randint(0, 1440)
                )
                
                route_data = self._calculate_route_stats(route, ev_state)
                route_data['source'] = source
                route_data['destination'] = destination
                route_data['path'] = route
                route_data['initial_soc'] = ev_state.battery_soc
                route_data['start_time'] = ev_state.time_minutes
                
                routes.append(route_data)
        
        return routes
    
    def _generate_realistic_route(self, source: int, destination: int) -> List[int]:
        """Generate a realistic route with some variation."""
        # Start with shortest path
        try:
            base_path = nx.shortest_path(self.road_graph.graph, source, destination)
        except nx.NetworkXNoPath:
            return []
        
        # Add variation with probability 0.3
        if np.random.random() < 0.3 and len(base_path) > 2:
            # Take a slight detour
            variation_idx = np.random.randint(1, len(base_path) - 1)
            node = base_path[variation_idx]
            neighbors = self.road_graph.get_neighbors(node)
            
            if neighbors:
                # Pick a random neighbor not in path
                valid_neighbors = [n for n in neighbors if n not in base_path]
                if valid_neighbors:
                    detour_node = np.random.choice(valid_neighbors)
                    
                    # Try to create path through detour
                    try:
                        path1 = nx.shortest_path(self.road_graph.graph, source, detour_node)
                        path2 = nx.shortest_path(self.road_graph.graph, detour_node, destination)
                        return path1 + path2[1:]  # Avoid duplicate detour_node
                    except nx.NetworkXNoPath:
                        pass
        
        return base_path
    
    def _calculate_route_stats(self, route: List[int], ev_state: EVState) -> Dict:
        """Calculate statistics for a route."""
        total_energy = 0.0
        total_time = 0.0
        total_distance = 0.0
        charging_stops = []
        
        current_ev_state = ev_state.copy()
        
        for i in range(len(route) - 1):
            edge = (route[i], route[i + 1])
            cost = self.road_graph.calculate_edge_cost(edge, current_ev_state)
            
            total_energy += cost['energy_kwh']
            total_time += cost['time_minutes']
            total_distance += cost['distance_km']
            
            # Update EV state
            current_ev_state.battery_soc -= (cost['energy_kwh'] / current_ev_state.battery_capacity_kwh) * 100
            current_ev_state.time_minutes += int(cost['time_minutes'])
            
            # Check if charging is needed
            if current_ev_state.battery_soc < 20 and route[i + 1] in self.road_graph.charging_stations:
                charging_stops.append({
                    'node': route[i + 1],
                    'soc_before': current_ev_state.battery_soc,
                    'time': current_ev_state.time_minutes
                })
                current_ev_state.battery_soc = 80  # Charge to 80%
        
        return {
            'total_energy_kwh': total_energy,
            'total_time_minutes': total_time,
            'total_distance_km': total_distance,
            'charging_stops': charging_stops,
            'final_soc': current_ev_state.battery_soc
        }


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("🗺️ Road Graph Module")
    print("=" * 60)
    
    # Create road graph
    print("\n📍 Creating road network...")
    graph = RoadGraph(grid_size=10, seed=42)
    print(f"✅ Created graph with {graph.num_nodes} nodes and {graph.graph.number_of_edges()} edges")
    print(f"   Charging stations: {len(graph.charging_stations)}")
    
    # Create EV state
    print("\n🔋 Creating EV state...")
    ev = EVState(
        battery_soc=80,
        battery_capacity_kwh=60,
        current_node=0,
        time_minutes=480  # 8:00 AM
    )
    print(f"   Battery SoC: {ev.battery_soc}%")
    print(f"   Remaining energy: {ev.remaining_energy_kwh:.1f} kWh")
    print(f"   Estimated range: {ev.estimated_range_km:.1f} km")
    
    # Find a route
    print("\n🛣️ Finding route from node 0 to node 99...")
    route = graph.shortest_path(0, 99)
    print(f"   Shortest path: {route[:5]}... (length: {len(route)} nodes)")
    
    # Calculate route cost
    print("\n💰 Route cost calculation:")
    total_energy = 0
    for i in range(min(3, len(route) - 1)):
        edge = (route[i], route[i + 1])
        cost = graph.calculate_edge_cost(edge, ev)
        print(f"   Edge {edge}: {cost['energy_kwh']:.2f} kWh, {cost['time_minutes']:.1f} min")
        total_energy += cost['energy_kwh']
    
    # Generate historical routes
    print("\n📜 Generating historical routes...")
    route_gen = HistoricalRouteGenerator(graph, seed=42)
    historical_routes = route_gen.generate_routes(100)
    print(f"✅ Generated {len(historical_routes)} historical routes")
    print(f"   Avg route length: {np.mean([len(r['path']) for r in historical_routes]):.1f} nodes")
    print(f"   Avg energy: {np.mean([r['total_energy_kwh'] for r in historical_routes]):.2f} kWh")
    
    # Visualize
    print("\n📊 Creating visualization...")
    try:
        import matplotlib.pyplot as plt
        from src.config import get_settings
        settings = get_settings()
        settings.plots_path.mkdir(parents=True, exist_ok=True)
        fig, ax = plt.subplots(1, 1, figsize=(10, 10))
        graph.visualize(route=route, ax=ax)
        plt.savefig(str(settings.plots_path / "road_graph.png"), dpi=150, bbox_inches='tight')
        print("✅ Saved road graph visualization to results/plots/road_graph.png")
    except Exception as e:
        print(f"⚠️ Could not save visualization: {e}")
    
    print("\n✅ Road graph module working correctly!")
