# gnn_route_generator.py
"""
Graph Neural Network Route Generator
=====================================
Advanced GNN-based route generation following the SG-GAN architecture:

┌──────────────────────────────┐
│     Historical EV Routes      │
│  (Real-world Route Dataset)   │
└──────────────┬───────────────┘
               │
               ▼
    ┌────────────────────┐
    │   Route Encoding   │
    │ (Graph-based Path) │
    └─────────┬──────────┘
              │
              ▼
 ┌───────────────────────────┐
 │        DISCRIMINATOR       │
 │      (Graph Neural Net)    │
 │ • Route validity           │
 │ • Energy feasibility       │
 │ • Traffic realism          │
 │ • Graph connectivity       │
 └───────────▲───────────────┘
             │
             │
┌───────────────┐             ┌──────────────────────────┐
│   Road Graph  │────────────▶│        GENERATOR          │
│ (OSM + Traffic│             │     (SG-GAN Generator)    │
│   + Energy)   │             │ • Input noise (z)         │
└───────────────┘             │ • Source & Destination   │
                              │ • EV battery state       │
                              │ • Traffic conditions     │
                              │ → Generates EV routes    │
                              └──────────────────────────┘
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers, Model
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')


# ============================================================================
# ROUTE ENCODING
# ============================================================================

@dataclass
class EncodedRoute:
    """Encoded route representation for GNN processing."""
    node_sequence: List[int]
    adjacency_matrix: np.ndarray
    node_features: np.ndarray
    edge_features: np.ndarray
    ev_state: np.ndarray
    total_energy: float
    total_time: float
    is_valid: bool


class RouteEncoder:
    """
    Encodes routes as graph-structured data for GNN processing.
    
    Converts:
    - Node sequences → adjacency matrices
    - Path info → node/edge features
    - EV state → conditioning vector
    """
    
    def __init__(self, max_nodes: int = 100, feature_dim: int = 8):
        self.max_nodes = max_nodes
        self.feature_dim = feature_dim
    
    def encode_route(self, 
                    route: List[int], 
                    road_graph: Any,
                    ev_state: np.ndarray) -> EncodedRoute:
        """
        Encode a route into graph format.
        
        Args:
            route: List of node IDs
            road_graph: RoadGraph object
            ev_state: EV state features
        
        Returns:
            EncodedRoute with all graph data
        """
        # Build adjacency matrix for the route
        adj = np.zeros((self.max_nodes, self.max_nodes), dtype=np.float32)
        for i in range(len(route) - 1):
            if route[i] < self.max_nodes and route[i+1] < self.max_nodes:
                adj[route[i], route[i+1]] = 1.0
                adj[route[i+1], route[i]] = 1.0  # Undirected
        
        # Node features
        node_features = np.zeros((self.max_nodes, self.feature_dim), dtype=np.float32)
        for i, node_id in enumerate(route):
            if node_id < self.max_nodes:
                # Feature: [is_in_route, route_position, is_source, is_dest, 
                #           x_coord, y_coord, is_charging, traffic_level]
                node_data = road_graph.graph.nodes.get(node_id, {})
                node_features[node_id, 0] = 1.0  # In route
                node_features[node_id, 1] = i / max(len(route), 1)  # Position
                node_features[node_id, 2] = 1.0 if i == 0 else 0.0  # Source
                node_features[node_id, 3] = 1.0 if i == len(route)-1 else 0.0  # Dest
                node_features[node_id, 4] = node_data.get('x', 0) / road_graph.grid_size
                node_features[node_id, 5] = node_data.get('y', 0) / road_graph.grid_size
                node_features[node_id, 6] = 1.0 if node_id in road_graph.charging_stations else 0.0
                
                # Handle traffic patterns (can be dict or array)
                if hasattr(road_graph.traffic_patterns, 'get'):
                    node_features[node_id, 7] = road_graph.traffic_patterns.get(node_id, 0.5)
                elif isinstance(road_graph.traffic_patterns, np.ndarray):
                    # Use average traffic
                    node_features[node_id, 7] = float(np.mean(road_graph.traffic_patterns))
                else:
                    node_features[node_id, 7] = 0.5
        
        # Edge features (simplified)
        edge_features = adj.copy()
        
        # Calculate route metrics
        total_energy = 0.0
        total_time = 0.0
        is_valid = True
        
        for i in range(len(route) - 1):
            edge = (route[i], route[i+1])
            if road_graph.graph.has_edge(*edge):
                edge_data = road_graph.graph.edges[edge]
                total_energy += edge_data.get('energy_kwh', 0.1)
                total_time += edge_data.get('time_minutes', 1.0)
            else:
                is_valid = False
        
        return EncodedRoute(
            node_sequence=route,
            adjacency_matrix=adj,
            node_features=node_features,
            edge_features=edge_features,
            ev_state=ev_state,
            total_energy=total_energy,
            total_time=total_time,
            is_valid=is_valid
        )
    
    def encode_batch(self, 
                    routes: List[List[int]], 
                    road_graph: Any,
                    ev_states: np.ndarray) -> Dict[str, np.ndarray]:
        """Encode multiple routes for batch processing."""
        batch_adj = []
        batch_node_feat = []
        batch_ev = []
        batch_labels = []
        
        for i, route in enumerate(routes):
            ev_state = ev_states[i] if i < len(ev_states) else ev_states[0]
            encoded = self.encode_route(route, road_graph, ev_state)
            
            batch_adj.append(encoded.adjacency_matrix)
            batch_node_feat.append(encoded.node_features)
            batch_ev.append(ev_state)
            batch_labels.append([
                1.0 if encoded.is_valid else 0.0,
                1.0 if encoded.total_energy < ev_state[0] * 60 else 0.0,  # Energy feasible
                1.0  # Placeholder for realism
            ])
        
        return {
            'adjacency': np.array(batch_adj),
            'node_features': np.array(batch_node_feat),
            'ev_states': np.array(batch_ev),
            'labels': np.array(batch_labels)
        }


# ============================================================================
# GRAPH NEURAL NETWORK LAYERS
# ============================================================================

class GraphConvLayer(layers.Layer):
    """
    Graph Convolutional Layer.
    
    Aggregates information from neighboring nodes using the adjacency matrix.
    """
    
    def __init__(self, units: int, activation='relu', **kwargs):
        super().__init__(**kwargs)
        self.units = units
        self.activation_fn = keras.activations.get(activation)
    
    def build(self, input_shape):
        # input_shape is node_features shape: (batch, nodes, features)
        feature_dim = input_shape[-1]
        self.W = self.add_weight(
            name='W',
            shape=(feature_dim, self.units),
            initializer='glorot_uniform',
            trainable=True
        )
        self.b = self.add_weight(
            name='b',
            shape=(self.units,),
            initializer='zeros',
            trainable=True
        )
        super().build(input_shape)
    
    def call(self, node_features, adjacency):
        """
        Args:
            node_features: (batch, nodes, features)
            adjacency: (batch, nodes, nodes)
        """
        # Normalize adjacency (add self-loops)
        identity = tf.eye(tf.shape(adjacency)[1], batch_shape=[tf.shape(adjacency)[0]])
        adj_with_self = adjacency + identity
        
        # Degree normalization D^(-1/2) * A * D^(-1/2)
        degree = tf.reduce_sum(adj_with_self, axis=-1, keepdims=True)
        degree = tf.maximum(degree, 1.0)  # Avoid division by zero
        norm = 1.0 / tf.sqrt(degree)
        adj_norm = adj_with_self * norm * tf.transpose(norm, [0, 2, 1])
        
        # Graph convolution: A * X * W + b
        agg = tf.matmul(adj_norm, node_features)
        output = tf.matmul(agg, self.W) + self.b
        
        return self.activation_fn(output)
    
    def get_config(self):
        config = super().get_config()
        config.update({'units': self.units})
        return config


class GraphAttentionLayerV2(layers.Layer):
    """
    Graph Attention Layer (GAT) - Version 2.
    
    Uses multi-head attention to weight neighbor contributions.
    """
    
    def __init__(self, units: int, num_heads: int = 4, dropout: float = 0.1, **kwargs):
        super().__init__(**kwargs)
        self.units = units
        self.num_heads = num_heads
        self.dropout_rate = dropout
    
    def build(self, input_shape):
        feature_dim = input_shape[-1]
        
        # Per-head transformation
        self.W = self.add_weight(
            name='W',
            shape=(self.num_heads, feature_dim, self.units),
            initializer='glorot_uniform'
        )
        
        # Attention weights
        self.a_src = self.add_weight(
            name='a_src',
            shape=(self.num_heads, self.units, 1),
            initializer='glorot_uniform'
        )
        self.a_dst = self.add_weight(
            name='a_dst', 
            shape=(self.num_heads, self.units, 1),
            initializer='glorot_uniform'
        )
        
        self.dropout = layers.Dropout(self.dropout_rate)
        super().build(input_shape)
    
    def call(self, node_features, adjacency, training=False):
        """
        Args:
            node_features: (batch, nodes, features)
            adjacency: (batch, nodes, nodes)
        """
        batch_size = tf.shape(node_features)[0]
        num_nodes = tf.shape(node_features)[1]
        
        # Transform for each head: (batch, heads, nodes, units)
        h = tf.einsum('bnf,hfu->bhnu', node_features, self.W)
        
        # Compute attention scores
        attn_src = tf.einsum('bhnu,hud->bhnd', h, self.a_src)  # (batch, heads, nodes, 1)
        attn_dst = tf.einsum('bhnu,hud->bhnd', h, self.a_dst)
        
        # Broadcast to get pairwise scores
        attn_scores = attn_src + tf.transpose(attn_dst, [0, 1, 3, 2])  # (batch, heads, nodes, nodes)
        attn_scores = tf.nn.leaky_relu(attn_scores, alpha=0.2)
        
        # Mask invalid edges
        adj_expanded = tf.expand_dims(adjacency, 1)  # (batch, 1, nodes, nodes)
        mask = tf.where(adj_expanded > 0, 0.0, -1e9)
        attn_scores = attn_scores + mask
        
        # Softmax
        attn_weights = tf.nn.softmax(attn_scores, axis=-1)
        attn_weights = self.dropout(attn_weights, training=training)
        
        # Aggregate
        output = tf.einsum('bhmn,bhnu->bhmu', attn_weights, h)  # (batch, heads, nodes, units)
        
        # Concat heads
        output = tf.transpose(output, [0, 2, 1, 3])  # (batch, nodes, heads, units)
        output = tf.reshape(output, [batch_size, num_nodes, self.num_heads * self.units])
        
        return output
    
    def get_config(self):
        config = super().get_config()
        config.update({
            'units': self.units,
            'num_heads': self.num_heads,
            'dropout': self.dropout_rate
        })
        return config


# ============================================================================
# GNN ROUTE GENERATOR
# ============================================================================

class GNNRouteGenerator(Model):
    """
    GNN-based Route Generator.
    
    Architecture:
    - Input: noise + source/dest + EV state + traffic
    - GNN layers to process graph structure
    - Output: Route probability distribution over nodes
    """
    
    def __init__(self,
                 num_nodes: int = 100,
                 node_feature_dim: int = 8,
                 noise_dim: int = 64,
                 ev_state_dim: int = 5,
                 hidden_dim: int = 128,
                 num_gnn_layers: int = 3,
                 **kwargs):
        super().__init__(**kwargs)
        
        self.num_nodes = num_nodes
        self.node_feature_dim = node_feature_dim
        self.noise_dim = noise_dim
        self.ev_state_dim = ev_state_dim
        
        # Input processing
        self.noise_dense = layers.Dense(hidden_dim, activation='relu')
        self.ev_dense = layers.Dense(hidden_dim, activation='relu')
        self.condition_dense = layers.Dense(hidden_dim, activation='relu')
        
        # Combine inputs
        self.combine_dense = layers.Dense(node_feature_dim)
        
        # GNN layers
        self.gnn_layers = []
        for i in range(num_gnn_layers):
            self.gnn_layers.append(
                GraphConvLayer(hidden_dim, activation='relu', name=f'gcn_{i}')
            )
        
        # Attention layer
        self.attention = GraphAttentionLayerV2(hidden_dim // 4, num_heads=4)
        
        # Output: node selection probability
        self.output_dense = layers.Dense(1, activation='sigmoid')
        
        # Route sequence decoder
        self.seq_lstm = layers.LSTM(hidden_dim, return_sequences=True)
        self.seq_dense = layers.Dense(num_nodes, activation='softmax')
    
    def _build_initial_features(self, noise, ev_state, source_dest, batch_size):
        """Build initial node features from inputs."""
        # Process inputs
        noise_feat = self.noise_dense(noise)
        ev_feat = self.ev_dense(ev_state)
        cond_feat = self.condition_dense(source_dest)
        
        # Combine
        combined = tf.concat([noise_feat, ev_feat, cond_feat], axis=-1)
        node_init = self.combine_dense(combined)  # (batch, node_feature_dim)
        
        # Broadcast to all nodes
        node_features = tf.tile(
            tf.expand_dims(node_init, 1), 
            [1, self.num_nodes, 1]
        )
        
        return node_features
    
    def call(self, inputs, adjacency=None, training=False):
        """
        Generate route.
        
        Args:
            inputs: [noise, ev_state, source_dest_encoding]
            adjacency: Road graph adjacency matrix
        
        Returns:
            Route probabilities for each node
        """
        noise, ev_state, source_dest = inputs
        batch_size = tf.shape(noise)[0]
        
        # Build initial features
        node_features = self._build_initial_features(
            noise, ev_state, source_dest, batch_size
        )
        
        # If no adjacency provided, use fully connected
        if adjacency is None:
            adjacency = tf.ones((batch_size, self.num_nodes, self.num_nodes))
        
        # GNN message passing
        x = node_features
        for gnn_layer in self.gnn_layers:
            x = gnn_layer(x, adjacency)
        
        # Attention
        x = self.attention(x, adjacency, training=training)
        
        # Node selection probabilities
        node_probs = tf.squeeze(self.output_dense(x), axis=-1)  # (batch, nodes)
        
        return node_probs
    
    def generate_route(self, 
                      source: int, 
                      destination: int,
                      adjacency: np.ndarray,
                      ev_state: np.ndarray,
                      max_length: int = 30) -> List[int]:
        """
        Generate a complete route from source to destination.
        
        Uses greedy decoding with the learned probabilities.
        """
        # Prepare inputs
        noise = np.random.normal(0, 1, (1, self.noise_dim)).astype(np.float32)
        ev_state = np.reshape(ev_state, (1, -1)).astype(np.float32)
        
        # Source-dest encoding
        source_dest = np.zeros((1, self.num_nodes * 2), dtype=np.float32)
        source_dest[0, source] = 1.0
        source_dest[0, self.num_nodes + destination] = 1.0
        
        # Reduce to smaller dim
        source_dest = source_dest[:, :20]  # Take first 20 as condition
        
        adjacency = np.expand_dims(adjacency, 0).astype(np.float32)
        
        # Get node probabilities
        probs = self([
            tf.constant(noise),
            tf.constant(ev_state),
            tf.constant(source_dest)
        ], tf.constant(adjacency)).numpy()[0]
        
        # Greedy path construction
        route = [source]
        current = source
        visited = {source}
        
        for _ in range(max_length):
            if current == destination:
                break
            
            # Get neighbors
            neighbors = np.where(adjacency[0, current] > 0)[0]
            
            if len(neighbors) == 0:
                break
            
            # Filter visited
            unvisited = [n for n in neighbors if n not in visited]
            
            if not unvisited:
                # Allow backtracking if stuck
                unvisited = list(neighbors)
            
            # Select based on probability + distance heuristic
            best_next = None
            best_score = -np.inf
            
            for n in unvisited:
                # Combine learned prob with destination distance
                dist_to_dest = abs(n - destination)  # Simple heuristic
                score = probs[n] - 0.01 * dist_to_dest
                
                if score > best_score:
                    best_score = score
                    best_next = n
            
            if best_next is None:
                break
            
            route.append(best_next)
            visited.add(best_next)
            current = best_next
        
        return route


# ============================================================================
# GNN ROUTE DISCRIMINATOR
# ============================================================================

class GNNRouteDiscriminator(Model):
    """
    GNN-based Route Discriminator.
    
    Evaluates routes on:
    - Route validity (connected path)
    - Energy feasibility
    - Traffic realism
    - Graph connectivity
    """
    
    def __init__(self,
                 num_nodes: int = 100,
                 node_feature_dim: int = 8,
                 ev_state_dim: int = 5,
                 hidden_dim: int = 128,
                 **kwargs):
        super().__init__(**kwargs)
        
        self.num_nodes = num_nodes
        
        # Node feature processing
        self.node_encoder = layers.Dense(hidden_dim, activation='relu')
        
        # GNN layers for route analysis
        self.gnn1 = GraphConvLayer(hidden_dim, activation='relu')
        self.gnn2 = GraphConvLayer(hidden_dim, activation='relu')
        self.attention = GraphAttentionLayerV2(hidden_dim // 4, num_heads=4)
        
        # EV state processing
        self.ev_encoder = layers.Dense(hidden_dim, activation='relu')
        
        # Global pooling
        self.global_pool = layers.GlobalAveragePooling1D()
        
        # Classification heads
        self.fc1 = layers.Dense(256, activation='relu')
        self.dropout = layers.Dropout(0.3)
        self.fc2 = layers.Dense(128, activation='relu')
        
        # Multi-task outputs
        self.validity_head = layers.Dense(1, activation='sigmoid', name='validity')
        self.energy_head = layers.Dense(1, activation='sigmoid', name='energy_feasibility')
        self.realism_head = layers.Dense(1, activation='sigmoid', name='realism')
        self.connectivity_head = layers.Dense(1, activation='sigmoid', name='connectivity')
    
    def call(self, inputs, training=False):
        """
        Evaluate route.
        
        Args:
            inputs: [node_features, adjacency, ev_state]
        
        Returns:
            Dict with validity, energy_feasibility, realism, connectivity scores
        """
        node_features, adjacency, ev_state = inputs
        
        # Encode nodes
        x = self.node_encoder(node_features)
        
        # GNN processing
        x = self.gnn1(x, adjacency)
        x = self.gnn2(x, adjacency)
        x = self.attention(x, adjacency, training=training)
        
        # Global representation
        graph_repr = self.global_pool(x)
        
        # Add EV state
        ev_repr = self.ev_encoder(ev_state)
        combined = tf.concat([graph_repr, ev_repr], axis=-1)
        
        # Classification
        h = self.fc1(combined)
        h = self.dropout(h, training=training)
        h = self.fc2(h)
        
        # Multi-task outputs
        validity = self.validity_head(h)
        energy = self.energy_head(h)
        realism = self.realism_head(h)
        connectivity = self.connectivity_head(h)
        
        # Combined score
        combined_score = (validity + energy + realism + connectivity) / 4.0
        
        return {
            'combined': combined_score,
            'validity': validity,
            'energy_feasibility': energy,
            'realism': realism,
            'connectivity': connectivity
        }


# ============================================================================
# COMPLETE GNN ROUTE GAN
# ============================================================================

class GNNRouteGAN:
    """
    Complete GNN-based GAN for route generation.
    
    Follows the architecture diagram:
    - Generator: Produces candidate routes given conditions
    - Discriminator: Validates routes on multiple criteria
    """
    
    def __init__(self,
                 num_nodes: int = 100,
                 node_feature_dim: int = 8,
                 noise_dim: int = 64,
                 ev_state_dim: int = 5):
        
        self.num_nodes = num_nodes
        self.noise_dim = noise_dim
        self.ev_state_dim = ev_state_dim
        self.node_feature_dim = node_feature_dim
        
        print("🏗️ Building GNN Route Generator...")
        self.generator = GNNRouteGenerator(
            num_nodes=num_nodes,
            node_feature_dim=node_feature_dim,
            noise_dim=noise_dim,
            ev_state_dim=ev_state_dim
        )
        
        print("🏗️ Building GNN Route Discriminator...")
        self.discriminator = GNNRouteDiscriminator(
            num_nodes=num_nodes,
            node_feature_dim=node_feature_dim,
            ev_state_dim=ev_state_dim
        )
        
        # Route encoder
        self.encoder = RouteEncoder(max_nodes=num_nodes, feature_dim=node_feature_dim)
        
        # Optimizers
        self.g_optimizer = keras.optimizers.Adam(1e-4, beta_1=0.5)
        self.d_optimizer = keras.optimizers.Adam(1e-4, beta_1=0.5)
        
        # Loss
        self.bce = keras.losses.BinaryCrossentropy()
        
        # History
        self.history = {'g_loss': [], 'd_loss': []}
    
    def train_step(self, 
                  real_routes: List[List[int]], 
                  road_graph: Any,
                  ev_states: np.ndarray):
        """Single training step."""
        batch_size = len(real_routes)
        
        # Encode real routes
        encoded = self.encoder.encode_batch(real_routes, road_graph, ev_states)
        
        real_adj = tf.constant(encoded['adjacency'], dtype=tf.float32)
        real_node_feat = tf.constant(encoded['node_features'], dtype=tf.float32)
        real_ev = tf.constant(encoded['ev_states'], dtype=tf.float32)
        real_labels = tf.ones((batch_size, 1))
        fake_labels = tf.zeros((batch_size, 1))
        
        # Generate fake routes
        noise = tf.random.normal((batch_size, self.noise_dim))
        source_dest = tf.random.uniform((batch_size, 20), 0, 1)
        
        # ----- Train Discriminator -----
        with tf.GradientTape() as tape:
            # Real routes
            real_output = self.discriminator([real_node_feat, real_adj, real_ev], training=True)
            d_loss_real = self.bce(real_labels, real_output['combined'])
            
            # Fake routes
            fake_probs = self.generator([noise, real_ev, source_dest], real_adj, training=False)
            
            # Convert probs to fake features (simplified)
            fake_node_feat = tf.expand_dims(fake_probs, -1)
            fake_node_feat = tf.tile(fake_node_feat, [1, 1, self.node_feature_dim])
            
            fake_output = self.discriminator([fake_node_feat, real_adj, real_ev], training=True)
            d_loss_fake = self.bce(fake_labels, fake_output['combined'])
            
            d_loss = d_loss_real + d_loss_fake
        
        d_grads = tape.gradient(d_loss, self.discriminator.trainable_variables)
        self.d_optimizer.apply_gradients(zip(d_grads, self.discriminator.trainable_variables))
        
        # ----- Train Generator -----
        with tf.GradientTape() as tape:
            fake_probs = self.generator([noise, real_ev, source_dest], real_adj, training=True)
            
            fake_node_feat = tf.expand_dims(fake_probs, -1)
            fake_node_feat = tf.tile(fake_node_feat, [1, 1, self.node_feature_dim])
            
            fake_output = self.discriminator([fake_node_feat, real_adj, real_ev], training=False)
            g_loss = self.bce(real_labels, fake_output['combined'])
        
        g_grads = tape.gradient(g_loss, self.generator.trainable_variables)
        self.g_optimizer.apply_gradients(zip(g_grads, self.generator.trainable_variables))
        
        return float(d_loss), float(g_loss)
    
    def train(self,
             road_graph: Any,
             historical_routes: List[List[int]],
             ev_states: np.ndarray,
             epochs: int = 50,
             batch_size: int = 16,
             verbose: bool = True):
        """
        Train the GNN Route GAN.
        
        Args:
            road_graph: RoadGraph object
            historical_routes: List of historical route sequences
            ev_states: EV state features for each route
            epochs: Training epochs
            batch_size: Batch size
        """
        if verbose:
            print("\n" + "=" * 60)
            print("TRAINING GNN ROUTE GAN")
            print("=" * 60)
        
        n_samples = len(historical_routes)
        n_batches = max(1, n_samples // batch_size)
        
        for epoch in range(epochs):
            epoch_d_loss = []
            epoch_g_loss = []
            
            # Shuffle
            indices = np.random.permutation(n_samples)
            
            for batch_idx in range(n_batches):
                start = batch_idx * batch_size
                end = min(start + batch_size, n_samples)
                batch_indices = indices[start:end]
                
                batch_routes = [historical_routes[i] for i in batch_indices]
                batch_ev = ev_states[batch_indices] if len(ev_states) > 1 else np.tile(ev_states, (len(batch_indices), 1))
                
                d_loss, g_loss = self.train_step(batch_routes, road_graph, batch_ev)
                
                epoch_d_loss.append(d_loss)
                epoch_g_loss.append(g_loss)
            
            avg_d = np.mean(epoch_d_loss)
            avg_g = np.mean(epoch_g_loss)
            
            self.history['d_loss'].append(avg_d)
            self.history['g_loss'].append(avg_g)
            
            if verbose and (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1}/{epochs} - D Loss: {avg_d:.4f}, G Loss: {avg_g:.4f}")
        
        if verbose:
            print("✅ GNN Route GAN training complete!")
    
    def generate_route(self,
                      source: int,
                      destination: int,
                      road_graph: Any,
                      ev_state: np.ndarray) -> List[int]:
        """Generate a route from source to destination."""
        # Get adjacency from road graph
        import networkx as nx
        adj = nx.adjacency_matrix(road_graph.graph).toarray().astype(np.float32)
        
        # Pad/truncate to match expected size
        if adj.shape[0] < self.num_nodes:
            pad_size = self.num_nodes - adj.shape[0]
            adj = np.pad(adj, ((0, pad_size), (0, pad_size)))
        elif adj.shape[0] > self.num_nodes:
            adj = adj[:self.num_nodes, :self.num_nodes]
        
        return self.generator.generate_route(source, destination, adj, ev_state)
    
    def save(self, path: str):
        """Save models."""
        import os
        os.makedirs(path, exist_ok=True)
        self.generator.save_weights(f"{path}/gnn_generator.weights.h5")
        self.discriminator.save_weights(f"{path}/gnn_discriminator.weights.h5")
        print(f"✅ GNN Route GAN saved to {path}")
    
    def load(self, path: str):
        """Load models."""
        # Build models first
        dummy_noise = tf.zeros((1, self.noise_dim))
        dummy_ev = tf.zeros((1, self.ev_state_dim))
        dummy_cond = tf.zeros((1, 20))
        dummy_adj = tf.zeros((1, self.num_nodes, self.num_nodes))
        dummy_feat = tf.zeros((1, self.num_nodes, self.node_feature_dim))
        
        _ = self.generator([dummy_noise, dummy_ev, dummy_cond], dummy_adj)
        _ = self.discriminator([dummy_feat, dummy_adj, dummy_ev])
        
        self.generator.load_weights(f"{path}/gnn_generator.weights.h5")
        self.discriminator.load_weights(f"{path}/gnn_discriminator.weights.h5")
        print(f"✅ GNN Route GAN loaded from {path}")


# ============================================================================
# HISTORICAL ROUTE DATA GENERATOR (for training)
# ============================================================================

def generate_historical_routes(road_graph: Any, 
                              n_routes: int = 500,
                              min_length: int = 5,
                              max_length: int = 20) -> Tuple[List[List[int]], np.ndarray]:
    """
    Generate synthetic historical routes for training.
    
    Args:
        road_graph: RoadGraph object
        n_routes: Number of routes to generate
        min_length: Minimum route length
        max_length: Maximum route length
    
    Returns:
        routes: List of node sequences
        ev_states: EV state features
    """
    import networkx as nx
    
    routes = []
    ev_states = []
    
    nodes = list(road_graph.graph.nodes())
    
    for _ in range(n_routes):
        # Random source and destination
        source = np.random.choice(nodes)
        dest = np.random.choice(nodes)
        
        if source == dest:
            continue
        
        try:
            # Get shortest path
            path = nx.shortest_path(road_graph.graph, source, dest, weight='distance_km')
            
            if min_length <= len(path) <= max_length:
                routes.append(path)
                
                # Generate random EV state
                ev_state = np.array([
                    np.random.uniform(0.3, 1.0),  # Battery SoC
                    np.random.uniform(0.5, 1.0),  # Energy remaining
                    np.random.uniform(0.3, 1.0),  # Range
                    np.random.uniform(0, 1),      # Time of day
                    np.random.uniform(0.1, 0.3),  # Energy rate
                ], dtype=np.float32)
                
                ev_states.append(ev_state)
        except nx.NetworkXNoPath:
            continue
    
    return routes, np.array(ev_states)


# ============================================================================
# DEMO / TEST
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("GNN ROUTE GENERATOR - Demo")
    print("=" * 60)
    
    # Import road graph
    from road_graph import RoadGraph, EVState
    
    # Create road network
    print("\n1. Creating road network...")
    road_graph = RoadGraph(grid_size=10)
    print(f"   Nodes: {road_graph.num_nodes}, Edges: {road_graph.num_edges}")
    
    # Generate historical routes
    print("\n2. Generating historical routes...")
    routes, ev_states = generate_historical_routes(road_graph, n_routes=200)
    print(f"   Generated {len(routes)} routes")
    
    # Create GAN
    print("\n3. Creating GNN Route GAN...")
    gan = GNNRouteGAN(
        num_nodes=road_graph.num_nodes,
        noise_dim=64,
        ev_state_dim=5
    )
    
    # Train
    print("\n4. Training GNN Route GAN...")
    gan.train(
        road_graph=road_graph,
        historical_routes=routes,
        ev_states=ev_states,
        epochs=20,
        batch_size=16
    )
    
    # Generate route
    print("\n5. Generating new route...")
    test_ev = np.array([0.8, 0.7, 0.6, 0.5, 0.15], dtype=np.float32)
    generated_route = gan.generate_route(0, 99, road_graph, test_ev)
    print(f"   Generated route: {generated_route[:10]}..." if len(generated_route) > 10 else f"   Generated route: {generated_route}")
    
    print("\n✅ Demo complete!")
