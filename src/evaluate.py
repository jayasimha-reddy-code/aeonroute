# evaluate.py
"""
EV Routing System - Evaluation Module
======================================
Comprehensive evaluation and analysis of the trained EV routing system.

Evaluates:
- Q-Learning agent performance
- SG-GAN traffic generation quality
- Route generation effectiveness
- End-to-end system performance
"""

import os
import sys
import numpy as np
import json
from datetime import datetime
from typing import Dict, List, Optional

from src.road_graph import RoadGraph, EVState
from src.traffic_generator import SGGANTrafficGenerator, create_synthetic_traffic
from src.environment import EVRoutingEnvironment, LegacyEVRoutingEnvironment
from src.q_learning_agent import QLearningAgent, evaluate_agent
from src.route_generator import RouteGenerator, EVRoutePlanner

# Try matplotlib
try:
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


class SystemEvaluator:
    """
    Comprehensive system evaluator for the EV Routing System.
    """
    
    def __init__(self, model_dir: str = 'models', results_dir: str = 'results'):
        """
        Initialize evaluator.
        
        Args:
            model_dir: Directory containing trained models
            results_dir: Directory for evaluation results
        """
        self.model_dir = model_dir
        self.results_dir = results_dir
        
        # Components (loaded on demand)
        self.road_graph: Optional[RoadGraph] = None
        self.gan: Optional[SGGANTrafficGenerator] = None
        self.agent: Optional[QLearningAgent] = None
        self.route_generator: Optional[RouteGenerator] = None
        
        # Create results directories
        os.makedirs(f"{results_dir}/plots", exist_ok=True)
        os.makedirs(f"{results_dir}/metrics", exist_ok=True)
    
    def load_models(self, grid_size: int = 10):
        """Load all trained models."""
        print("📦 Loading models...")
        
        # Create road graph
        self.road_graph = RoadGraph(grid_size=grid_size)
        print(f"   ✅ Road graph created: {self.road_graph.num_nodes} nodes")
        
        # Load GAN
        try:
            self.gan = SGGANTrafficGenerator()
            self.gan.load(f"{self.model_dir}/sg_gan/traffic_gan")
            print("   ✅ SG-GAN loaded")
        except Exception as e:
            print(f"   ⚠️ Could not load GAN: {e}")
            self.gan = None
        
        # Load Agent
        try:
            self.agent = QLearningAgent(action_space=5)
            self.agent.load_model(f"{self.model_dir}/q_learning/trained_agent.pkl")
            print(f"   ✅ Q-Learning agent loaded: {len(self.agent.q_table)} states")
        except Exception as e:
            print(f"   ⚠️ Could not load agent: {e}")
            self.agent = None
        
        # Create route generator
        self.route_generator = RouteGenerator(self.road_graph, self.gan)
        print("   ✅ Route generator created")
    
    def evaluate_gan(self, num_samples: int = 100) -> Dict:
        """
        Evaluate SG-GAN traffic generation quality.
        
        Metrics:
        - Traffic distribution statistics
        - Temporal pattern validity
        - Comparison with real traffic
        """
        print("\n" + "=" * 60)
        print("EVALUATING SG-GAN")
        print("=" * 60)
        
        if self.gan is None:
            print("❌ GAN not loaded")
            return {}
        
        # Generate samples
        generated = self.gan.generate_traffic_scenarios(n_samples=num_samples)
        
        # Generate real traffic for comparison
        real = create_synthetic_traffic(n_samples=num_samples)
        
        results = {}
        
        # Distribution statistics
        results['generated_mean'] = float(np.mean(generated))
        results['generated_std'] = float(np.std(generated))
        results['generated_min'] = float(np.min(generated))
        results['generated_max'] = float(np.max(generated))
        
        results['real_mean'] = float(np.mean(real))
        results['real_std'] = float(np.std(real))
        
        # Temporal pattern analysis
        gen_hourly = np.mean(generated, axis=(0, 1))  # Average by hour
        real_hourly = np.mean(real, axis=(0, 1))
        
        results['hourly_correlation'] = float(np.corrcoef(gen_hourly, real_hourly)[0, 1])
        
        # Peak hour detection
        gen_morning_peak = np.mean(generated[:, :, 7:10])
        gen_evening_peak = np.mean(generated[:, :, 17:20])
        gen_night = np.mean(generated[:, :, 0:6])
        
        results['morning_peak_ratio'] = float(gen_morning_peak / results['generated_mean'])
        results['evening_peak_ratio'] = float(gen_evening_peak / results['generated_mean'])
        results['night_ratio'] = float(gen_night / results['generated_mean'])
        
        print(f"\n📊 GAN Evaluation Results:")
        print(f"   Generated traffic mean: {results['generated_mean']:.3f}")
        print(f"   Generated traffic std: {results['generated_std']:.3f}")
        print(f"   Hourly correlation with real: {results['hourly_correlation']:.3f}")
        print(f"   Morning peak ratio: {results['morning_peak_ratio']:.2f}x")
        print(f"   Evening peak ratio: {results['evening_peak_ratio']:.2f}x")
        print(f"   Night ratio: {results['night_ratio']:.2f}x")
        
        # Visualize
        if HAS_MATPLOTLIB:
            self._plot_gan_evaluation(generated, real, gen_hourly, real_hourly)
        
        return results
    
    def evaluate_agent(self, num_episodes: int = 50) -> Dict:
        """
        Evaluate Q-Learning agent performance.
        
        Metrics:
        - Success rate
        - Average reward
        - Energy efficiency
        - Path optimality
        """
        print("\n" + "=" * 60)
        print("EVALUATING Q-LEARNING AGENT")
        print("=" * 60)
        
        if self.agent is None:
            print("❌ Agent not loaded")
            return {}
        
        # Create environment
        env = LegacyEVRoutingEnvironment(grid_size=5, max_battery=100)
        
        # Evaluate
        eval_results = evaluate_agent(env, self.agent, num_episodes=num_episodes, verbose=False)
        
        results = {
            'success_rate': float(np.mean(eval_results['successes'])),
            'avg_reward': float(np.mean(eval_results['rewards'])),
            'std_reward': float(np.std(eval_results['rewards'])),
            'avg_steps': float(np.mean(eval_results['lengths'])),
            'avg_energy': float(np.mean(eval_results['energies'])) if eval_results['energies'] else 0,
            'num_states': len(self.agent.q_table),
            'exploration_rate': self.agent.exploration_rate
        }
        
        # Analyze successful routes
        successful_rewards = [r for r, s in zip(eval_results['rewards'], eval_results['successes']) if s]
        if successful_rewards:
            results['avg_success_reward'] = float(np.mean(successful_rewards))
        
        print(f"\n📊 Agent Evaluation Results:")
        print(f"   Success rate: {results['success_rate']*100:.1f}%")
        print(f"   Average reward: {results['avg_reward']:.2f} ± {results['std_reward']:.2f}")
        print(f"   Average steps: {results['avg_steps']:.1f}")
        print(f"   Q-table size: {results['num_states']} states")
        
        # Visualize
        if HAS_MATPLOTLIB:
            self._plot_agent_evaluation(eval_results)
        
        return results
    
    def evaluate_route_generation(self, num_tests: int = 20) -> Dict:
        """
        Evaluate route generation quality.
        
        Metrics:
        - Route diversity
        - Energy efficiency
        - Feasibility rate
        - Comparison with shortest path
        """
        print("\n" + "=" * 60)
        print("EVALUATING ROUTE GENERATION")
        print("=" * 60)
        
        if self.route_generator is None:
            print("❌ Route generator not available")
            return {}
        
        energy_ratios = []  # vs shortest path
        feasibility_rates = []
        candidates_per_query = []
        
        for _ in range(num_tests):
            # Random source and destination
            source = np.random.randint(0, self.road_graph.num_nodes)
            dest = np.random.randint(0, self.road_graph.num_nodes)
            
            if source == dest:
                continue
            
            ev_state = EVState(
                battery_soc=np.random.uniform(50, 100),
                current_node=source
            )
            
            # Generate routes
            candidates = self.route_generator.generate_routes(
                source, dest, ev_state, num_candidates=5
            )
            
            if not candidates:
                continue
            
            candidates_per_query.append(len(candidates))
            
            # Analyze candidates
            feasible = sum(1 for c in candidates if c.feasibility_score > 0.5)
            feasibility_rates.append(feasible / len(candidates))
            
            # Compare with shortest path
            best_energy = candidates[0].total_energy_kwh
            shortest = self.route_generator._shortest_path_route(source, dest, ev_state)
            
            if shortest and shortest.total_energy_kwh > 0:
                energy_ratios.append(best_energy / shortest.total_energy_kwh)
        
        results = {
            'avg_candidates': float(np.mean(candidates_per_query)) if candidates_per_query else 0,
            'avg_feasibility_rate': float(np.mean(feasibility_rates)) if feasibility_rates else 0,
            'avg_energy_ratio': float(np.mean(energy_ratios)) if energy_ratios else 0,
            'energy_improvement': float(1 - np.mean(energy_ratios)) if energy_ratios else 0
        }
        
        print(f"\n📊 Route Generation Results:")
        print(f"   Average candidates per query: {results['avg_candidates']:.1f}")
        print(f"   Average feasibility rate: {results['avg_feasibility_rate']*100:.1f}%")
        print(f"   Energy vs shortest path: {results['avg_energy_ratio']:.2f}x")
        print(f"   Energy improvement: {results['energy_improvement']*100:.1f}%")
        
        return results
    
    def evaluate_end_to_end(self, num_scenarios: int = 20) -> Dict:
        """
        Evaluate complete end-to-end system performance.
        
        Simulates real-world usage scenarios.
        """
        print("\n" + "=" * 60)
        print("EVALUATING END-TO-END SYSTEM")
        print("=" * 60)
        
        results = {
            'scenario_completions': 0,
            'total_scenarios': num_scenarios,
            'energies': [],
            'times': [],
            'distances': [],
            'charging_needed': 0
        }
        
        planner = EVRoutePlanner(self.road_graph, self.route_generator, self.agent)
        
        for i in range(num_scenarios):
            # Create scenario
            source = np.random.randint(0, self.road_graph.num_nodes)
            dest = np.random.randint(0, self.road_graph.num_nodes)
            
            if source == dest:
                continue
            
            initial_soc = np.random.uniform(30, 100)
            ev_state = EVState(
                battery_soc=initial_soc,
                battery_capacity_kwh=60,
                current_node=source,
                time_minutes=np.random.randint(0, 1440)
            )
            
            # Plan route
            route = planner.plan_route(source, dest, ev_state)
            
            if route is None:
                continue
            
            # Check if route is feasible
            if route.feasibility_score > 0.5:
                results['scenario_completions'] += 1
                results['energies'].append(route.total_energy_kwh)
                results['times'].append(route.total_time_minutes)
                results['distances'].append(route.total_distance_km)
                
                if route.charging_stops:
                    results['charging_needed'] += 1
        
        # Calculate statistics
        results['completion_rate'] = results['scenario_completions'] / max(num_scenarios, 1)
        results['avg_energy'] = float(np.mean(results['energies'])) if results['energies'] else 0
        results['avg_time'] = float(np.mean(results['times'])) if results['times'] else 0
        results['avg_distance'] = float(np.mean(results['distances'])) if results['distances'] else 0
        results['charging_rate'] = results['charging_needed'] / max(results['scenario_completions'], 1)
        
        print(f"\n📊 End-to-End Evaluation Results:")
        print(f"   Scenario completion rate: {results['completion_rate']*100:.1f}%")
        print(f"   Average energy per trip: {results['avg_energy']:.2f} kWh")
        print(f"   Average time per trip: {results['avg_time']:.1f} minutes")
        print(f"   Average distance per trip: {results['avg_distance']:.2f} km")
        print(f"   Trips needing charging: {results['charging_rate']*100:.1f}%")
        
        return results
    
    def run_full_evaluation(self) -> Dict:
        """Run complete evaluation suite."""
        print("\n" + "🔍" * 20)
        print("FULL SYSTEM EVALUATION")
        print("🔍" * 20)
        
        all_results = {}
        
        # Evaluate each component
        all_results['gan'] = self.evaluate_gan(num_samples=100)
        all_results['agent'] = self.evaluate_agent(num_episodes=50)
        all_results['routing'] = self.evaluate_route_generation(num_tests=20)
        all_results['end_to_end'] = self.evaluate_end_to_end(num_scenarios=20)
        
        # Overall summary
        print("\n" + "=" * 60)
        print("EVALUATION SUMMARY")
        print("=" * 60)
        
        print("\n📊 Component Scores:")
        
        # GAN score
        if all_results['gan']:
            gan_score = all_results['gan'].get('hourly_correlation', 0)
            print(f"   SG-GAN: {'✅' if gan_score > 0.7 else '⚠️'} Correlation = {gan_score:.2f}")
        
        # Agent score
        if all_results['agent']:
            agent_score = all_results['agent'].get('success_rate', 0)
            print(f"   Q-Learning: {'✅' if agent_score > 0.6 else '⚠️'} Success = {agent_score*100:.1f}%")
        
        # Routing score
        if all_results['routing']:
            routing_score = all_results['routing'].get('avg_feasibility_rate', 0)
            print(f"   Route Gen: {'✅' if routing_score > 0.7 else '⚠️'} Feasibility = {routing_score*100:.1f}%")
        
        # E2E score
        if all_results['end_to_end']:
            e2e_score = all_results['end_to_end'].get('completion_rate', 0)
            print(f"   End-to-End: {'✅' if e2e_score > 0.7 else '⚠️'} Completion = {e2e_score*100:.1f}%")
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(f"{self.results_dir}/metrics/evaluation_{timestamp}.json", 'w') as f:
            json.dump(all_results, f, indent=2, default=str)
        print(f"\n💾 Results saved to {self.results_dir}/metrics/evaluation_{timestamp}.json")
        
        return all_results
    
    def _plot_gan_evaluation(self, generated, real, gen_hourly, real_hourly):
        """Create GAN evaluation plots."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Traffic distribution comparison
        axes[0, 0].hist(generated.flatten(), bins=50, alpha=0.5, label='Generated', density=True)
        axes[0, 0].hist(real.flatten(), bins=50, alpha=0.5, label='Real', density=True)
        axes[0, 0].set_xlabel('Traffic Level')
        axes[0, 0].set_ylabel('Density')
        axes[0, 0].set_title('Traffic Distribution')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # Hourly patterns
        axes[0, 1].plot(range(24), gen_hourly, 'b-', linewidth=2, label='Generated')
        axes[0, 1].plot(range(24), real_hourly, 'r--', linewidth=2, label='Real')
        axes[0, 1].set_xlabel('Hour of Day')
        axes[0, 1].set_ylabel('Average Traffic')
        axes[0, 1].set_title('Hourly Traffic Patterns')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        axes[0, 1].set_xticks(range(0, 24, 3))
        
        # Sample heatmap (generated)
        axes[1, 0].imshow(generated[0], aspect='auto', cmap='YlOrRd')
        axes[1, 0].set_xlabel('Hour')
        axes[1, 0].set_ylabel('Road')
        axes[1, 0].set_title('Sample Generated Traffic')
        axes[1, 0].set_xticks(range(0, 24, 4))
        
        # Sample heatmap (real)
        axes[1, 1].imshow(real[0], aspect='auto', cmap='YlOrRd')
        axes[1, 1].set_xlabel('Hour')
        axes[1, 1].set_ylabel('Road')
        axes[1, 1].set_title('Sample Real Traffic')
        axes[1, 1].set_xticks(range(0, 24, 4))
        
        plt.tight_layout()
        plt.savefig(f"{self.results_dir}/plots/gan_evaluation.png", dpi=150, bbox_inches='tight')
        plt.close()
        print(f"   Saved GAN evaluation plot")
    
    def _plot_agent_evaluation(self, results):
        """Create agent evaluation plots."""
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Reward distribution
        axes[0].hist(results['rewards'], bins=30, color='blue', alpha=0.7)
        axes[0].axvline(np.mean(results['rewards']), color='red', linestyle='--', 
                       label=f"Mean: {np.mean(results['rewards']):.1f}")
        axes[0].set_xlabel('Episode Reward')
        axes[0].set_ylabel('Frequency')
        axes[0].set_title('Reward Distribution')
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)
        
        # Episode lengths
        axes[1].hist(results['lengths'], bins=20, color='green', alpha=0.7)
        axes[1].set_xlabel('Episode Length')
        axes[1].set_ylabel('Frequency')
        axes[1].set_title('Episode Length Distribution')
        axes[1].grid(True, alpha=0.3)
        
        # Success/Failure pie
        success_count = sum(results['successes'])
        fail_count = len(results['successes']) - success_count
        axes[2].pie([success_count, fail_count], 
                   labels=['Success', 'Failure'],
                   colors=['green', 'red'],
                   autopct='%1.1f%%',
                   startangle=90)
        axes[2].set_title('Success Rate')
        
        plt.tight_layout()
        plt.savefig(f"{self.results_dir}/plots/agent_evaluation.png", dpi=150, bbox_inches='tight')
        plt.close()
        print(f"   Saved agent evaluation plot")


# ============================================================================
# STANDALONE EVALUATION FUNCTIONS
# ============================================================================

def quick_evaluate():
    """Quick evaluation without loading full system."""
    print("🔍 Quick System Evaluation")
    print("=" * 60)
    
    # Check what files exist
    print("\n📁 Checking saved models...")
    
    model_files = {
        'GAN Generator': 'models/sg_gan/traffic_gan_generator.keras',
        'GAN Discriminator': 'models/sg_gan/traffic_gan_discriminator.keras',
        'Q-Learning Agent': 'models/q_learning/trained_agent.pkl'
    }
    
    for name, path in model_files.items():
        exists = os.path.exists(path)
        print(f"   {name}: {'✅' if exists else '❌'} {path}")
    
    # Check results
    print("\n📊 Checking results...")
    result_files = {
        'Training Metrics': 'results/metrics/training_metrics.npz',
        'Training Plot': 'results/plots/training_progress.png',
        'Road Network': 'results/plots/road_network.png'
    }
    
    for name, path in result_files.items():
        exists = os.path.exists(path)
        print(f"   {name}: {'✅' if exists else '❌'} {path}")


def main():
    """Main evaluation entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate EV Routing System')
    parser.add_argument('--mode', type=str, default='full',
                       choices=['full', 'quick', 'gan', 'agent', 'routing'],
                       help='Evaluation mode')
    parser.add_argument('--grid-size', type=int, default=10,
                       help='Grid size for road network')
    
    args = parser.parse_args()
    
    if args.mode == 'quick':
        quick_evaluate()
        return
    
    # Full evaluation
    evaluator = SystemEvaluator()
    evaluator.load_models(grid_size=args.grid_size)
    
    if args.mode == 'full':
        evaluator.run_full_evaluation()
    elif args.mode == 'gan':
        evaluator.evaluate_gan()
    elif args.mode == 'agent':
        evaluator.evaluate_agent()
    elif args.mode == 'routing':
        evaluator.evaluate_route_generation()


if __name__ == "__main__":
    main()
