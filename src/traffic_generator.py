# traffic_generator.py
"""
SG-GAN Traffic and Route Generator Module
==========================================
Implements a Stochastic Graph Generative Adversarial Network for:
- Traffic scenario generation
- EV route generation with realistic patterns
- Graph-based neural network architecture

Architecture based on the diagram:
- Generator: Takes noise + source/dest + EV state + traffic → generates routes
- Discriminator: Validates route realism, energy feasibility, traffic patterns
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers, Model
import os
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Set memory growth to avoid GPU memory issues
try:
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
except Exception as e:
    pass


# ============================================================================
# TRAFFIC DATA GENERATION
# ============================================================================

def create_synthetic_traffic(n_samples: int = 1000, 
                            num_roads: int = 20, 
                            time_steps: int = 24,
                            seed: int = 42,
                            grid_size: Optional[int] = None) -> np.ndarray:
    """
    Generate synthetic traffic data for GAN training.
    
    Creates realistic traffic patterns with:
    - Morning and evening rush hours
    - Night-time low traffic
    - Road-specific variations
    - Day-to-day randomness
    
    Args:
        n_samples: Number of traffic patterns to generate
        num_roads: Number of road segments
        time_steps: Number of time steps (hours)
        seed: Random seed for reproducibility
    
    Returns:
        traffic_data: Array of shape (n_samples, num_roads, time_steps)
    """
    # Allow caller to pass `grid_size` (legacy / convenience). If provided,
    # interpret `num_roads` as grid_size**2 (number of nodes/roads in a grid).
    if grid_size is not None:
        num_roads = grid_size * grid_size

    np.random.seed(seed)
    traffic_data = []
    
    for sample in range(n_samples):
        # Base random traffic
        daily_traffic = np.random.uniform(0.3, 0.7, size=(num_roads, time_steps))
        
        # Create hour-of-day pattern (same for all roads, then add variation)
        hour_pattern = np.ones(time_steps)
        
        # Morning rush: 7-9 AM (hours 7-9)
        hour_pattern[7:10] = np.array([1.3, 1.6, 1.4])
        
        # Lunch slight increase: 12-1 PM
        hour_pattern[12:14] = np.array([1.1, 1.15])
        
        # Evening rush: 5-7 PM (hours 17-19)
        hour_pattern[17:20] = np.array([1.5, 1.7, 1.4])
        
        # Late night (low traffic)
        hour_pattern[22:24] = np.array([0.4, 0.3])
        hour_pattern[0:6] = np.array([0.2, 0.15, 0.15, 0.2, 0.25, 0.4])
        
        # Apply pattern to all roads with some variation
        for road in range(num_roads):
            # Road-specific variation
            road_factor = np.random.uniform(0.8, 1.2)
            # Random noise
            noise = np.random.normal(0, 0.05, time_steps)
            
            daily_traffic[road] = daily_traffic[road] * hour_pattern * road_factor + noise
        
        # Clip to valid range
        daily_traffic = np.clip(daily_traffic, 0.1, 1.0)
        traffic_data.append(daily_traffic)
    
    return np.array(traffic_data, dtype=np.float32)


# ============================================================================
# GRAPH ATTENTION LAYER
# ============================================================================

class GraphAttentionLayer(layers.Layer):
    """
    Graph Attention Layer for processing graph-structured data.
    
    Uses attention mechanism to weight neighbor contributions,
    allowing the network to focus on important connections.
    """
    
    def __init__(self, units: int, num_heads: int = 4, dropout_rate: float = 0.1, **kwargs):
        super(GraphAttentionLayer, self).__init__(**kwargs)
        self.units = units
        self.num_heads = num_heads
        self.dropout_rate = dropout_rate
        
    def build(self, input_shape):
        self.W = self.add_weight(
            name='W',
            shape=(input_shape[-1], self.units * self.num_heads),
            initializer='glorot_uniform',
            trainable=True
        )
        self.a = self.add_weight(
            name='a',
            shape=(2 * self.units, self.num_heads),
            initializer='glorot_uniform',
            trainable=True
        )
        self.dropout = layers.Dropout(self.dropout_rate)
        super().build(input_shape)
    
    def call(self, inputs, adjacency, training=False):
        """
        Forward pass.
        
        Args:
            inputs: Node features [batch, nodes, features]
            adjacency: Adjacency matrix [batch, nodes, nodes]
            training: Whether in training mode
        """
        # Linear transformation
        h = tf.matmul(inputs, self.W)  # [batch, nodes, units * heads]
        
        # Reshape for multi-head attention
        batch_size = tf.shape(inputs)[0]
        num_nodes = tf.shape(inputs)[1]
        
        h = tf.reshape(h, [batch_size, num_nodes, self.num_heads, self.units])
        
        # Compute attention scores
        # Self-attention: compare each node with its neighbors
        h_i = tf.tile(tf.expand_dims(h, 2), [1, 1, num_nodes, 1, 1])  # [batch, nodes, nodes, heads, units]
        h_j = tf.tile(tf.expand_dims(h, 1), [1, num_nodes, 1, 1, 1])  # [batch, nodes, nodes, heads, units]
        
        # Concatenate and apply attention
        concat = tf.concat([h_i, h_j], axis=-1)  # [batch, nodes, nodes, heads, 2*units]
        e = tf.nn.leaky_relu(tf.einsum('bijnc,ch->bijnh', concat, self.a))
        e = tf.squeeze(e, axis=-1)  # [batch, nodes, nodes, heads]
        
        # Mask with adjacency matrix
        adjacency_expanded = tf.expand_dims(adjacency, -1)  # [batch, nodes, nodes, 1]
        mask = tf.where(adjacency_expanded > 0, 0.0, -1e9)
        e = e + mask
        
        # Softmax attention
        attention = tf.nn.softmax(e, axis=2)
        attention = self.dropout(attention, training=training)
        
        # Apply attention to node features
        h_transposed = tf.transpose(h, [0, 3, 1, 2])  # [batch, heads, nodes, units]
        attention_transposed = tf.transpose(attention, [0, 3, 1, 2])  # [batch, heads, nodes, nodes]
        
        output = tf.matmul(attention_transposed, h_transposed)  # [batch, heads, nodes, units]
        output = tf.transpose(output, [0, 2, 1, 3])  # [batch, nodes, heads, units]
        output = tf.reshape(output, [batch_size, num_nodes, self.num_heads * self.units])
        
        return output
    
    def get_config(self):
        config = super().get_config()
        config.update({
            'units': self.units,
            'num_heads': self.num_heads,
            'dropout_rate': self.dropout_rate
        })
        return config


# ============================================================================
# SG-GAN GENERATOR
# ============================================================================

class SGGANGenerator(Model):
    """
    SG-GAN Generator for traffic and route generation.
    
    Inputs:
    - Noise vector (z)
    - Source and destination nodes
    - EV battery state
    - Current traffic conditions
    
    Output:
    - Generated traffic patterns OR route probabilities
    """
    
    def __init__(self, 
                 output_shape: Tuple[int, int] = (20, 24),
                 noise_dim: int = 100,
                 ev_state_dim: int = 5,
                 condition_dim: int = 10,
                 **kwargs):
        super(SGGANGenerator, self).__init__(**kwargs)
        
        self.output_shape_target = output_shape
        self.noise_dim = noise_dim
        self.ev_state_dim = ev_state_dim
        self.condition_dim = condition_dim
        
        total_input_dim = noise_dim + ev_state_dim + condition_dim
        
        # Condition processing
        self.condition_dense = layers.Dense(64, activation='relu')
        
        # Main generator network
        self.dense1 = layers.Dense(256)
        self.bn1 = layers.BatchNormalization()
        self.relu1 = layers.ReLU()
        self.dropout1 = layers.Dropout(0.2)
        
        self.dense2 = layers.Dense(512)
        self.bn2 = layers.BatchNormalization()
        self.relu2 = layers.ReLU()
        self.dropout2 = layers.Dropout(0.2)
        
        self.dense3 = layers.Dense(1024)
        self.bn3 = layers.BatchNormalization()
        self.relu3 = layers.ReLU()
        
        self.dense4 = layers.Dense(int(np.prod(output_shape)))
        self.reshape = layers.Reshape(output_shape)
        
    def call(self, inputs, training=False):
        """
        Forward pass.
        
        Args:
            inputs: Tuple of (noise, ev_state, conditions) or concatenated tensor
        """
        if isinstance(inputs, (list, tuple)):
            noise, ev_state, conditions = inputs
            # Process conditions
            cond_processed = self.condition_dense(conditions)
            # Concatenate all inputs
            x = tf.concat([noise, ev_state, cond_processed], axis=-1)
        else:
            x = inputs
        
        # Generator network
        x = self.dense1(x)
        x = self.bn1(x, training=training)
        x = self.relu1(x)
        x = self.dropout1(x, training=training)
        
        x = self.dense2(x)
        x = self.bn2(x, training=training)
        x = self.relu2(x)
        x = self.dropout2(x, training=training)
        
        x = self.dense3(x)
        x = self.bn3(x, training=training)
        x = self.relu3(x)
        
        x = self.dense4(x)
        x = tf.nn.tanh(x)  # Output in [-1, 1]
        x = self.reshape(x)
        
        return x


# ============================================================================
# SG-GAN DISCRIMINATOR
# ============================================================================

class SGGANDiscriminator(Model):
    """
    SG-GAN Discriminator for validating traffic/routes.
    
    Evaluates:
    - Route validity (is this a connected path?)
    - Energy feasibility (can EV complete this route?)
    - Traffic realism (do traffic patterns look real?)
    - Graph connectivity (are transitions valid?)
    """
    
    def __init__(self,
                 input_shape: Tuple[int, int] = (20, 24),
                 ev_state_dim: int = 5,
                 condition_dim: int = 10,
                 **kwargs):
        super(SGGANDiscriminator, self).__init__(**kwargs)
        
        self.input_shape_target = input_shape
        
        # Condition processing
        self.condition_dense = layers.Dense(64, activation='relu')
        
        # Discriminator network
        self.flatten = layers.Flatten()
        
        self.dense1 = layers.Dense(512)
        self.ln1 = layers.LayerNormalization()
        self.relu1 = layers.LeakyReLU(alpha=0.2)
        self.dropout1 = layers.Dropout(0.3)
        
        self.dense2 = layers.Dense(256)
        self.ln2 = layers.LayerNormalization()
        self.relu2 = layers.LeakyReLU(alpha=0.2)
        self.dropout2 = layers.Dropout(0.3)
        
        self.dense3 = layers.Dense(128)
        self.relu3 = layers.LeakyReLU(alpha=0.2)
        
        # Multi-task outputs
        self.validity_head = layers.Dense(1, activation='sigmoid', name='validity')
        self.energy_head = layers.Dense(1, activation='sigmoid', name='energy_feasibility')
        self.realism_head = layers.Dense(1, activation='sigmoid', name='realism')
        
    def call(self, inputs, training=False):
        """
        Forward pass.
        
        Args:
            inputs: Tuple of (data, ev_state, conditions) or just data
        
        Returns:
            Dictionary with validity, energy_feasibility, and realism scores
        """
        if isinstance(inputs, (list, tuple)):
            data, ev_state, conditions = inputs
            # Process conditions
            cond_processed = self.condition_dense(conditions)
            # Flatten data
            x = self.flatten(data)
            # Concatenate
            x = tf.concat([x, ev_state, cond_processed], axis=-1)
        else:
            x = self.flatten(inputs)
        
        # Discriminator network
        x = self.dense1(x)
        x = self.ln1(x, training=training)
        x = self.relu1(x)
        x = self.dropout1(x, training=training)
        
        x = self.dense2(x)
        x = self.ln2(x, training=training)
        x = self.relu2(x)
        x = self.dropout2(x, training=training)
        
        x = self.dense3(x)
        x = self.relu3(x)
        
        # Multi-task outputs
        validity = self.validity_head(x)
        energy = self.energy_head(x)
        realism = self.realism_head(x)
        
        # Combined output (average of all criteria)
        combined = (validity + energy + realism) / 3.0
        
        return {
            'combined': combined,
            'validity': validity,
            'energy_feasibility': energy,
            'realism': realism
        }


# ============================================================================
# SG-GAN COMPLETE MODEL
# ============================================================================

class SGGANTrafficGenerator:
    """
    Complete SG-GAN model for traffic scenario generation.
    
    Combines Generator and Discriminator with training logic.
    """
    
    def __init__(self, 
                 input_shape: Tuple[int, int] = (20, 24), 
                 noise_dim: int = 100,
                 ev_state_dim: int = 5,
                 condition_dim: int = 10):
        """
        Initialize SG-GAN.
        
        Args:
            input_shape: Shape of traffic data (num_roads, time_steps)
            noise_dim: Dimension of noise vector
            ev_state_dim: Dimension of EV state features
            condition_dim: Dimension of conditioning variables
        """
        self.input_shape = input_shape
        self.noise_dim = noise_dim
        self.ev_state_dim = ev_state_dim
        self.condition_dim = condition_dim
        
        print("🏗️ Building SG-GAN Generator...")
        self.generator = SGGANGenerator(
            output_shape=input_shape,
            noise_dim=noise_dim,
            ev_state_dim=ev_state_dim,
            condition_dim=condition_dim
        )
        
        print("🏗️ Building SG-GAN Discriminator...")
        self.discriminator = SGGANDiscriminator(
            input_shape=input_shape,
            ev_state_dim=ev_state_dim,
            condition_dim=condition_dim
        )
        
        # Build models with dummy input
        dummy_noise = tf.zeros((1, noise_dim))
        dummy_ev = tf.zeros((1, ev_state_dim))
        dummy_cond = tf.zeros((1, condition_dim))
        dummy_data = tf.zeros((1,) + input_shape)
        
        _ = self.generator([dummy_noise, dummy_ev, dummy_cond])
        _ = self.discriminator([dummy_data, dummy_ev, dummy_cond])
        
        # Optimizers
        self.generator_optimizer = keras.optimizers.Adam(learning_rate=0.0002, beta_1=0.5)
        self.discriminator_optimizer = keras.optimizers.Adam(learning_rate=0.0002, beta_1=0.5)
        
        # Loss function
        self.loss_fn = keras.losses.BinaryCrossentropy()
        
        # Training history
        self.history = {
            'g_loss': [],
            'd_loss_real': [],
            'd_loss_fake': []
        }
    
    def _generate_conditions(self, batch_size: int) -> Tuple[np.ndarray, np.ndarray]:
        """Generate random EV states and conditions for training."""
        # EV state: [battery_soc, remaining_energy, range, time, energy_rate]
        ev_states = np.random.uniform(0, 1, (batch_size, self.ev_state_dim)).astype(np.float32)
        ev_states[:, 0] = np.random.uniform(0.2, 1.0, batch_size)  # Battery SoC
        ev_states[:, 3] = np.random.uniform(0, 1, batch_size)  # Time of day
        
        # Conditions: [source_x, source_y, dest_x, dest_y, ...]
        conditions = np.random.uniform(0, 1, (batch_size, self.condition_dim)).astype(np.float32)
        
        return ev_states, conditions
    
    @tf.function
    def _train_step(self, real_data: tf.Tensor, ev_states: tf.Tensor, 
                   conditions: tf.Tensor, noise: tf.Tensor):
        """Single training step."""
        batch_size = tf.shape(real_data)[0]
        
        # Labels
        real_labels = tf.ones((batch_size, 1))
        fake_labels = tf.zeros((batch_size, 1))
        
        # ---- Train Discriminator on Real Data ----
        with tf.GradientTape() as tape:
            real_output = self.discriminator([real_data, ev_states, conditions], training=True)
            d_loss_real = self.loss_fn(real_labels, real_output['combined'])
        
        d_grads_real = tape.gradient(d_loss_real, self.discriminator.trainable_variables)
        self.discriminator_optimizer.apply_gradients(
            zip(d_grads_real, self.discriminator.trainable_variables)
        )
        
        # ---- Train Discriminator on Fake Data ----
        with tf.GradientTape() as tape:
            fake_data = self.generator([noise, ev_states, conditions], training=False)
            fake_output = self.discriminator([fake_data, ev_states, conditions], training=True)
            d_loss_fake = self.loss_fn(fake_labels, fake_output['combined'])
        
        d_grads_fake = tape.gradient(d_loss_fake, self.discriminator.trainable_variables)
        self.discriminator_optimizer.apply_gradients(
            zip(d_grads_fake, self.discriminator.trainable_variables)
        )
        
        # ---- Train Generator ----
        with tf.GradientTape() as tape:
            fake_data = self.generator([noise, ev_states, conditions], training=True)
            fake_output = self.discriminator([fake_data, ev_states, conditions], training=False)
            # Generator wants discriminator to think fake is real
            g_loss = self.loss_fn(real_labels, fake_output['combined'])
        
        g_grads = tape.gradient(g_loss, self.generator.trainable_variables)
        self.generator_optimizer.apply_gradients(
            zip(g_grads, self.generator.trainable_variables)
        )
        
        return d_loss_real, d_loss_fake, g_loss
    
    def train(self, real_data: np.ndarray, epochs: int = 100, batch_size: int = 32,
              verbose: bool = True):
        """
        Train the SG-GAN.
        
        Args:
            real_data: Real traffic data, shape (n_samples, num_roads, time_steps)
            epochs: Number of training epochs
            batch_size: Batch size
            verbose: Whether to print progress
        """
        if verbose:
            print("\n" + "=" * 60)
            print("TRAINING SG-GAN")
            print("=" * 60)
        
        # If the provided real data shape differs from the configured input_shape,
        # rebuild generator/discriminator to match the actual data dimensions.
        data_shape = tuple(real_data.shape[1:])
        if data_shape != tuple(self.input_shape):
            print(f"⚠️  Input data shape {data_shape} differs from GAN input_shape {self.input_shape}. Rebuilding models...")
            self.input_shape = data_shape
            # Recreate models with new input shape
            self.generator = SGGANGenerator(
                output_shape=self.input_shape,
                noise_dim=self.noise_dim,
                ev_state_dim=self.ev_state_dim,
                condition_dim=self.condition_dim
            )
            self.discriminator = SGGANDiscriminator(
                input_shape=self.input_shape,
                ev_state_dim=self.ev_state_dim,
                condition_dim=self.condition_dim
            )
            # Build with dummy inputs matching new shape
            dummy_noise = tf.zeros((1, self.noise_dim))
            dummy_ev = tf.zeros((1, self.ev_state_dim))
            dummy_cond = tf.zeros((1, self.condition_dim))
            dummy_data = tf.zeros((1,) + self.input_shape)
            _ = self.generator([dummy_noise, dummy_ev, dummy_cond])
            _ = self.discriminator([dummy_data, dummy_ev, dummy_cond])

        n_samples = real_data.shape[0]
        n_batches = max(1, n_samples // batch_size)
        
        for epoch in range(epochs):
            epoch_d_loss_real = []
            epoch_d_loss_fake = []
            epoch_g_loss = []
            
            # Shuffle data
            indices = np.random.permutation(n_samples)
            
            for batch_idx in range(n_batches):
                # Get batch
                start_idx = batch_idx * batch_size
                end_idx = min(start_idx + batch_size, n_samples)
                batch_indices = indices[start_idx:end_idx]
                real_batch = real_data[batch_indices]
                
                # Generate conditions
                current_batch_size = len(batch_indices)
                ev_states, conditions = self._generate_conditions(current_batch_size)
                
                # Generate noise
                noise = np.random.normal(0, 1, (current_batch_size, self.noise_dim)).astype(np.float32)
                
                # Training step
                d_loss_real, d_loss_fake, g_loss = self._train_step(
                    tf.constant(real_batch),
                    tf.constant(ev_states),
                    tf.constant(conditions),
                    tf.constant(noise)
                )
                
                epoch_d_loss_real.append(float(d_loss_real))
                epoch_d_loss_fake.append(float(d_loss_fake))
                epoch_g_loss.append(float(g_loss))
            
            # Record history
            self.history['d_loss_real'].append(np.mean(epoch_d_loss_real))
            self.history['d_loss_fake'].append(np.mean(epoch_d_loss_fake))
            self.history['g_loss'].append(np.mean(epoch_g_loss))
            
            # Print progress
            if verbose and (epoch + 1) % 10 == 0:
                print(f"\nEpoch {epoch + 1}/{epochs}")
                print(f"  📉 D Loss (Real): {self.history['d_loss_real'][-1]:.4f}")
                print(f"  📉 D Loss (Fake): {self.history['d_loss_fake'][-1]:.4f}")
                print(f"  📈 G Loss: {self.history['g_loss'][-1]:.4f}")
                
                # Progress interpretation
                g_loss_val = self.history['g_loss'][-1]
                d_loss_val = (self.history['d_loss_real'][-1] + self.history['d_loss_fake'][-1]) / 2
                
                if g_loss_val < d_loss_val:
                    print(f"  ✅ Generator is improving!")
                else:
                    print(f"  ⏳ Discriminator still winning, keep training...")
        
        if verbose:
            print("\n✅ Training complete!")
    
    def generate_traffic_scenarios(self, n_samples: int = 100, 
                                   ev_state: Optional[np.ndarray] = None,
                                   conditions: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Generate traffic scenarios using trained generator.
        
        Args:
            n_samples: Number of scenarios to generate
            ev_state: Optional EV state to condition on
            conditions: Optional conditions (source, destination, etc.)
        
        Returns:
            Generated traffic scenarios, shape (n_samples, num_roads, time_steps)
        """
        # Generate noise
        noise = np.random.normal(0, 1, (n_samples, self.noise_dim)).astype(np.float32)
        
        # Generate or use provided conditions
        if ev_state is None:
            ev_states, _ = self._generate_conditions(n_samples)
        else:
            ev_states = np.tile(ev_state, (n_samples, 1)).astype(np.float32)
        
        if conditions is None:
            _, conditions = self._generate_conditions(n_samples)
        else:
            conditions = np.tile(conditions, (n_samples, 1)).astype(np.float32)
        
        # Generate
        fake_data = self.generator([noise, ev_states, conditions], training=False)
        
        # Convert from [-1, 1] to [0, 1]
        fake_data = (fake_data.numpy() + 1) / 2
        
        return fake_data
    
    def evaluate_scenario(self, scenario: np.ndarray,
                         ev_state: np.ndarray,
                         conditions: np.ndarray) -> Dict:
        """
        Evaluate a traffic/route scenario.
        
        Returns discriminator scores for validity, energy feasibility, and realism.
        """
        # Ensure correct shape
        if len(scenario.shape) == 2:
            scenario = scenario[np.newaxis, ...]
        if len(ev_state.shape) == 1:
            ev_state = ev_state[np.newaxis, ...]
        if len(conditions.shape) == 1:
            conditions = conditions[np.newaxis, ...]
        
        # Normalize to [-1, 1]
        scenario_normalized = scenario * 2 - 1
        
        output = self.discriminator(
            [scenario_normalized, ev_state.astype(np.float32), conditions.astype(np.float32)],
            training=False
        )
        
        return {
            'combined_score': float(output['combined'][0]),
            'validity_score': float(output['validity'][0]),
            'energy_feasibility_score': float(output['energy_feasibility'][0]),
            'realism_score': float(output['realism'][0])
        }
    
    def save(self, filepath: str):
        """Save GAN models."""
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        self.generator.save(f"{filepath}_generator.keras")
        self.discriminator.save(f"{filepath}_discriminator.keras")
        print(f"✅ SG-GAN saved to {filepath}")
    
    def load(self, filepath: str):
        """Load GAN models."""
        try:
            self.generator = keras.models.load_model(
                f"{filepath}_generator.keras",
                custom_objects={'SGGANGenerator': SGGANGenerator}
            )
            self.discriminator = keras.models.load_model(
                f"{filepath}_discriminator.keras",
                custom_objects={'SGGANDiscriminator': SGGANDiscriminator}
            )
            print(f"✅ SG-GAN loaded from {filepath}")
        except Exception as e:
            # Try loading .h5 format (legacy)
            try:
                self.generator = keras.models.load_model(f"{filepath}_generator.h5")
                self.discriminator = keras.models.load_model(f"{filepath}_discriminator.h5")
                print(f"✅ SG-GAN loaded from {filepath} (legacy format)")
            except Exception as e2:
                print(f"❌ Failed to load SG-GAN: {e2}")
                raise


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def save_gan(gan: SGGANTrafficGenerator, filepath: str):
    """Save trained GAN models."""
    gan.save(filepath)


def load_gan(filepath: str) -> SGGANTrafficGenerator:
    """Load pre-trained GAN models."""
    # Create a new GAN instance and load weights
    gan = SGGANTrafficGenerator()
    gan.load(filepath)
    return gan


def plot_training_history(gan: SGGANTrafficGenerator, save_path: str = None):
    """Plot GAN training history."""
    import matplotlib.pyplot as plt
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss curves
    axes[0].plot(gan.history['d_loss_real'], label='D Loss (Real)', alpha=0.7)
    axes[0].plot(gan.history['d_loss_fake'], label='D Loss (Fake)', alpha=0.7)
    axes[0].plot(gan.history['g_loss'], label='G Loss', alpha=0.7)
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('SG-GAN Training Loss')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Moving average
    window = min(10, len(gan.history['g_loss']) // 2)
    if window > 1:
        g_smooth = np.convolve(gan.history['g_loss'], np.ones(window)/window, mode='valid')
        d_smooth = np.convolve(
            [(r + f) / 2 for r, f in zip(gan.history['d_loss_real'], gan.history['d_loss_fake'])],
            np.ones(window)/window, mode='valid'
        )
        axes[1].plot(g_smooth, label='G Loss (smoothed)', linewidth=2)
        axes[1].plot(d_smooth, label='D Loss (smoothed)', linewidth=2)
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Loss')
        axes[1].set_title('Smoothed Training Loss')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"✅ Training history saved to {save_path}")
    
    return fig


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    print("🚗 SG-GAN Traffic Generator Module")
    print("=" * 60)
    
    # Step 1: Create synthetic traffic data
    print("\n📊 Creating synthetic traffic data...")
    real_traffic = create_synthetic_traffic(n_samples=500, num_roads=20, time_steps=24)
    print(f"✅ Created {real_traffic.shape[0]} traffic scenarios")
    print(f"   Shape: {real_traffic.shape}")
    
    # Normalize for GAN training [-1, 1]
    real_traffic_normalized = real_traffic * 2 - 1
    
    # Step 2: Create and train GAN
    print("\n🏗️ Building SG-GAN...")
    gan = SGGANTrafficGenerator(
        input_shape=(20, 24),
        noise_dim=100,
        ev_state_dim=5,
        condition_dim=10
    )
    
    print("\n🎓 Training SG-GAN...")
    gan.train(real_traffic_normalized, epochs=50, batch_size=32)
    
    # Step 3: Generate new scenarios
    print("\n🎲 Generating traffic scenarios...")
    generated_traffic = gan.generate_traffic_scenarios(n_samples=100)
    print(f"✅ Generated {generated_traffic.shape[0]} scenarios")
    print(f"   Mean traffic level: {generated_traffic.mean():.3f}")
    print(f"   Traffic range: [{generated_traffic.min():.3f}, {generated_traffic.max():.3f}]")
    
    # Step 4: Evaluate a scenario
    print("\n📋 Evaluating generated scenario...")
    ev_state = np.array([0.8, 0.8, 0.5, 0.33, 0.2])  # 80% SoC, 8 AM
    conditions = np.random.uniform(0, 1, 10)
    
    scores = gan.evaluate_scenario(generated_traffic[0], ev_state, conditions)
    print(f"   Validity: {scores['validity_score']:.3f}")
    print(f"   Energy Feasibility: {scores['energy_feasibility_score']:.3f}")
    print(f"   Realism: {scores['realism_score']:.3f}")
    
    # Step 5: Save model
    print("\n💾 Saving model...")
    os.makedirs("../models/sg_gan", exist_ok=True)
    gan.save("../models/sg_gan/traffic_gan")
    
    # Step 6: Plot and save training history
    print("\n📈 Creating training plots...")
    try:
        os.makedirs("../results/plots", exist_ok=True)
        plot_training_history(gan, "../results/plots/gan_training_history.png")
    except Exception as e:
        print(f"⚠️ Could not save plots: {e}")
    
    print("\n✅ SG-GAN module working correctly!")
