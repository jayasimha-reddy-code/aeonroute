# test_environment.py
import pytest
from src.environment import EVRoutingEnvironment, LegacyEVRoutingEnvironment
import numpy as np


def test_environment_reset():
    """Test that environment can be reset and returns valid state."""
    env = EVRoutingEnvironment(grid_size=5, max_battery=100)
    state = env.reset()
    
    # Should return a tuple (legacy state, info dict) or just state
    assert state is not None
    print(f"✅ Reset successful: {type(state)}")


def test_environment_step():
    """Test that environment step works with random actions."""
    env = EVRoutingEnvironment(grid_size=5, max_battery=100)
    state = env.reset()
    
    # Take a few steps
    for step in range(5):
        action = env._get_valid_actions()[0] if hasattr(env, '_get_valid_actions') else 0
        result = env.step(action)
        
        # Handle both old (4-tuple) and new (5-tuple) formats
        if len(result) == 5:
            obs, reward, terminated, truncated, info = result
            done = terminated or truncated
        else:
            state, reward, done, info = result
        
        assert isinstance(reward, (int, float)), f"Reward should be numeric, got {type(reward)}"
        assert isinstance(done, bool), f"Done should be bool, got {type(done)}"
        
        if done:
            break
    
    print(f"✅ Step test passed")


def test_legacy_environment():
    """Test legacy environment compatibility."""
    env = LegacyEVRoutingEnvironment(grid_size=5, max_battery=100)
    state = env.reset()
    
    # Legacy state: (x, y, battery, traffic, hour)
    assert isinstance(state, tuple) and len(state) == 5, f"Legacy state should be 5-tuple, got {state}"
    
    x, y, battery, traffic, hour = state
    assert 0 <= battery <= 100, f"Battery should be 0-100, got {battery}"
    assert 0 <= traffic <= 1, f"Traffic should be 0-1, got {traffic}"
    assert 0 <= hour < 24, f"Hour should be 0-23, got {hour}"
    
    print(f"✅ Legacy environment test passed")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])