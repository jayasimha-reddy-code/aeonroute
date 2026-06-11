"""Tests for model loading — verifies that all model artifacts can be loaded
using the production loading strategy without errors.

Run with:
    pytest tests/test_model_loading.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def tf():
    """Ensure TensorFlow is available."""
    pytest.importorskip("tensorflow", reason="TensorFlow not installed")
    import tensorflow as _tf
    return _tf


# ── SG-GAN loading ───────────────────────────────────────────────────────────

class TestSGGANLoading:
    """Verify SGGANTrafficGenerator loads successfully."""

    def _find_sg_prefix(self) -> str:
        """Find SG-GAN model prefix."""
        prefixes = [
            PROJECT_ROOT / "models" / "sg_gan" / "traffic_gan",
            PROJECT_ROOT / "src" / "models" / "sg_gan" / "traffic_gan",
        ]
        for p in prefixes:
            if Path(str(p) + "_generator.keras").exists():
                return str(p)
        return None

    def test_sggan_files_exist(self):
        """SG-GAN .keras files must exist."""
        prefix = self._find_sg_prefix()
        assert prefix is not None, (
            "SG-GAN files not found in models/sg_gan/ or src/models/sg_gan/. "
            "Run training first."
        )
        assert Path(prefix + "_generator.keras").exists()
        assert Path(prefix + "_discriminator.keras").exists()

    def test_sggan_instantiation(self, tf):
        """SGGANTrafficGenerator must be importable and instantiable."""
        from src.traffic_generator import SGGANTrafficGenerator
        sg = SGGANTrafficGenerator()
        assert sg.generator is not None
        assert sg.discriminator is not None

    def test_sggan_load(self, tf):
        """SGGANTrafficGenerator.load() must not raise."""
        prefix = self._find_sg_prefix()
        if prefix is None:
            pytest.skip("SG-GAN model files not found")
        from src.traffic_generator import SGGANTrafficGenerator
        sg = SGGANTrafficGenerator()
        # Should not raise
        sg.load(prefix)
        # Models remain the same instances (weights updated in place or replaced)
        assert sg.generator is not None
        assert sg.discriminator is not None

    def test_sggan_generator_forward(self, tf):
        """SGGANGenerator forward pass must return (batch, num_roads, time_steps)."""
        prefix = self._find_sg_prefix()
        if prefix is None:
            pytest.skip("SG-GAN model files not found")
        import numpy as np
        from src.traffic_generator import SGGANTrafficGenerator
        sg = SGGANTrafficGenerator()
        sg.load(prefix)

        noise  = tf.random.normal((2, sg.noise_dim))
        ev     = tf.zeros((2, sg.ev_state_dim))
        cond   = tf.zeros((2, sg.condition_dim))
        out    = sg.generator([noise, ev, cond], training=False)
        assert out.shape[0] == 2
        assert len(out.shape) == 3

    def test_sggan_discriminator_forward(self, tf):
        """SGGANDiscriminator forward pass must return validity/energy/realism dicts."""
        prefix = self._find_sg_prefix()
        if prefix is None:
            pytest.skip("SG-GAN model files not found")
        from src.traffic_generator import SGGANTrafficGenerator
        sg = SGGANTrafficGenerator()
        sg.load(prefix)

        num_roads, time_steps = sg.input_shape
        data  = tf.zeros((1, num_roads, time_steps))
        ev    = tf.zeros((1, sg.ev_state_dim))
        cond  = tf.zeros((1, sg.condition_dim))
        out   = sg.discriminator([data, ev, cond], training=False)

        assert "combined" in out
        assert "validity" in out
        assert "energy_feasibility" in out
        assert "realism" in out
        # Scores should be in [0, 1]
        for key in ("combined", "validity", "energy_feasibility", "realism"):
            val = float(out[key].numpy().mean())
            assert 0.0 <= val <= 1.0, f"{key}={val} out of [0,1]"

    def test_sggan_traffic_scenarios(self, tf):
        """generate_traffic_scenarios() must return plausible-shaped array."""
        prefix = self._find_sg_prefix()
        if prefix is None:
            pytest.skip("SG-GAN model files not found")
        from src.traffic_generator import SGGANTrafficGenerator
        sg = SGGANTrafficGenerator()
        sg.load(prefix)

        scenarios = sg.generate_traffic_scenarios(n_samples=3)
        assert scenarios is not None
        assert scenarios.shape[0] == 3
        assert len(scenarios.shape) == 3  # (n_samples, num_roads, time_steps)


# ── GNN loading ───────────────────────────────────────────────────────────────

class TestGNNLoading:
    """Verify GNNRouteGAN loads successfully."""

    def _find_gnn_paths(self):
        search_dirs = [
            PROJECT_ROOT / "models" / "gnn_gan",
            PROJECT_ROOT / "src" / "models" / "gnn_gan",
        ]
        for d in search_dirs:
            for suffix in ["gnn_generator.keras", "gnn_generator.weights.h5"]:
                candidate = d / suffix
                if candidate.exists():
                    disc_suffix = suffix.replace("generator", "discriminator")
                    disc = d / disc_suffix
                    return candidate, disc if disc.exists() else None
        return None, None

    def test_gnn_files_exist(self):
        """GNN weights files must exist in one of the known locations."""
        gen, disc = self._find_gnn_paths()
        assert gen is not None, (
            "GNN weights not found. Expected at:\n"
            "  models/gnn_gan/gnn_generator.{keras,weights.h5}\n"
            "  src/models/gnn_gan/gnn_generator.{keras,weights.h5}"
        )

    def test_gnn_instantiation(self, tf):
        """GNNRouteGAN must be importable and instantiable."""
        from src.gnn_route_generator import GNNRouteGAN
        gan = GNNRouteGAN()
        assert gan.generator is not None
        assert gan.discriminator is not None

    def test_gnn_weights_load(self, tf):
        """GNN weights must load without error."""
        gen_path, disc_path = self._find_gnn_paths()
        if gen_path is None:
            pytest.skip("GNN weight files not found")
        from src.gnn_route_generator import GNNRouteGAN
        from backend.app.services.gnn_routing_service import _load_weights_from_keras_or_h5
        gan = GNNRouteGAN()
        gen_ok = _load_weights_from_keras_or_h5(gan.generator, gen_path, "test-gen")
        assert gen_ok, f"Generator weight loading failed for {gen_path}"

    def test_gnn_discriminator_weights_load(self, tf):
        """GNN discriminator weights must load without error."""
        gen_path, disc_path = self._find_gnn_paths()
        if disc_path is None:
            pytest.skip("GNN discriminator weight file not found")
        from src.gnn_route_generator import GNNRouteGAN
        from backend.app.services.gnn_routing_service import _load_weights_from_keras_or_h5
        gan = GNNRouteGAN()
        disc_ok = _load_weights_from_keras_or_h5(gan.discriminator, disc_path, "test-disc")
        assert disc_ok, f"Discriminator weight loading failed for {disc_path}"


# ── GNNRoutingService loading ─────────────────────────────────────────────────

class TestGNNRoutingServiceLoading:
    """Verify GNNRoutingService.load_model() loads both models and reports correctly."""

    def test_service_load_returns_true(self, tf):
        """load_model() must return True when model files are present."""
        from backend.app.services.gnn_routing_service import GNNRoutingService
        svc = GNNRoutingService()
        result = svc.load_model(graph=None)
        status = svc.get_status()
        # If files exist, expect True; otherwise skip
        gen_path, _ = TestGNNLoading()._find_gnn_paths()
        if gen_path is None:
            pytest.skip("GNN weight files not present")
        assert result is True, f"load_model() returned False. Status: {status}"

    def test_service_status_gnn_loaded(self, tf):
        """get_status() must report gnn_loaded=True after successful load."""
        from backend.app.services.gnn_routing_service import GNNRoutingService
        gen_path, _ = TestGNNLoading()._find_gnn_paths()
        if gen_path is None:
            pytest.skip("GNN weight files not present")
        svc = GNNRoutingService()
        svc.load_model(graph=None)
        status = svc.get_status()
        assert status["gnn_loaded"] is True

    def test_service_status_sggan_loaded(self, tf):
        """get_status() must report sg_gan_loaded=True after successful load."""
        from backend.app.services.gnn_routing_service import GNNRoutingService
        from backend.app.services.gnn_routing_service import _find_sggan_prefix
        prefix = _find_sggan_prefix(PROJECT_ROOT)
        if prefix is None:
            pytest.skip("SG-GAN model files not present")
        svc = GNNRoutingService()
        svc.load_model(graph=None)
        status = svc.get_status()
        assert status["sg_gan_loaded"] is True

    def test_service_model_paths_populated(self, tf):
        """get_status() must include non-None model_paths after load."""
        from backend.app.services.gnn_routing_service import GNNRoutingService
        gen_path, _ = TestGNNLoading()._find_gnn_paths()
        if gen_path is None:
            pytest.skip("GNN weight files not present")
        svc = GNNRoutingService()
        svc.load_model(graph=None)
        status = svc.get_status()
        paths = status.get("model_paths", {})
        assert paths.get("gnn_generator") is not None, "model_paths.gnn_generator is None"
