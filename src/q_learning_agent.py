# q_learning_agent.py
"""
Q-Learning Agent for EV Routing
================================
Implements tabular Q-Learning and Deep Q-Network (DQN) agents
for learning optimal EV routing policies.

The agent learns to:
- Navigate efficiently from source to destination
- Manage battery levels appropriately
- Decide when to charge at stations
- Adapt to traffic conditions
"""

import numpy as np
import pickle
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict
import os

# Try to import TensorFlow for DQN
try:
    import tensorflow as tf
    from tensorflow import keras
    from keras import layers
    HAS_TF = True
except ImportError:
    HAS_TF = False
    print("⚠️ TensorFlow not available. DQN agent will not be available.")


# ============================================================================
# TABULAR Q-LEARNING AGENT
# ============================================================================

class QLearningAgent:
    """
    Tabular Q-Learning Agent for EV Routing.
    
    Uses a Q-table to store state-action values and learns through
    temporal difference updates (Bellman equation).
    
    Formula: Q(s,a) ← Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
    
    Where:
    - α (alpha): Learning rate - how much new info overrides old
    - γ (gamma): Discount factor - how much future rewards matter
    - r: Immediate reward
    - s, s': Current and next state
    - a, a': Current and next action
    """
    
    def __init__(self, 
                 state_space: int = 1000,
                 action_space: int = 5,
                 learning_rate: float = 0.1,
                 discount_factor: float = 0.95,
                 exploration_rate: float = 1.0,
                 exploration_decay: float = 0.995,
                 min_exploration_rate: float = 0.01):
        """
        Initialize Q-Learning Agent.
        
        Args:
            state_space: Estimated number of possible states (for info only)
            action_space: Number of possible actions
            learning_rate: Alpha - learning rate (0.0 to 1.0)
            discount_factor: Gamma - discount factor for future rewards (0.0 to 1.0)
            exploration_rate: Initial epsilon for epsilon-greedy exploration
            exploration_decay: Rate at which exploration decreases
            min_exploration_rate: Minimum exploration rate
        """
        self.state_space = state_space
        self.action_space = action_space
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.exploration_rate = exploration_rate
        self.exploration_decay = exploration_decay
        self.min_exploration_rate = min_exploration_rate
        
        # Q-table: Dictionary mapping state -> array of Q-values for each action
        self.q_table: Dict[Tuple, np.ndarray] = {}
        
        # Visit counts for each state
        self.visit_counts: Dict[Tuple, int] = defaultdict(int)
        
        # Learning history for analysis
        self.learning_history: List[Dict] = []
        
        # Statistics
        self.total_updates = 0
    
    def _state_to_key(self, state) -> Tuple:
        """Convert state to hashable key for Q-table."""
        if isinstance(state, np.ndarray):
            # Discretize continuous state
            return tuple(np.round(state, 2))
        elif isinstance(state, (list, tuple)):
            return tuple(state)
        else:
            return (state,)
    
    def initialize_state(self, state):
        """Initialize Q-values for a new state."""
        key = self._state_to_key(state)
        if key not in self.q_table:
            # Initialize with small random values to break ties
            self.q_table[key] = np.random.uniform(-0.01, 0.01, self.action_space)
    
    def choose_action(self, state, training: bool = True) -> int:
        """
        Choose action using epsilon-greedy strategy.
        
        Args:
            state: Current state
            training: If True, use exploration. If False, always exploit.
        
        Returns:
            action: Selected action index
        """
        key = self._state_to_key(state)
        self.initialize_state(state)
        
        if training and np.random.random() < self.exploration_rate:
            # Exploration: random action
            return np.random.randint(0, self.action_space)
        else:
            # Exploitation: best known action
            return int(np.argmax(self.q_table[key]))
    
    def learn(self, state, action: int, reward: float, next_state, done: bool):
        """
        Update Q-value using Bellman equation.
        
        Q(s,a) ← Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
        
        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Resulting state
            done: Whether episode ended
        """
        key = self._state_to_key(state)
        next_key = self._state_to_key(next_state)
        
        self.initialize_state(state)
        self.initialize_state(next_state)
        
        # Current Q-value
        current_q = self.q_table[key][action]
        
        # Expected future value
        if done:
            max_next_q = 0
        else:
            max_next_q = np.max(self.q_table[next_key])
        
        # Calculate new Q-value
        new_estimate = reward + self.discount_factor * max_next_q
        new_q = current_q + self.learning_rate * (new_estimate - current_q)
        
        # Update Q-table
        self.q_table[key][action] = new_q
        
        # Update statistics
        self.visit_counts[key] += 1
        self.total_updates += 1
        
        # Record learning step
        self.learning_history.append({
            'state': key,
            'action': action,
            'reward': reward,
            'old_q': current_q,
            'new_q': new_q,
            'td_error': new_estimate - current_q
        })
    
    def decay_exploration(self):
        """Decay exploration rate."""
        self.exploration_rate = max(
            self.min_exploration_rate,
            self.exploration_rate * self.exploration_decay
        )
    
    def get_policy(self) -> Dict[Tuple, int]:
        """Extract greedy policy from Q-table."""
        return {state: int(np.argmax(q_values)) 
                for state, q_values in self.q_table.items()}
    
    def get_q_value(self, state, action: int) -> float:
        """Get Q-value for a state-action pair."""
        key = self._state_to_key(state)
        self.initialize_state(state)
        return float(self.q_table[key][action])
    
    def get_best_action(self, state) -> int:
        """Get best action for a state (exploitation only)."""
        return self.choose_action(state, training=False)
    
    def get_stats(self) -> Dict:
        """Get agent statistics."""
        return {
            'num_states': len(self.q_table),
            'total_updates': self.total_updates,
            'exploration_rate': self.exploration_rate,
            'avg_visits_per_state': np.mean(list(self.visit_counts.values())) if self.visit_counts else 0
        }
    
    def save_model(self, filepath: str):
        """Save Q-table and parameters to file."""
        data = {
            'q_table': dict(self.q_table),
            'visit_counts': dict(self.visit_counts),
            'parameters': {
                'state_space': self.state_space,
                'action_space': self.action_space,
                'learning_rate': self.learning_rate,
                'discount_factor': self.discount_factor,
                'exploration_rate': self.exploration_rate,
                'exploration_decay': self.exploration_decay,
                'min_exploration_rate': self.min_exploration_rate
            },
            'stats': self.get_stats()
        }
        
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        print(f"✅ Q-Learning agent saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load Q-table and parameters from file."""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.q_table = data['q_table']
        self.visit_counts = defaultdict(int, data.get('visit_counts', {}))
        
        if 'parameters' in data:
            params = data['parameters']
            self.state_space = params.get('state_space', self.state_space)
            self.action_space = params.get('action_space', self.action_space)
            self.learning_rate = params.get('learning_rate', self.learning_rate)
            self.discount_factor = params.get('discount_factor', self.discount_factor)
            self.exploration_rate = params.get('exploration_rate', self.min_exploration_rate)
        
        print(f"✅ Q-Learning agent loaded from {filepath}")
        print(f"   States: {len(self.q_table)}, Updates: {data.get('stats', {}).get('total_updates', 'N/A')}")


# ============================================================================
# DEEP Q-NETWORK AGENT (Optional)
# ============================================================================

if HAS_TF:
    class DQNAgent:
        """
        Deep Q-Network Agent for EV Routing.
        
        Uses neural network to approximate Q-function, enabling
        generalization across similar states.
        
        Features:
        - Experience replay for stable learning
        - Target network for stable updates
        - Double DQN to reduce overestimation
        """
        
        def __init__(self,
                     state_dim: int = 8,
                     action_space: int = 5,
                     learning_rate: float = 0.001,
                     discount_factor: float = 0.95,
                     exploration_rate: float = 1.0,
                     exploration_decay: float = 0.995,
                     min_exploration_rate: float = 0.01,
                     replay_buffer_size: int = 10000,
                     batch_size: int = 64,
                     target_update_freq: int = 100):
            """
            Initialize DQN Agent.
            
            Args:
                state_dim: Dimension of state vector
                action_space: Number of possible actions
                learning_rate: Learning rate for optimizer
                discount_factor: Discount factor for future rewards
                exploration_rate: Initial exploration rate
                exploration_decay: Exploration decay rate
                min_exploration_rate: Minimum exploration rate
                replay_buffer_size: Size of experience replay buffer
                batch_size: Batch size for training
                target_update_freq: How often to update target network
            """
            self.state_dim = state_dim
            self.action_space = action_space
            self.learning_rate = learning_rate
            self.discount_factor = discount_factor
            self.exploration_rate = exploration_rate
            self.exploration_decay = exploration_decay
            self.min_exploration_rate = min_exploration_rate
            self.batch_size = batch_size
            self.target_update_freq = target_update_freq
            
            # Build networks
            self.model = self._build_network()
            self.target_model = self._build_network()
            self.target_model.set_weights(self.model.get_weights())
            
            # Experience replay buffer
            self.replay_buffer = []
            self.replay_buffer_size = replay_buffer_size
            
            # Training counter
            self.train_step_counter = 0
            
            # Optimizer and loss
            self.optimizer = keras.optimizers.Adam(learning_rate=learning_rate)
            self.loss_fn = keras.losses.MeanSquaredError()
        
        def _build_network(self) -> keras.Model:
            """Build Q-network."""
            model = keras.Sequential([
                layers.Input(shape=(self.state_dim,)),
                layers.Dense(128, activation='relu'),
                layers.Dense(128, activation='relu'),
                layers.Dense(64, activation='relu'),
                layers.Dense(self.action_space)
            ])
            return model
        
        def choose_action(self, state: np.ndarray, training: bool = True) -> int:
            """Choose action using epsilon-greedy."""
            if training and np.random.random() < self.exploration_rate:
                return np.random.randint(0, self.action_space)
            
            state = np.array(state).reshape(1, -1)
            q_values = self.model(state, training=False)
            return int(np.argmax(q_values[0]))
        
        def store_experience(self, state, action: int, reward: float, 
                           next_state, done: bool):
            """Store experience in replay buffer."""
            experience = (state, action, reward, next_state, done)
            
            if len(self.replay_buffer) >= self.replay_buffer_size:
                self.replay_buffer.pop(0)
            
            self.replay_buffer.append(experience)
        
        def learn(self, state=None, action=None, reward=None, 
                 next_state=None, done=None):
            """
            Learn from replay buffer.
            
            If parameters are provided, store experience first.
            Then sample batch and train.
            """
            # Store experience if provided
            if state is not None:
                self.store_experience(state, action, reward, next_state, done)
            
            # Need enough experiences to learn
            if len(self.replay_buffer) < self.batch_size:
                return
            
            # Sample batch
            indices = np.random.choice(len(self.replay_buffer), 
                                      self.batch_size, replace=False)
            batch = [self.replay_buffer[i] for i in indices]
            
            states = np.array([e[0] for e in batch])
            actions = np.array([e[1] for e in batch])
            rewards = np.array([e[2] for e in batch])
            next_states = np.array([e[3] for e in batch])
            dones = np.array([e[4] for e in batch])
            
            # Calculate target Q-values (Double DQN)
            next_q_model = self.model(next_states, training=False)
            next_actions = np.argmax(next_q_model, axis=1)
            
            next_q_target = self.target_model(next_states, training=False)
            next_q_values = np.array([next_q_target[i, a] 
                                     for i, a in enumerate(next_actions)])
            
            targets = rewards + (1 - dones) * self.discount_factor * next_q_values
            
            # Train model
            with tf.GradientTape() as tape:
                q_values = self.model(states, training=True)
                q_action = tf.reduce_sum(
                    q_values * tf.one_hot(actions, self.action_space), axis=1
                )
                loss = self.loss_fn(targets, q_action)
            
            gradients = tape.gradient(loss, self.model.trainable_variables)
            self.optimizer.apply_gradients(
                zip(gradients, self.model.trainable_variables)
            )
            
            # Update target network periodically
            self.train_step_counter += 1
            if self.train_step_counter % self.target_update_freq == 0:
                self.target_model.set_weights(self.model.get_weights())
        
        def decay_exploration(self):
            """Decay exploration rate."""
            self.exploration_rate = max(
                self.min_exploration_rate,
                self.exploration_rate * self.exploration_decay
            )
        
        def save_model(self, filepath: str):
            """Save DQN model."""
            self.model.save(f"{filepath}_model.keras")
            self.target_model.save(f"{filepath}_target.keras")
            
            # Save parameters
            params = {
                'state_dim': self.state_dim,
                'action_space': self.action_space,
                'exploration_rate': self.exploration_rate
            }
            with open(f"{filepath}_params.pkl", 'wb') as f:
                pickle.dump(params, f)
            
            print(f"✅ DQN agent saved to {filepath}")
        
        def load_model(self, filepath: str):
            """Load DQN model."""
            self.model = keras.models.load_model(f"{filepath}_model.keras")
            self.target_model = keras.models.load_model(f"{filepath}_target.keras")
            
            with open(f"{filepath}_params.pkl", 'rb') as f:
                params = pickle.load(f)
                self.exploration_rate = params.get('exploration_rate', 
                                                   self.min_exploration_rate)
            
            print(f"✅ DQN agent loaded from {filepath}")


# ============================================================================
# TRAINING FUNCTIONS
# ============================================================================

def train_q_learning_agent(env, agent: QLearningAgent, 
                          episodes: int = 500,
                          max_steps: int = 200,
                          verbose: bool = True) -> Tuple[List[float], List[int]]:
    """
    Train Q-Learning agent in environment.
    
    Args:
        env: Gymnasium environment
        agent: QLearningAgent instance
        episodes: Number of training episodes
        max_steps: Maximum steps per episode
        verbose: Whether to print progress
    
    Returns:
        episode_rewards: List of total rewards per episode
        episode_lengths: List of episode lengths
    """
    episode_rewards = []
    episode_lengths = []
    success_count = 0
    
    if verbose:
        print("\n" + "=" * 60)
        print("TRAINING Q-LEARNING AGENT")
        print("=" * 60)
    
    for episode in range(episodes):
        # Reset environment
        result = env.reset()
        if isinstance(result, tuple):
            state = result[0] if isinstance(result[0], np.ndarray) else env.get_state()
        else:
            state = result
        
        episode_reward = 0
        episode_length = 0
        
        for step in range(max_steps):
            # Choose action
            action = agent.choose_action(state, training=True)
            
            # Execute action
            result = env.step(action)
            if len(result) == 5:  # New Gymnasium format
                next_obs, reward, terminated, truncated, info = result
                done = terminated or truncated
            else:  # Old format
                next_state_tuple, reward, done, info = result
            
            # Get next state
            next_state = env.get_state() if hasattr(env, 'get_state') else next_obs
            
            # Learn from experience
            agent.learn(state, action, reward, next_state, done)
            
            # Update tracking
            episode_reward += reward
            episode_length += 1
            state = next_state
            
            if done:
                if info.get('reached', False):
                    success_count += 1
                break
        
        # End of episode
        agent.decay_exploration()
        episode_rewards.append(episode_reward)
        episode_lengths.append(episode_length)
        
        # Progress reporting
        if verbose and (episode + 1) % 50 == 0:
            recent_rewards = episode_rewards[-50:]
            recent_success = success_count - (sum(1 for r in episode_rewards[:-50] if r > 50) if episode >= 50 else 0)
            
            print(f"\n📊 Episode {episode + 1}/{episodes}")
            print(f"   Avg Reward (last 50): {np.mean(recent_rewards):7.2f}")
            print(f"   Max Reward (last 50): {np.max(recent_rewards):7.2f}")
            print(f"   Avg Steps (last 50): {np.mean(episode_lengths[-50:]):6.1f}")
            print(f"   Exploration Rate: {agent.exploration_rate:.4f}")
            print(f"   States Discovered: {len(agent.q_table)}")
            
            # Progress bar
            progress = (episode + 1) / episodes
            bar_length = 20
            filled = int(bar_length * progress)
            bar = '█' * filled + '░' * (bar_length - filled)
            print(f"   Progress: |{bar}| {progress*100:.0f}%")
    
    if verbose:
        print(f"\n✅ Training complete!")
        print(f"   Total successes: {success_count}/{episodes}")
        print(f"   Final exploration rate: {agent.exploration_rate:.4f}")
        print(f"   Q-table size: {len(agent.q_table)} states")
    
    return episode_rewards, episode_lengths


def evaluate_agent(env, agent, num_episodes: int = 10, 
                  max_steps: int = 200, verbose: bool = True) -> Dict:
    """
    Evaluate trained agent without exploration.
    
    Args:
        env: Environment to evaluate in
        agent: Trained agent
        num_episodes: Number of evaluation episodes
        max_steps: Maximum steps per episode
        verbose: Whether to print results
    
    Returns:
        Dictionary with evaluation results
    """
    results = {
        'rewards': [],
        'lengths': [],
        'successes': [],
        'energies': [],
        'routes': []
    }
    
    for episode in range(num_episodes):
        result = env.reset()
        state = result[0] if isinstance(result, tuple) else result
        if hasattr(env, 'get_state'):
            state = env.get_state()
        
        episode_reward = 0
        route = [env.ev_state.current_node if hasattr(env, 'ev_state') else 0]
        
        for step in range(max_steps):
            action = agent.choose_action(state, training=False)
            
            result = env.step(action)
            if len(result) == 5:
                _, reward, terminated, truncated, info = result
                done = terminated or truncated
            else:
                _, reward, done, info = result
            
            state = env.get_state() if hasattr(env, 'get_state') else result[0]
            episode_reward += reward
            
            if hasattr(env, 'ev_state'):
                route.append(env.ev_state.current_node)
            
            if done:
                break
        
        results['rewards'].append(episode_reward)
        results['lengths'].append(len(route))
        results['successes'].append(info.get('reached', False))
        results['energies'].append(env.episode_energy_used if hasattr(env, 'episode_energy_used') else 0)
        results['routes'].append(route)
    
    if verbose:
        print("\n📊 EVALUATION RESULTS")
        print("=" * 60)
        print(f"Success Rate: {100 * np.mean(results['successes']):.1f}%")
        print(f"Avg Reward: {np.mean(results['rewards']):.2f}")
        print(f"Avg Steps: {np.mean(results['lengths']):.2f}")
        if any(results['energies']):
            print(f"Avg Energy: {np.mean(results['energies']):.2f} kWh")
    
    return results


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("🤖 Q-Learning Agent Module")
    print("=" * 60)
    
    # Create agent
    print("\n📦 Creating Q-Learning agent...")
    agent = QLearningAgent(
        state_space=1000,
        action_space=5,
        learning_rate=0.1,
        discount_factor=0.95,
        exploration_rate=1.0,
        exploration_decay=0.995
    )
    
    print(f"✅ Agent created")
    print(f"   Learning rate: {agent.learning_rate}")
    print(f"   Discount factor: {agent.discount_factor}")
    print(f"   Initial exploration: {agent.exploration_rate}")
    
    # Test basic functionality
    print("\n🧪 Testing agent functionality...")
    
    # Test state handling
    test_states = [
        (0, 10, 8, 0.5),      # Tuple state
        [0.1, 0.2, 0.8, 0.3],  # List state
        np.array([0.1, 0.2, 0.8, 0.3])  # Numpy state
    ]
    
    for state in test_states:
        action = agent.choose_action(state, training=True)
        print(f"   State {type(state).__name__}: Action = {action}")
    
    # Test learning
    print("\n🎓 Testing learning...")
    state = (0, 10, 8, 0.5)
    action = 2
    reward = 10.0
    next_state = (1, 9, 8, 0.5)
    
    q_before = agent.get_q_value(state, action)
    agent.learn(state, action, reward, next_state, done=False)
    q_after = agent.get_q_value(state, action)
    
    print(f"   Q-value before: {q_before:.4f}")
    print(f"   Q-value after: {q_after:.4f}")
    print(f"   Update: {q_after - q_before:+.4f}")
    
    # Test save/load
    print("\n💾 Testing save/load...")
    from src.config import get_settings
    settings = get_settings()
    settings.q_learning_model_path.mkdir(parents=True, exist_ok=True)
    agent.save_model(str(settings.q_learning_model_path / "test_agent.pkl"))
    
    new_agent = QLearningAgent(action_space=5)
    new_agent.load_model(str(settings.q_learning_model_path / "test_agent.pkl"))
    
    print(f"   Loaded Q-table size: {len(new_agent.q_table)}")
    
    # Test with environment
    print("\n🌍 Testing with environment...")
    try:
        from src.environment import LegacyEVRoutingEnvironment
        
        env = LegacyEVRoutingEnvironment(grid_size=5, max_battery=100)
        test_agent = QLearningAgent(action_space=5)
        
        # Quick training test
        rewards, lengths = train_q_learning_agent(
            env, test_agent, episodes=100, max_steps=50, verbose=True
        )
        
        print(f"\n📈 Training Summary:")
        print(f"   Final avg reward: {np.mean(rewards[-20:]):.2f}")
        print(f"   States discovered: {len(test_agent.q_table)}")
        
    except ImportError:
        print("   Environment not available for testing")
    
    print("\n✅ Q-Learning agent module working correctly!")
