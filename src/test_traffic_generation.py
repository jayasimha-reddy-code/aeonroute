# test_traffic_generation.py
"""Unit tests for traffic generation and GAN modules."""

import pytest
import os
import numpy as np
from src.traffic_generator import create_synthetic_traffic, SGGANTrafficGenerator, save_gan, load_gan


def test_create_synthetic_traffic():
    """Test synthetic traffic generation."""
    print("📊 Creating synthetic traffic data...")
    real_traffic = create_synthetic_traffic(n_samples=50, grid_size=5, time_steps=24)
    
    assert real_traffic.shape == (50, 25, 24), f"Expected shape (50, 25, 24), got {real_traffic.shape}"
    assert real_traffic.dtype == np.float32, f"Expected float32, got {real_traffic.dtype}"
    assert np.all((real_traffic >= 0.1) & (real_traffic <= 1.0)), "Traffic values should be in [0.1, 1.0]"
    
    print(f"✅ Synthetic traffic shape: {real_traffic.shape}")


def test_gan_initialization():
    """Test GAN model initialization."""
    print("🏗️ Building GAN...")
    gan = SGGANTrafficGenerator(input_shape=(25, 24), noise_dim=100)
    
    assert gan.generator is not None, "Generator not initialized"
    assert gan.discriminator is not None, "Discriminator not initialized"
    
    print("✅ GAN initialization successful")


def test_gan_training():
    """Test GAN training with small dataset."""
    print("📊 Creating small traffic dataset for GAN test...")
    real_traffic = create_synthetic_traffic(n_samples=30, grid_size=5, time_steps=24)
    real_traffic_normalized = real_traffic * 2 - 1  # Normalize to [-1, 1]
    
    print("🏗️ Building GAN...")
    gan = SGGANTrafficGenerator(input_shape=real_traffic.shape[1:], noise_dim=100)
    
    print("🎓 Training GAN (1 epoch for test)...")
    gan.train(real_traffic_normalized, epochs=1, batch_size=8, verbose=False)
    
    print("✅ GAN training completed successfully")


def test_gan_generation():
    """Test traffic scenario generation from GAN."""
    real_traffic = create_synthetic_traffic(n_samples=20, grid_size=5, time_steps=24)
    real_traffic_normalized = real_traffic * 2 - 1
    
    gan = SGGANTrafficGenerator(input_shape=real_traffic.shape[1:], noise_dim=100)
    gan.train(real_traffic_normalized, epochs=1, batch_size=8, verbose=False)
    
    print("🎲 Generating traffic scenarios...")
    generated_traffic = gan.generate_traffic_scenarios(n_samples=10)
    
    assert generated_traffic.shape[0] == 10, f"Expected 10 samples, got {generated_traffic.shape[0]}"
    assert generated_traffic.shape[1:] == real_traffic.shape[1:], "Generated shape mismatch"
    
    print(f"✅ Generated {generated_traffic.shape[0]} traffic scenarios")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

