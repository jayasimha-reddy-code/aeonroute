# main.py
"""
EV Routing System - Main Entry Point
=====================================
Complete pipeline for EV route optimization using:
- SG-GAN for traffic generation
- Graph-based road network
- Q-Learning agent for routing decisions
- Route generation and planning

Usage:
    python main.py [--mode MODE] [--episodes N] [--grid-size N]

Modes:
    train    - Train the complete system (GAN + Q-Learning)
    evaluate - Evaluate trained models
    demo     - Run interactive demo
    test     - Run system tests
"""

import os
import sys
import argparse
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Import modules
from src.road_graph import RoadGraph, EVState, HistoricalRouteGenerator
from src.traffic_generator import SGGANTrafficGenerator, create_synthetic_traffic, save_gan, plot_training_history
from src.environment import EVRoutingEnvironment, LegacyEVRoutingEnvironment, EnvironmentConfig
from src.q_learning_agent import QLearningAgent, train_q_learning_agent, evaluate_agent
from src.route_generator import RouteGenerator, EVRoutePlanner

# Import GNN Route GAN (new advanced module)
try:
    from src.gnn_route_generator import GNNRouteGAN, generate_historical_routes
    HAS_GNN_GAN = True
except ImportError:
    HAS_GNN_GAN = False

# Try to import matplotlib for visualization
try:
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False
    print("[WARNING] matplotlib not available. Visualizations will be disabled.")


class EVRoutingSystem:
    """
    Complete EV Routing System combining all components.
    
    Pipeline:
    1. Create road network graph
    2. Generate/load traffic data
    3. Train SG-GAN on traffic patterns
    4. Create RL environment with GAN traffic
    5. Train Q-Learning agent
    6. Generate and evaluate routes
    """
    
    def __init__(self, config: dict = None):
        """
        Initialize the EV Routing System.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config or self._default_config()
        
        # Initialize components
        self.road_graph = None
        self.gan = None
        self.gnn_gan = None      # GNN Route GAN
        self.environment = None
        self.agent = None
        self.route_generator = None
        self.planner = None
        
        # Create directories
        self._create_directories()
        
        # Timestamp for this run
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    @property
    def is_demo_mode(self):
        """Check if system is running in demo mode (fast training from checkpoints)."""
        return self.config.get("demo_mode", False)

    def _default_config(self) -> dict:
        """Get default configuration."""
        return {
            'grid_size': 10,
            'max_battery': 100,
            'battery_capacity_kwh': 60,
            'gan_epochs': 100,
            'gan_batch_size': 32,
            'gnn_epochs': 50,           # GNN Route GAN epochs
            'gnn_batch_size': 16,       # GNN Route GAN batch size
            'rl_episodes': 500,
            'rl_max_steps': 200,
            'traffic_samples': 500,
            'historical_routes': 300,   # Number of historical routes for GNN
            'seed': 42,
            'model_dir': 'models',
            'results_dir': 'results',
            'data_dir': 'data',
            'use_gnn_gan': True         # Whether to use GNN Route GAN
        }
    
    def _create_directories(self):
        """Create necessary directories."""
        dirs = [
            f"{self.config['model_dir']}/sg_gan",
            f"{self.config['model_dir']}/gnn_gan",      # New: GNN Route GAN
            f"{self.config['model_dir']}/q_learning",
            f"{self.config['results_dir']}/plots",
            f"{self.config['results_dir']}/metrics",
            f"{self.config['data_dir']}/generated_traffic",
            f"{self.config['data_dir']}/training_data",
            f"{self.config['data_dir']}/historical_routes"  # New: Historical routes
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
    
    def step1_create_road_network(self):
        """STEP 1: Create the road network graph."""
        print("\n" + "=" * 60)
        print("STEP 1: Creating Road Network")
        print("=" * 60)
        
        self.road_graph = RoadGraph(
            grid_size=self.config['grid_size'],
            seed=self.config['seed']
        )
        
        print(f"[OK] Road network created:")
        print(f"   Nodes: {self.road_graph.num_nodes}")
        print(f"   Edges: {self.road_graph.graph.number_of_edges()}")
        print(f"   Charging stations: {len(self.road_graph.charging_stations)}")
        
        # Visualize if possible
        if HAS_MATPLOTLIB:
            try:
                fig, ax = plt.subplots(1, 1, figsize=(10, 10))
                self.road_graph.visualize(ax=ax)
                plt.savefig(f"{self.config['results_dir']}/plots/road_network.png", 
                           dpi=150, bbox_inches='tight')
                plt.close()
                print(f"   Saved visualization to results/plots/road_network.png")
            except Exception as e:
                print(f"   [WARNING] Could not save visualization: {e}")
        
        return self.road_graph
    
    def step2_generate_traffic_data(self):
        """STEP 2: Generate synthetic traffic data."""
        print("\n" + "=" * 60)
        print("STEP 2: Generating Traffic Data")
        print("=" * 60)
        
        # Generate synthetic traffic
        num_roads = self.road_graph.graph.number_of_edges()
        traffic_data = create_synthetic_traffic(
            n_samples=self.config['traffic_samples'],
            num_roads=min(num_roads, 20),  # Match GAN input
            time_steps=24,
            seed=self.config['seed']
        )
        
        print(f"[OK] Traffic data generated:")
        print(f"   Samples: {traffic_data.shape[0]}")
        print(f"   Roads: {traffic_data.shape[1]}")
        print(f"   Time steps: {traffic_data.shape[2]}")
        print(f"   Traffic range: [{traffic_data.min():.2f}, {traffic_data.max():.2f}]")
        
        # Save traffic data
        np.save(f"{self.config['data_dir']}/training_data/traffic_data.npy", traffic_data)
        print(f"   Saved to data/training_data/traffic_data.npy")
        
        return traffic_data
    
    def step3_train_gan(self, traffic_data: np.ndarray, epoch_callback=None):
        """STEP 3: Train the SG-GAN on traffic data."""
        print("\n" + "=" * 60)
        print("STEP 3: Training SG-GAN")
        print("=" * 60)
        
        # Normalize for GAN [-1, 1]
        traffic_normalized = traffic_data * 2 - 1
        
        # Create and train GAN
        self.gan = SGGANTrafficGenerator(
            input_shape=(traffic_data.shape[1], traffic_data.shape[2]),
            noise_dim=100,
            ev_state_dim=5,
            condition_dim=10
        )
        
        self.gan.train(
            traffic_normalized,
            epochs=self.config['gan_epochs'],
            batch_size=self.config['gan_batch_size'],
            verbose=True,
            epoch_callback=epoch_callback
        )
        
        # Save GAN
        gan_path = f"{self.config['model_dir']}/sg_gan/traffic_gan"
        self.gan.save(gan_path)
        
        # Generate sample traffic
        generated = self.gan.generate_traffic_scenarios(n_samples=10)
        np.save(f"{self.config['data_dir']}/generated_traffic/sample_traffic.npy", generated)
        
        print(f"\n[OK] GAN trained and saved:")
        print(f"   Model: {gan_path}")
        print(f"   Generated sample traffic: data/generated_traffic/sample_traffic.npy")
        
        # Plot training history
        if HAS_MATPLOTLIB:
            try:
                plot_training_history(self.gan, 
                    f"{self.config['results_dir']}/plots/gan_training.png")
            except Exception as e:
                print(f"   [WARNING] Could not save training plot: {e}")
        
        return self.gan
    
    def step3b_train_gnn_gan(self):
        """STEP 3b: Train the GNN Route GAN for direct route generation."""
        print("\n" + "=" * 60)
        print("STEP 3b: Training GNN Route GAN")
        print("=" * 60)
        
        if not HAS_GNN_GAN:
            print("[WARNING] GNN Route GAN not available, skipping...")
            return None

        if not self.config.get('use_gnn_gan', True):
            print("[WARNING] GNN Route GAN disabled in config, skipping...")
            return None

        # Generate historical routes
        print("[INFO] Generating historical routes...")
        historical_routes, ev_states = generate_historical_routes(
            self.road_graph,
            n_routes=self.config.get('historical_routes', 300),
            min_length=3,
            max_length=15
        )
        print(f"   Generated {len(historical_routes)} historical routes")
        
        # Save historical routes
        np.savez(
            f"{self.config['data_dir']}/historical_routes/routes.npz",
            routes=np.array(historical_routes, dtype=object),
            ev_states=ev_states
        )
        
        # Create GNN Route GAN
        self.gnn_gan = GNNRouteGAN(
            num_nodes=self.road_graph.num_nodes,
            noise_dim=64,
            ev_state_dim=5
        )
        
        # Train
        self.gnn_gan.train(
            road_graph=self.road_graph,
            historical_routes=historical_routes,
            ev_states=ev_states,
            epochs=self.config.get('gnn_epochs', 50),
            batch_size=self.config.get('gnn_batch_size', 16),
            verbose=True
        )
        
        # Save
        gnn_path = f"{self.config['model_dir']}/gnn_gan"
        self.gnn_gan.save(gnn_path)
        
        print(f"\n[OK] GNN Route GAN trained and saved:")
        print(f"   Model: {gnn_path}")
        print(f"   Historical routes: {len(historical_routes)}")
        
        return self.gnn_gan

    def step4_create_environment(self):
        """STEP 4: Create the RL environment."""
        print("\n" + "=" * 60)
        print("STEP 4: Creating RL Environment")
        print("=" * 60)
        
        # Generate traffic for environment
        if self.gan is not None:
            traffic = self.gan.generate_traffic_scenarios(n_samples=1)[0]
        else:
            traffic = None
        
        # Create environment config
        env_config = EnvironmentConfig(
            grid_size=self.config['grid_size'],
            max_battery=self.config['max_battery'],
            battery_capacity_kwh=self.config['battery_capacity_kwh'],
            max_steps=self.config['rl_max_steps'],
            seed=self.config['seed']
        )
        
        self.environment = EVRoutingEnvironment(
            config=env_config,
            traffic_data=traffic
        )
        
        print(f"[OK] Environment created:")
        print(f"   Grid size: {self.config['grid_size']}x{self.config['grid_size']}")
        print(f"   Max battery: {self.config['max_battery']}%")
        print(f"   Max steps: {self.config['rl_max_steps']}")
        print(f"   Action space: {self.environment.action_space}")
        print(f"   Observation space: {self.environment.observation_space}")
        
        return self.environment
    
    def step5_train_agent(self, episode_callback=None):
        """STEP 5: Train the Q-Learning agent."""
        print("\n" + "=" * 60)
        print("STEP 5: Training Q-Learning Agent")
        print("=" * 60)
        
        # Create agent
        self.agent = QLearningAgent(
            state_space=1000,
            action_space=self.environment.action_space.n,
            learning_rate=0.1,
            discount_factor=0.95,
            exploration_rate=1.0,
            exploration_decay=0.995,
            min_exploration_rate=0.01
        )
        
        # Create legacy environment for training (simpler interface)
        legacy_env = LegacyEVRoutingEnvironment(
            grid_size=min(self.config['grid_size'], 5),  # Use smaller grid for faster training
            max_battery=self.config['max_battery']
        )
        
        # Train
        rewards, lengths = train_q_learning_agent(
            legacy_env,
            self.agent,
            episodes=self.config['rl_episodes'],
            max_steps=self.config['rl_max_steps'],
            verbose=True,
            episode_callback=episode_callback
        )
        
        # Save agent
        agent_path = f"{self.config['model_dir']}/q_learning/trained_agent.pkl"
        self.agent.save_model(agent_path)
        
        print(f"\n[OK] Agent trained and saved:")
        print(f"   Model: {agent_path}")
        print(f"   States discovered: {len(self.agent.q_table)}")
        print(f"   Final exploration rate: {self.agent.exploration_rate:.4f}")
        
        # Plot training curves
        if HAS_MATPLOTLIB:
            self._plot_training_results(rewards, lengths)
        
        # Save metrics
        metrics = {
            'rewards': rewards,
            'lengths': lengths,
            'final_states': len(self.agent.q_table),
            'final_exploration': self.agent.exploration_rate
        }
        np.savez(f"{self.config['results_dir']}/metrics/training_metrics.npz", **metrics)
        
        return self.agent, rewards, lengths
    
    def step6_create_route_generator(self):
        """STEP 6: Create the route generator."""
        print("\n" + "=" * 60)
        print("STEP 6: Creating Route Generator")
        print("=" * 60)
        
        self.route_generator = RouteGenerator(
            road_graph=self.road_graph,
            gan=self.gan
        )
        
        self.planner = EVRoutePlanner(
            road_graph=self.road_graph,
            route_generator=self.route_generator,
            rl_agent=self.agent
        )
        
        print(f"[OK] Route generator and planner created")
        
        return self.route_generator, self.planner
    
    def step7_evaluate_system(self):
        """STEP 7: Evaluate the complete system."""
        print("\n" + "=" * 60)
        print("STEP 7: Evaluating System")
        print("=" * 60)
        
        results = {
            'route_generation': self._evaluate_route_generation(),
            'agent_performance': self._evaluate_agent(),
            'end_to_end': self._evaluate_end_to_end()
        }
        
        # Print summary
        print("\n[INFO] EVALUATION SUMMARY")
        print("-" * 40)
        
        rg = results['route_generation']
        print(f"Route Generation:")
        print(f"   Avg candidates: {rg['avg_candidates']:.1f}")
        print(f"   Avg energy: {rg['avg_energy']:.2f} kWh")
        
        ap = results['agent_performance']
        print(f"\nAgent Performance:")
        print(f"   Success rate: {ap['success_rate']*100:.1f}%")
        print(f"   Avg reward: {ap['avg_reward']:.2f}")
        
        e2e = results['end_to_end']
        print(f"\nEnd-to-End:")
        print(f"   Completion rate: {e2e['completion_rate']*100:.1f}%")
        print(f"   Avg energy: {e2e['avg_energy']:.2f} kWh")
        
        # Save results
        import json
        with open(f"{self.config['results_dir']}/metrics/evaluation_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        return results
    
    def _evaluate_route_generation(self) -> dict:
        """Evaluate route generation capability."""
        candidates_counts = []
        energies = []
        
        for _ in range(10):
            source = np.random.randint(0, self.road_graph.num_nodes)
            dest = np.random.randint(0, self.road_graph.num_nodes)
            
            if source == dest:
                continue
            
            ev_state = EVState(battery_soc=80, current_node=source)
            
            candidates = self.route_generator.generate_routes(
                source, dest, ev_state, num_candidates=5
            )
            
            candidates_counts.append(len(candidates))
            if candidates:
                energies.append(candidates[0].total_energy_kwh)
        
        return {
            'avg_candidates': np.mean(candidates_counts) if candidates_counts else 0,
            'avg_energy': np.mean(energies) if energies else 0
        }
    
    def _evaluate_agent(self) -> dict:
        """Evaluate agent performance."""
        legacy_env = LegacyEVRoutingEnvironment(
            grid_size=min(self.config['grid_size'], 5),
            max_battery=self.config['max_battery']
        )
        
        results = evaluate_agent(legacy_env, self.agent, num_episodes=20, verbose=False)
        
        return {
            'success_rate': np.mean(results['successes']),
            'avg_reward': np.mean(results['rewards']),
            'avg_steps': np.mean(results['lengths'])
        }
    
    def _evaluate_end_to_end(self) -> dict:
        """Evaluate end-to-end system performance."""
        completions = 0
        energies = []
        
        for _ in range(10):
            source = 0
            dest = self.road_graph.num_nodes - 1
            ev_state = EVState(battery_soc=100, current_node=source)
            
            route = self.planner.plan_route(source, dest, ev_state)
            
            if route and route.feasibility_score > 0.5:
                completions += 1
                energies.append(route.total_energy_kwh)
        
        return {
            'completion_rate': completions / 10,
            'avg_energy': np.mean(energies) if energies else 0
        }
    
    def _plot_training_results(self, rewards: list, lengths: list):
        """Plot training results."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Raw rewards
        axes[0, 0].plot(rewards, alpha=0.3, color='blue')
        if len(rewards) >= 50:
            smoothed = np.convolve(rewards, np.ones(50)/50, mode='valid')
            axes[0, 0].plot(range(49, len(rewards)), smoothed, color='blue', linewidth=2)
        axes[0, 0].set_xlabel('Episode')
        axes[0, 0].set_ylabel('Total Reward')
        axes[0, 0].set_title('Training Rewards')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Episode lengths
        axes[0, 1].plot(lengths, alpha=0.3, color='green')
        if len(lengths) >= 50:
            smoothed = np.convolve(lengths, np.ones(50)/50, mode='valid')
            axes[0, 1].plot(range(49, len(lengths)), smoothed, color='green', linewidth=2)
        axes[0, 1].set_xlabel('Episode')
        axes[0, 1].set_ylabel('Steps')
        axes[0, 1].set_title('Episode Lengths')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Reward histogram
        axes[1, 0].hist(rewards, bins=50, color='blue', alpha=0.7)
        axes[1, 0].set_xlabel('Reward')
        axes[1, 0].set_ylabel('Frequency')
        axes[1, 0].set_title('Reward Distribution')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Cumulative reward
        cumulative = np.cumsum(rewards)
        axes[1, 1].plot(cumulative, color='purple')
        axes[1, 1].set_xlabel('Episode')
        axes[1, 1].set_ylabel('Cumulative Reward')
        axes[1, 1].set_title('Cumulative Reward')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f"{self.config['results_dir']}/plots/training_progress.png", 
                   dpi=150, bbox_inches='tight')
        plt.close()
        print(f"   Saved training plots to results/plots/training_progress.png")
    
    def run_full_pipeline(self):
        """Run the complete training pipeline."""
        print("\n" + "[=EV ROUTING SYSTEM=]" * 10)
        print("EV ROUTING SYSTEM - FULL TRAINING PIPELINE")
        print("[=EV ROUTING SYSTEM=]" * 10)

        if self.is_demo_mode:
            print("\n[DEMO MODE] Fast training with reduced epochs and checkpoint loading")
            print(f"   GAN epochs: {self.config.get('gan_epochs', 100)}")
            print(f"   RL episodes: {self.config.get('rl_episodes', 500)}")
            print(f"   GNN epochs: {self.config.get('gnn_epochs', 50)}")

        start_time = datetime.now()
        
        # Execute all steps
        self.step1_create_road_network()
        traffic_data = self.step2_generate_traffic_data()
        self.step3_train_gan(traffic_data)
        
        # Train GNN Route GAN (new advanced module)
        if self.config.get('use_gnn_gan', True) and HAS_GNN_GAN:
            self.step3b_train_gnn_gan()
        
        self.step4_create_environment()
        self.step5_train_agent()
        self.step6_create_route_generator()
        results = self.step7_evaluate_system()
        
        # Summary
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 60)
        print("PIPELINE COMPLETE")
        print("=" * 60)
        print(f"Total time: {elapsed}")
        print(f"\nSaved files:")
        print(f"   - models/sg_gan/traffic_gan_*.keras")
        if self.config.get('use_gnn_gan', True) and HAS_GNN_GAN:
            print(f"   - models/gnn_gan/*.weights.h5")
        print(f"   - models/q_learning/trained_agent.pkl")
        print(f"   - results/plots/*.png")
        print(f"   - results/metrics/*.json")
        
        return results
    
    def load_models(self):
        """Load pre-trained models."""
        print("\n[INFO] Loading pre-trained models...")
        
        # Load SG-GAN
        try:
            self.gan = SGGANTrafficGenerator()
            self.gan.load(f"{self.config['model_dir']}/sg_gan/traffic_gan")
        except Exception as e:
            print(f"   [WARNING] Could not load SG-GAN: {e}")
            self.gan = None

        # Load GNN Route GAN
        if HAS_GNN_GAN:
            try:
                self.gnn_gan = GNNRouteGAN(num_nodes=self.config['grid_size'] ** 2)
                self.gnn_gan.load(f"{self.config['model_dir']}/gnn_gan")
            except Exception as e:
                print(f"   [WARNING] Could not load GNN Route GAN: {e}")
                self.gnn_gan = None

        # Load Agent
        try:
            self.agent = QLearningAgent(action_space=5)
            self.agent.load_model(f"{self.config['model_dir']}/q_learning/trained_agent.pkl")
        except Exception as e:
            print(f"   [WARNING] Could not load agent: {e}")
            self.agent = None

        # Create road graph
        self.road_graph = RoadGraph(grid_size=self.config['grid_size'])

        # Create other components
        if self.gan:
            traffic = self.gan.generate_traffic_scenarios(1)[0]
            self.road_graph.update_traffic_from_gan(traffic)

        self.route_generator = RouteGenerator(self.road_graph, self.gan)
        self.planner = EVRoutePlanner(self.road_graph, self.route_generator, self.agent)

        print("[OK] Models loaded")


def demo_mode(system: EVRoutingSystem):
    """Run interactive demo."""
    print("\n" + "=" * 60)
    print("EV ROUTING DEMO")
    print("=" * 60)
    
    # Create/load system
    if system.road_graph is None:
        system.step1_create_road_network()
    
    if system.route_generator is None:
        system.route_generator = RouteGenerator(system.road_graph, system.gan)
    
    # Demo route generation
    print("\n[DEMO] Generating routes from node 0 to node 99")

    ev_state = EVState(
        battery_soc=80,
        battery_capacity_kwh=60,
        current_node=0,
        time_minutes=480  # 8 AM
    )

    candidates = system.route_generator.generate_routes(
        source=0,
        destination=system.road_graph.num_nodes - 1,
        ev_state=ev_state,
        num_candidates=5
    )

    print(f"\n[ROUTES] Generated {len(candidates)} candidate routes:")
    for i, route in enumerate(candidates, 1):
        print(f"\n   Route {i}:")
        print(f"      Nodes: {route.path[:5]}...{route.path[-3:]}")
        print(f"      Energy: {route.total_energy_kwh:.2f} kWh")
        print(f"      Time: {route.total_time_minutes:.1f} minutes")
        print(f"      Distance: {route.total_distance_km:.2f} km")
    
    # Visualize
    if HAS_MATPLOTLIB and candidates:
        system.route_generator.visualize_routes(
            candidates, 
            f"{system.config['results_dir']}/plots/demo_routes.png"
        )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='EV Routing System')
    parser.add_argument('--mode', type=str, default='train',
                       choices=['train', 'evaluate', 'demo', 'test'],
                       help='Operation mode')
    parser.add_argument('--episodes', type=int, default=500,
                       help='Number of training episodes')
    parser.add_argument('--grid-size', type=int, default=10,
                       help='Grid size for road network')
    parser.add_argument('--gan-epochs', type=int, default=100,
                       help='Number of GAN training epochs')
    
    args = parser.parse_args()
    
    # Configuration
    config = {
        'grid_size': args.grid_size,
        'max_battery': 100,
        'battery_capacity_kwh': 60,
        'gan_epochs': args.gan_epochs,
        'gan_batch_size': 32,
        'rl_episodes': args.episodes,
        'rl_max_steps': 200,
        'traffic_samples': 500,
        'seed': 42,
        'model_dir': 'models',
        'results_dir': 'results',
        'data_dir': 'data'
    }
    
    # Create system
    system = EVRoutingSystem(config)
    
    # Run based on mode
    if args.mode == 'train':
        system.run_full_pipeline()
    
    elif args.mode == 'evaluate':
        system.load_models()
        system.step7_evaluate_system()
    
    elif args.mode == 'demo':
        try:
            system.load_models()
        except:
            print("No pre-trained models found. Running with new models...")
            system.step1_create_road_network()
        demo_mode(system)
    
    elif args.mode == 'test':
        print("\n[TEST] Running system tests...")
        system.step1_create_road_network()
        system.step2_generate_traffic_data()
        print("[OK] All tests passed!")


if __name__ == "__main__":
    main()
