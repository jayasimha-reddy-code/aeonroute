---
phase: 5
plan: 2
wave: 1
---

# Plan 5.2: Backend Unit Test Expansion (≥70% Coverage Target)

## Objective
Expand backend Python test coverage to ≥70% by adding unit tests for core modules: `road_graph`, `environment`, `route_generator`, and `traffic_generator`. Existing tests cover API endpoints — this plan adds direct module-level testing.

## Context
- src/road_graph.py — Road network creation + pathfinding
- src/environment.py — Gymnasium EV routing environment
- src/route_generator.py — Route generation (Dijkstra, A*, k-shortest)
- src/traffic_generator.py — SG-GAN traffic synthesis
- src/test_environment.py — Existing environment tests (small)
- src/test_traffic_generation.py — Existing traffic tests (small)
- tests/test_api.py — Existing API integration tests (13 tests)
- pyproject.toml — pytest + coverage config

## Tasks

<task type="auto">
  <name>Expand road_graph and route_generator tests</name>
  <files>src/test_road_graph.py, src/test_route_generator.py</files>
  <action>
    **test_road_graph.py** (NEW):
    1. Test: create_grid_network returns valid NetworkX graph
    2. Test: nodes have required attributes (pos, is_charging, road_type)
    3. Test: edges have required attributes (weight, distance, road_type)
    4. Test: grid_size=5 creates 25 nodes
    5. Test: charging stations are placed (count > 0)
    6. Test: small grid (3×3) works without error
    7. Test: large grid boundary (50×50) works without error
    
    **test_route_generator.py** (NEW):
    1. Test: generate route returns list of Route objects
    2. Test: route contains valid path (all nodes exist in graph)
    3. Test: route energy consumption is non-negative
    4. Test: route distance is positive for non-trivial paths
    5. Test: source == destination raises appropriate error/returns empty
    6. Test: k-shortest returns up to k routes
    
    **Guidelines:**
    - Use `pytest.fixture` for shared graph creation
    - Mark slow tests with `@pytest.mark.slow`
    - Import modules directly, don't go through API layer
  </action>
  <verify>pytest src/test_road_graph.py src/test_route_generator.py -v (all pass)</verify>
  <done>
    - 2 new test files with ~13 tests
    - All tests pass
    - Coverage for road_graph and route_generator increases
  </done>
</task>

<task type="auto">
  <name>Expand environment + traffic_generator tests + coverage report</name>
  <files>src/test_environment.py, src/test_traffic_generation.py</files>
  <action>
    **test_environment.py** (MODIFY — add tests to existing file):
    1. Test: env.reset() returns valid observation
    2. Test: env.step() returns (obs, reward, done, truncated, info)
    3. Test: agent reaches destination with enough battery
    4. Test: agent runs out of battery (negative reward)
    5. Test: observation space matches expected shape
    
    **test_traffic_generation.py** (MODIFY — add tests to existing file):
    1. Test: traffic patterns have 24-hour temporal dimension
    2. Test: generated traffic volumes are non-negative
    3. Test: traffic multipliers are within valid range
    
    **Coverage report:**
    1. Run: `pytest src -v --cov=src --cov-report=term-missing --cov-report=html`
    2. Record coverage percentage
    3. If < 70%, identify uncovered modules and note them
  </action>
  <verify>pytest src -v --cov=src --cov-report=term-missing (≥70% line coverage)</verify>
  <done>
    - Existing test files expanded with new tests
    - Line coverage ≥ 70% for src/ modules
    - Coverage report generated (term-missing)
    - All tests pass
  </done>
</task>

## Success Criteria
- [ ] road_graph tests pass with graph validation
- [ ] route_generator tests pass with path validation
- [ ] environment tests cover reset/step/termination
- [ ] traffic tests cover temporal patterns
- [ ] Overall src/ coverage ≥ 70% (pytest-cov)
- [ ] No regressions in existing API tests
