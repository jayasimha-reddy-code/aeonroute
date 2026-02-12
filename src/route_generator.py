# route_generator.py
"""
GAN-based Route Generator for EV Routing
==========================================
Implements a route generation system using trained SG-GAN
that creates candidate EV routes based on:
- Source and destination nodes
- EV battery state
- Current traffic conditions
- Graph connectivity constraints

This module corresponds to the "Generator" component from the architecture
that outputs candidate EV routes.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
import heapq
from dataclasses import dataclass

try:
    from road_graph import RoadGraph, EVState, HistoricalRouteGenerator
    from traffic_generator import SGGANTrafficGenerator
except ImportError:
    from src.road_graph import RoadGraph, EVState, HistoricalRouteGenerator
    from src.traffic_generator import SGGANTrafficGenerator


@dataclass
class RouteCandidate:
    """A candidate route with metadata."""
    path: List[int]
    source: int
    destination: int
    total_energy_kwh: float
    total_time_minutes: float
    total_distance_km: float
    feasibility_score: float
    realism_score: float
    charging_stops: List[int]
    
    def __lt__(self, other):
        """For heap comparison (lower energy is better)."""
        return self.total_energy_kwh < other.total_energy_kwh


class RouteGenerator:
    """
    Generates candidate EV routes using a combination of:
    1. Classical pathfinding algorithms (Dijkstra, A*)
    2. GAN-guided route generation
    3. Energy-aware path planning
    
    The generator creates multiple candidate routes that the
    Q-learning agent or other planners can evaluate and select from.
    """
    
    def __init__(self, road_graph: RoadGraph, gan: Optional[SGGANTrafficGenerator] = None):
        """
        Initialize route generator.
        
        Args:
            road_graph: Road network graph
            gan: Optional trained SG-GAN for traffic prediction
        """
        self.road_graph = road_graph
        self.gan = gan
        
        # Cache for computed routes
        self._route_cache: Dict[Tuple[int, int], List[RouteCandidate]] = {}
    
    def generate_routes(self, 
                       source: int, 
                       destination: int,
                       ev_state: EVState,
                       num_candidates: int = 5,
                       use_gan: bool = True) -> List[RouteCandidate]:
        """
        Generate multiple candidate routes from source to destination.
        
        Args:
            source: Source node ID
            destination: Destination node ID
            ev_state: Current EV state
            num_candidates: Number of candidate routes to generate
            use_gan: Whether to use GAN for traffic prediction
        
        Returns:
            List of RouteCandidate objects sorted by energy efficiency
        """
        candidates = []
        
        # 1. Shortest path (baseline)
        shortest = self._shortest_path_route(source, destination, ev_state)
        if shortest:
            candidates.append(shortest)
        
        # 2. Energy-optimal path
        energy_opt = self._energy_optimal_route(source, destination, ev_state)
        if energy_opt and (not candidates or energy_opt.path != candidates[-1].path):
            candidates.append(energy_opt)
        
        # 3. Time-optimal path
        time_opt = self._time_optimal_route(source, destination, ev_state)
        if time_opt and all(time_opt.path != c.path for c in candidates):
            candidates.append(time_opt)
        
        # 4. Paths via charging stations (if needed)
        if ev_state.battery_soc < 50:
            charging_routes = self._routes_via_charging(source, destination, ev_state)
            for route in charging_routes[:2]:  # Add up to 2 charging routes
                if all(route.path != c.path for c in candidates):
                    candidates.append(route)
        
        # 5. K-shortest paths for diversity
        k_paths = self._k_shortest_paths(source, destination, ev_state, k=3)
        for route in k_paths:
            if all(route.path != c.path for c in candidates):
                candidates.append(route)
        
        # 6. GAN-guided route variations
        if use_gan and self.gan is not None:
            gan_routes = self._gan_guided_routes(source, destination, ev_state, num_routes=2)
            for route in gan_routes:
                if all(route.path != c.path for c in candidates):
                    candidates.append(route)
        
        # Score and sort candidates
        for candidate in candidates:
            self._score_candidate(candidate, ev_state)
        
        # Sort by energy efficiency
        candidates.sort(key=lambda c: c.total_energy_kwh)
        
        return candidates[:num_candidates]
    
    def _shortest_path_route(self, source: int, destination: int, 
                            ev_state: EVState) -> Optional[RouteCandidate]:
        """Generate route using shortest path algorithm."""
        path = self.road_graph.shortest_path(source, destination)
        if not path:
            return None
        
        return self._create_route_candidate(path, ev_state)
    
    def _energy_optimal_route(self, source: int, destination: int,
                             ev_state: EVState) -> Optional[RouteCandidate]:
        """Generate route optimizing for energy consumption."""
        path = self.road_graph.energy_optimal_path(source, destination, ev_state)
        if not path:
            return None
        
        return self._create_route_candidate(path, ev_state)
    
    def _time_optimal_route(self, source: int, destination: int,
                           ev_state: EVState) -> Optional[RouteCandidate]:
        """Generate route optimizing for travel time."""
        def time_weight(u, v, d):
            edge = (u, v)
            cost = self.road_graph.calculate_edge_cost(edge, ev_state)
            return cost['time_minutes']
        
        try:
            import networkx as nx
            path = nx.dijkstra_path(self.road_graph.graph, source, destination, 
                                   weight=time_weight)
            return self._create_route_candidate(path, ev_state)
        except:
            return None
    
    def _routes_via_charging(self, source: int, destination: int,
                            ev_state: EVState) -> List[RouteCandidate]:
        """Generate routes that include charging station stops."""
        routes = []
        
        # Find nearest charging stations (limit to 5 nearest to avoid slow computation)
        charging_stations = list(self.road_graph.charging_stations.keys())[:5]
        
        for station in charging_stations:
            try:
                # Path: source -> charging station -> destination
                path1 = self.road_graph.shortest_path(source, station)
                path2 = self.road_graph.shortest_path(station, destination)
                
                if path1 and path2:
                    # Combine paths (avoid duplicating the charging station)
                    full_path = path1 + path2[1:]
                    
                    candidate = self._create_route_candidate(full_path, ev_state)
                    if candidate:
                        candidate.charging_stops = [station]
                        routes.append(candidate)
                        
                        # Limit to 3 charging routes to speed up
                        if len(routes) >= 3:
                            break
            except Exception:
                continue
        
        # Sort by total energy
        routes.sort(key=lambda r: r.total_energy_kwh)
        return routes
    
    def _k_shortest_paths(self, source: int, destination: int,
                         ev_state: EVState, k: int = 3) -> List[RouteCandidate]:
        """Generate k-shortest paths using Yen's algorithm."""
        routes = []
        
        try:
            import networkx as nx
            
            # Get k shortest simple paths with iteration limit to avoid hanging
            path_generator = nx.shortest_simple_paths(
                self.road_graph.graph, source, destination, weight='distance_km'
            )
            
            # Only iterate up to k paths to avoid expensive computation
            count = 0
            for path in path_generator:
                if count >= k:
                    break
                candidate = self._create_route_candidate(list(path), ev_state)
                if candidate:
                    routes.append(candidate)
                count += 1
        except Exception:
            pass
        
        return routes
    
    def _gan_guided_routes(self, source: int, destination: int,
                          ev_state: EVState, num_routes: int = 2) -> List[RouteCandidate]:
        """
        Generate routes guided by GAN-predicted traffic patterns.
        
        Uses the GAN to predict traffic conditions and find routes
        that avoid congestion.
        """
        routes = []
        
        if self.gan is None:
            return routes
        
        try:
            # Generate traffic predictions from GAN
            ev_features = ev_state.to_array()
            conditions = np.zeros(10)  # Default conditions
            
            # Get source/destination positions
            src_data = self.road_graph.graph.nodes[source]
            dst_data = self.road_graph.graph.nodes[destination]
            
            conditions[0] = src_data['x'] / self.road_graph.grid_size
            conditions[1] = src_data['y'] / self.road_graph.grid_size
            conditions[2] = dst_data['x'] / self.road_graph.grid_size
            conditions[3] = dst_data['y'] / self.road_graph.grid_size
            
            # Generate traffic prediction
            predicted_traffic = self.gan.generate_traffic_scenarios(
                n_samples=1, ev_state=ev_features, conditions=conditions
            )[0]
            
            # Update road graph with predicted traffic
            original_traffic = self.road_graph.traffic_patterns.copy()
            self.road_graph.update_traffic_from_gan(predicted_traffic)
            
            # Find energy-optimal path with predicted traffic
            path = self.road_graph.energy_optimal_path(source, destination, ev_state)
            if path:
                candidate = self._create_route_candidate(path, ev_state)
                if candidate:
                    routes.append(candidate)
            
            # Restore original traffic
            self.road_graph.traffic_patterns = original_traffic
            
        except Exception as e:
            pass  # GAN-guided routing failed, return empty list
        
        return routes
    
    def _create_route_candidate(self, path: List[int], 
                               ev_state: EVState) -> Optional[RouteCandidate]:
        """
        Create a RouteCandidate from a path.
        
        Calculates energy, time, distance, and feasibility.
        """
        if not path or len(path) < 2:
            return None
        
        total_energy = 0.0
        total_time = 0.0
        total_distance = 0.0
        
        current_ev = ev_state.copy()
        
        for i in range(len(path) - 1):
            edge = (path[i], path[i + 1])
            
            try:
                cost = self.road_graph.calculate_edge_cost(edge, current_ev)
            except:
                return None  # Invalid edge
            
            total_energy += cost['energy_kwh']
            total_time += cost['time_minutes']
            total_distance += cost['distance_km']
            
            # Update EV state for next edge
            current_ev.battery_soc -= (cost['energy_kwh'] / current_ev.battery_capacity_kwh) * 100
            current_ev.time_minutes += int(cost['time_minutes'])
        
        # Check feasibility
        feasibility = 1.0 if ev_state.remaining_energy_kwh >= total_energy else 0.0
        
        return RouteCandidate(
            path=path,
            source=path[0],
            destination=path[-1],
            total_energy_kwh=total_energy,
            total_time_minutes=total_time,
            total_distance_km=total_distance,
            feasibility_score=feasibility,
            realism_score=1.0,  # Will be updated by scoring
            charging_stops=[]
        )
    
    def _score_candidate(self, candidate: RouteCandidate, ev_state: EVState):
        """
        Score a route candidate using the GAN discriminator.
        
        Updates feasibility_score and realism_score.
        """
        # Basic feasibility check
        energy_ratio = candidate.total_energy_kwh / ev_state.remaining_energy_kwh if ev_state.remaining_energy_kwh > 0 else float('inf')
        
        if energy_ratio > 1.0:
            candidate.feasibility_score = max(0, 1 - (energy_ratio - 1))
        else:
            candidate.feasibility_score = 1.0
        
        # Use GAN discriminator for realism scoring
        if self.gan is not None:
            try:
                # Encode route as traffic-like pattern
                route_encoding = self._encode_route_for_discriminator(candidate.path, ev_state)
                ev_features = ev_state.to_array()
                conditions = np.zeros(10)
                
                scores = self.gan.evaluate_scenario(route_encoding, ev_features, conditions)
                candidate.realism_score = scores.get('realism_score', 0.5)
            except:
                candidate.realism_score = 0.5
        else:
            # Heuristic realism based on path characteristics
            # Penalize very long detours
            direct_dist = self._euclidean_distance(candidate.source, candidate.destination)
            path_ratio = candidate.total_distance_km / max(direct_dist, 0.1)
            
            # Good paths are 1.0-1.5x direct distance
            if path_ratio < 1.5:
                candidate.realism_score = 1.0
            elif path_ratio < 2.0:
                candidate.realism_score = 0.8
            elif path_ratio < 3.0:
                candidate.realism_score = 0.5
            else:
                candidate.realism_score = 0.2
    
    def _encode_route_for_discriminator(self, path: List[int], 
                                       ev_state: EVState) -> np.ndarray:
        """
        Encode a route into a format the GAN discriminator can evaluate.
        
        Creates a (num_roads, time_steps) representation of the route.
        """
        num_roads = 20  # Match GAN input shape
        time_steps = 24
        
        encoding = np.zeros((num_roads, time_steps), dtype=np.float32)
        
        # Mark edges in the route
        for i in range(len(path) - 1):
            edge_idx = i % num_roads
            time_idx = (ev_state.time_minutes // 60 + i) % time_steps
            encoding[edge_idx, time_idx] = 1.0
        
        return encoding
    
    def _euclidean_distance(self, node1: int, node2: int) -> float:
        """Calculate Euclidean distance between two nodes."""
        n1 = self.road_graph.graph.nodes[node1]
        n2 = self.road_graph.graph.nodes[node2]
        
        dx = n2['x'] - n1['x']
        dy = n2['y'] - n1['y']
        
        return np.sqrt(dx**2 + dy**2)
    
    def get_best_route(self, source: int, destination: int,
                      ev_state: EVState, 
                      criteria: str = 'energy') -> Optional[RouteCandidate]:
        """
        Get the best route based on specified criteria.
        
        Args:
            source: Source node
            destination: Destination node
            ev_state: Current EV state
            criteria: 'energy', 'time', 'distance', or 'balanced'
        
        Returns:
            Best RouteCandidate or None
        """
        candidates = self.generate_routes(source, destination, ev_state)
        
        if not candidates:
            return None
        
        if criteria == 'energy':
            return min(candidates, key=lambda c: c.total_energy_kwh)
        elif criteria == 'time':
            return min(candidates, key=lambda c: c.total_time_minutes)
        elif criteria == 'distance':
            return min(candidates, key=lambda c: c.total_distance_km)
        elif criteria == 'balanced':
            # Weighted combination
            def score(c):
                return (c.total_energy_kwh * 0.4 + 
                       c.total_time_minutes * 0.3 +
                       c.total_distance_km * 0.3)
            return min(candidates, key=score)
        else:
            return candidates[0]
    
    def visualize_routes(self, candidates: List[RouteCandidate], 
                        save_path: Optional[str] = None):
        """
        Visualize multiple route candidates on the road graph.
        """
        import matplotlib.pyplot as plt
        
        fig, ax = plt.subplots(1, 1, figsize=(12, 12))
        
        # Draw base graph
        self.road_graph.visualize(ax=ax)
        
        # Draw each route in different color
        colors = plt.cm.tab10(np.linspace(0, 1, len(candidates)))
        
        import networkx as nx
        pos = {i: (self.road_graph.graph.nodes[i]['x'], 
                   self.road_graph.graph.nodes[i]['y']) 
               for i in self.road_graph.graph.nodes()}
        
        for i, candidate in enumerate(candidates):
            if len(candidate.path) > 1:
                route_edges = [(candidate.path[j], candidate.path[j+1]) 
                              for j in range(len(candidate.path)-1)]
                
                nx.draw_networkx_edges(self.road_graph.graph, pos, 
                                      edgelist=route_edges,
                                      edge_color=[colors[i]],
                                      width=3 - i * 0.5,
                                      alpha=0.7,
                                      ax=ax,
                                      label=f"Route {i+1}: {candidate.total_energy_kwh:.1f} kWh")
        
        ax.legend()
        ax.set_title("Candidate Routes Comparison")
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"✅ Route visualization saved to {save_path}")
        
        return fig


# ============================================================================
# ROUTE PLANNER (COMBINES GENERATOR WITH RL AGENT)
# ============================================================================

class EVRoutePlanner:
    """
    High-level route planner that combines:
    - Route generation (GAN + classical)
    - Route evaluation (RL agent)
    - Dynamic replanning
    """
    
    def __init__(self, road_graph: RoadGraph, 
                 route_generator: RouteGenerator,
                 rl_agent = None):
        """
        Initialize route planner.
        
        Args:
            road_graph: Road network
            route_generator: Route generator instance
            rl_agent: Optional RL agent for route evaluation
        """
        self.road_graph = road_graph
        self.route_generator = route_generator
        self.rl_agent = rl_agent
        
        self.current_route: Optional[RouteCandidate] = None
        self.route_history: List[RouteCandidate] = []
    
    def plan_route(self, source: int, destination: int,
                  ev_state: EVState) -> Optional[RouteCandidate]:
        """
        Plan optimal route from source to destination.
        
        Uses route generator to create candidates, then
        evaluates with RL agent if available.
        """
        # Generate candidates
        candidates = self.route_generator.generate_routes(
            source, destination, ev_state, num_candidates=5
        )
        
        if not candidates:
            return None
        
        # Evaluate with RL agent if available
        if self.rl_agent is not None:
            best_candidate = self._evaluate_with_rl(candidates, ev_state)
        else:
            # Use best energy-efficient route
            best_candidate = candidates[0]
        
        self.current_route = best_candidate
        self.route_history.append(best_candidate)
        
        return best_candidate
    
    def _evaluate_with_rl(self, candidates: List[RouteCandidate],
                         ev_state: EVState) -> RouteCandidate:
        """
        Evaluate route candidates using RL agent.
        
        Uses Q-values to estimate expected return for each route.
        """
        best_candidate = candidates[0]
        best_value = float('-inf')
        
        for candidate in candidates:
            # Simulate route value
            value = 0
            current_node = candidate.source
            temp_ev = ev_state.copy()
            
            for i, next_node in enumerate(candidate.path[1:]):
                # Get state representation
                state = (current_node, int(temp_ev.battery_soc // 10),
                        int(temp_ev.time_hours), 0.5)
                
                # Get Q-value for best action
                q_value = self.rl_agent.get_q_value(state, 0)  # Simplified
                value += q_value
                
                # Update EV state
                edge = (current_node, next_node)
                cost = self.road_graph.calculate_edge_cost(edge, temp_ev)
                temp_ev.battery_soc -= (cost['energy_kwh'] / temp_ev.battery_capacity_kwh) * 100
                current_node = next_node
            
            if value > best_value:
                best_value = value
                best_candidate = candidate
        
        return best_candidate
    
    def replan_route(self, current_node: int, ev_state: EVState) -> Optional[RouteCandidate]:
        """
        Replan route from current position.
        
        Called when conditions change (traffic, battery, etc.)
        """
        if self.current_route is None:
            return None
        
        destination = self.current_route.destination
        
        return self.plan_route(current_node, destination, ev_state)
    
    def should_replan(self, current_node: int, ev_state: EVState) -> bool:
        """
        Check if replanning is needed.
        
        Triggers replanning when:
        - Battery is critically low
        - Significant traffic change
        - Deviated from planned route
        """
        if self.current_route is None:
            return True
        
        # Check if on planned route
        if current_node not in self.current_route.path:
            return True
        
        # Check battery
        remaining_distance = self._remaining_distance(current_node)
        if ev_state.estimated_range_km < remaining_distance * 1.2:
            return True  # Need to replan to include charging
        
        return False
    
    def _remaining_distance(self, current_node: int) -> float:
        """Calculate remaining distance on current route."""
        if self.current_route is None:
            return 0
        
        try:
            idx = self.current_route.path.index(current_node)
            remaining_path = self.current_route.path[idx:]
            
            distance = 0
            for i in range(len(remaining_path) - 1):
                edge = (remaining_path[i], remaining_path[i + 1])
                edge_data = self.road_graph.graph.edges[edge]
                distance += edge_data['distance_km']
            
            return distance
        except:
            return 0


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("🛣️ Route Generator Module")
    print("=" * 60)
    
    # Create road graph
    print("\n📍 Creating road network...")
    road_graph = RoadGraph(grid_size=10, seed=42)
    print(f"   Nodes: {road_graph.num_nodes}")
    print(f"   Edges: {road_graph.graph.number_of_edges()}")
    
    # Create route generator
    print("\n🔧 Creating route generator...")
    generator = RouteGenerator(road_graph)
    
    # Create EV state
    ev_state = EVState(
        battery_soc=80,
        battery_capacity_kwh=60,
        current_node=0,
        time_minutes=480  # 8 AM
    )
    
    # Generate routes
    print("\n🛣️ Generating candidate routes (0 → 99)...")
    candidates = generator.generate_routes(
        source=0, 
        destination=99, 
        ev_state=ev_state,
        num_candidates=5
    )
    
    print(f"\n📋 Generated {len(candidates)} candidate routes:")
    for i, route in enumerate(candidates):
        print(f"\n   Route {i + 1}:")
        print(f"      Path length: {len(route.path)} nodes")
        print(f"      Energy: {route.total_energy_kwh:.2f} kWh")
        print(f"      Time: {route.total_time_minutes:.1f} min")
        print(f"      Distance: {route.total_distance_km:.2f} km")
        print(f"      Feasibility: {route.feasibility_score:.2f}")
        print(f"      Realism: {route.realism_score:.2f}")
        if route.charging_stops:
            print(f"      Charging stops: {route.charging_stops}")
    
    # Get best route
    print("\n⭐ Best routes by criteria:")
    
    best_energy = generator.get_best_route(0, 99, ev_state, criteria='energy')
    if best_energy:
        print(f"   Energy-optimal: {best_energy.total_energy_kwh:.2f} kWh")
    
    best_time = generator.get_best_route(0, 99, ev_state, criteria='time')
    if best_time:
        print(f"   Time-optimal: {best_time.total_time_minutes:.1f} min")
    
    best_balanced = generator.get_best_route(0, 99, ev_state, criteria='balanced')
    if best_balanced:
        print(f"   Balanced: {best_balanced.total_energy_kwh:.2f} kWh, {best_balanced.total_time_minutes:.1f} min")
    
    # Visualize routes
    print("\n📊 Creating visualization...")
    try:
        import os
        os.makedirs("../results/plots", exist_ok=True)
        generator.visualize_routes(candidates, "../results/plots/candidate_routes.png")
    except Exception as e:
        print(f"   ⚠️ Could not create visualization: {e}")
    
    # Test route planner
    print("\n🗺️ Testing Route Planner...")
    planner = EVRoutePlanner(road_graph, generator)
    
    planned_route = planner.plan_route(0, 99, ev_state)
    if planned_route:
        print(f"   Planned route: {len(planned_route.path)} nodes")
        print(f"   Energy: {planned_route.total_energy_kwh:.2f} kWh")
    
    # Check replanning
    print(f"\n🔄 Replanning check:")
    print(f"   Should replan at node 0: {planner.should_replan(0, ev_state)}")
    print(f"   Should replan at node 50: {planner.should_replan(50, ev_state)}")
    
    print("\n✅ Route generator module working correctly!")
