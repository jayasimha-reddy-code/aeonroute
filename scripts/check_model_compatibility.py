#!/usr/bin/env python3
"""Model Compatibility Checker for EV Routing System.

Enumerates all model artifacts, attempts to load each using the production
loading strategy, runs a dummy inference forward pass, and prints a
PASS / FAIL report.

Usage:
    python scripts/check_model_compatibility.py

Exit code: 0 if all critical models pass, 1 if any critical model fails.
"""

from __future__ import annotations

import os
import sys
import time
import zipfile
import tempfile
import pathlib
from pathlib import Path
from typing import List, Tuple

# ── Ensure project root is on path ──────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

RESET  = "\033[0m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"

def _ok(msg):  print(f"  {GREEN}✅ PASS{RESET}  {msg}")
def _warn(msg): print(f"  {YELLOW}⚠️  WARN{RESET}  {msg}")
def _fail(msg): print(f"  {RED}❌ FAIL{RESET}  {msg}")
def _info(msg): print(f"  {CYAN}ℹ️  INFO{RESET}  {msg}")


# ── Enumerate model files ────────────────────────────────────────────────────

def enumerate_models() -> List[Path]:
    """Find all model files in known locations."""
    search_dirs = [
        PROJECT_ROOT / "models",
        PROJECT_ROOT / "src" / "models",
    ]
    patterns = ["*.keras", "*.h5", "*.weights.h5", "*.pkl"]
    found = []
    for d in search_dirs:
        if not d.exists():
            continue
        for pat in patterns:
            found.extend(d.rglob(pat))
    return sorted(set(found))


# ── TF/Keras availability ────────────────────────────────────────────────────

def check_tensorflow() -> bool:
    print(f"\n{BOLD}[1/5] TensorFlow Availability{RESET}")
    try:
        import tensorflow as tf
        import keras
        _ok(f"TensorFlow {tf.__version__} / Keras {keras.__version__}")
        return True
    except ImportError as e:
        _fail(f"TensorFlow not installed: {e}")
        return False


# ── File inventory ───────────────────────────────────────────────────────────

def check_file_inventory() -> List[Path]:
    print(f"\n{BOLD}[2/5] Model File Inventory{RESET}")
    files = enumerate_models()
    if not files:
        _warn("No model files found in models/ or src/models/")
    for f in files:
        rel = f.relative_to(PROJECT_ROOT)
        size_kb = round(f.stat().st_size / 1024, 1)
        _info(f"{rel}  ({size_kb} KB)")
    return files


# ── Custom layer registration ────────────────────────────────────────────────

def check_custom_layers() -> bool:
    print(f"\n{BOLD}[3/5] Custom Layer Registration{RESET}")
    try:
        from src.gnn_route_generator import (
            GraphConvLayer, GraphAttentionLayerV2,
            GNNRouteGenerator, GNNRouteDiscriminator, GNNRouteGAN,
        )
        _ok("GraphConvLayer importable")
        _ok("GraphAttentionLayerV2 importable")
        _ok("GNNRouteGAN importable")
    except Exception as e:
        _fail(f"GNN layer import failed: {e}")
        return False

    try:
        from src.traffic_generator import (
            SGGANGenerator, SGGANDiscriminator, SGGANTrafficGenerator,
        )
        _ok("SGGANGenerator importable")
        _ok("SGGANDiscriminator importable")
        _ok("SGGANTrafficGenerator importable")
    except Exception as e:
        _fail(f"SG-GAN import failed: {e}")
        return False

    return True


# ── Model loading ────────────────────────────────────────────────────────────

def _extract_weights_from_keras(keras_path: Path, dest_dir: str) -> Path | None:
    """Extract model.weights.h5 from a .keras ZIP archive."""
    try:
        with zipfile.ZipFile(str(keras_path), "r") as zf:
            zf.extractall(dest_dir)
        w = Path(dest_dir) / "model.weights.h5"
        if w.exists():
            return w
        candidates = list(Path(dest_dir).glob("*.h5"))
        return candidates[0] if candidates else None
    except Exception:
        return None


def check_sggan_loading() -> Tuple[bool, bool]:
    """Check SG-GAN loading. Returns (gen_ok, disc_ok)."""
    print(f"\n{BOLD}[4a/5] SG-GAN Model Loading{RESET}")

    # Find files
    prefixes = [
        PROJECT_ROOT / "models" / "sg_gan" / "traffic_gan",
        PROJECT_ROOT / "src" / "models" / "sg_gan" / "traffic_gan",
    ]
    prefix = None
    for p in prefixes:
        if Path(str(p) + "_generator.keras").exists():
            prefix = p
            break

    if prefix is None:
        _fail("SG-GAN .keras files not found in models/sg_gan/ or src/models/sg_gan/")
        return False, False

    _info(f"Found prefix: {prefix}")

    try:
        from src.traffic_generator import SGGANTrafficGenerator
        t0 = time.perf_counter()
        sg = SGGANTrafficGenerator()
        sg.load(str(prefix))
        elapsed = time.perf_counter() - t0
        _ok(f"SGGANTrafficGenerator loaded in {elapsed:.1f}s")

        # Inference validation
        t1 = time.perf_counter()
        scenarios = sg.generate_traffic_scenarios(n_samples=2)
        elapsed2 = time.perf_counter() - t1
        if scenarios is not None and len(scenarios) > 0:
            _ok(f"SG-GAN inference: generated {scenarios.shape} scenarios in {elapsed2:.2f}s")
        else:
            _warn("SG-GAN inference returned empty/None")

        return True, True

    except Exception as e:
        _fail(f"SG-GAN loading failed: {e}")
        import traceback; traceback.print_exc()
        return False, False


def check_gnn_loading() -> Tuple[bool, bool]:
    """Check GNNRouteGAN loading. Returns (gen_ok, disc_ok)."""
    print(f"\n{BOLD}[4b/5] GNNRouteGAN Model Loading{RESET}")

    # Find files
    search_dirs = [
        PROJECT_ROOT / "models" / "gnn_gan",
        PROJECT_ROOT / "src" / "models" / "gnn_gan",
    ]
    gen_path = None
    disc_path = None
    for d in search_dirs:
        if not d.exists():
            continue
        for suffix in ["gnn_generator.keras", "gnn_generator.weights.h5"]:
            candidate = d / suffix
            if candidate.exists():
                gen_path = candidate
                disc_suffix = suffix.replace("generator", "discriminator")
                disc_candidate = d / disc_suffix
                disc_path = disc_candidate if disc_candidate.exists() else None
                break
        if gen_path:
            break

    if gen_path is None:
        _fail(
            "GNN weights not found. Searched:\n"
            f"    {PROJECT_ROOT}/models/gnn_gan/gnn_generator.{{keras,weights.h5}}\n"
            f"    {PROJECT_ROOT}/src/models/gnn_gan/gnn_generator.{{keras,weights.h5}}"
        )
        return False, False

    _info(f"Generator:     {gen_path.relative_to(PROJECT_ROOT)}")
    _info(f"Discriminator: {disc_path.relative_to(PROJECT_ROOT) if disc_path else 'NOT FOUND'}")

    try:
        from src.gnn_route_generator import GNNRouteGAN
        from backend.app.services.gnn_routing_service import _load_weights_from_keras_or_h5

        t0 = time.perf_counter()
        gan = GNNRouteGAN()

        # Dummy forward pass to initialize variables (same as in service)
        try:
            import tensorflow as tf
            import numpy as np
            num_nodes = gan.num_nodes
            dummy_feats = tf.zeros((1, num_nodes, 8), dtype=tf.float32)
            dummy_adj   = tf.zeros((1, num_nodes, num_nodes), dtype=tf.float32)
            dummy_ev    = tf.zeros((1, 5), dtype=tf.float32)
            gan.discriminator([dummy_feats, dummy_adj, dummy_ev], training=False)
            noise = tf.zeros((1, gan.noise_dim), dtype=tf.float32)
            source_dest = tf.zeros((1, 20), dtype=tf.float32)
            gan.generator([noise, dummy_ev, source_dest], dummy_adj, training=False)
        except Exception as e:
            pass

        gen_ok = _load_weights_from_keras_or_h5(gan.generator, gen_path, "GNN Generator")
        disc_ok = False
        if disc_path:
            disc_ok = _load_weights_from_keras_or_h5(gan.discriminator, disc_path, "GNN Discriminator")
        elapsed = time.perf_counter() - t0

        if gen_ok:
            _ok(f"GNN Generator weights loaded in {elapsed:.1f}s")
        else:
            _fail("GNN Generator weight loading failed")

        if disc_ok:
            _ok("GNN Discriminator weights loaded")
        elif disc_path:
            _warn("GNN Discriminator weight loading failed")
        else:
            _warn("GNN Discriminator weights file not found (scoring unavailable)")

        # Inference validation
        if gen_ok:
            import tensorflow as tf
            import numpy as np
            num_nodes = gan.num_nodes
            dummy_feats = tf.zeros((1, num_nodes, 8), dtype=tf.float32)
            dummy_adj   = tf.zeros((1, num_nodes, num_nodes), dtype=tf.float32)
            dummy_ev    = tf.zeros((1, 5), dtype=tf.float32)
            t2 = time.perf_counter()
            out = gan.discriminator([dummy_feats, dummy_adj, dummy_ev], training=False)
            score = float(out["combined"].numpy().mean())
            elapsed3 = time.perf_counter() - t2
            _ok(f"GNN discriminator inference: combined={score:.4f} in {elapsed3:.3f}s")

            # Generator forward pass
            noise = tf.random.normal((1, gan.noise_dim))
            adj   = tf.zeros((1, num_nodes, num_nodes), dtype=tf.float32)
            sd    = tf.zeros((1, 20), dtype=tf.float32)
            probs = gan.generator([noise, dummy_ev, sd], adj, training=False)
            _ok(f"GNN generator inference: output shape {probs.shape}")

        return gen_ok, disc_ok

    except Exception as e:
        _fail(f"GNN loading failed: {e}")
        import traceback; traceback.print_exc()
        return False, False


# ── Full service smoke-test ───────────────────────────────────────────────────

def check_service_loading() -> bool:
    """Smoke-test the GNNRoutingService end-to-end."""
    print(f"\n{BOLD}[5/5] GNNRoutingService End-to-End{RESET}")
    try:
        from backend.app.services.gnn_routing_service import GNNRoutingService
        svc = GNNRoutingService()
        ok = svc.load_model(graph=None)
        status = svc.get_status()
        if ok:
            _ok(f"GNNRoutingService.load_model() → True")
        else:
            _warn("GNNRoutingService.load_model() → False (partial or failed)")
        _info(f"Status: gnn_loaded={status['gnn_loaded']}  sg_gan_loaded={status['sg_gan_loaded']}  is_ready={status['is_ready']}")
        _info(f"Paths: {status['model_paths']}")
        return ok
    except Exception as e:
        _fail(f"GNNRoutingService smoke-test failed: {e}")
        import traceback; traceback.print_exc()
        return False


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"\n{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  EV Routing — Model Compatibility Checker{RESET}")
    print(f"{BOLD}{'=' * 60}{RESET}")
    print(f"Project root: {PROJECT_ROOT}")

    tf_ok       = check_tensorflow()
    files       = check_file_inventory()
    layers_ok   = check_custom_layers() if tf_ok else False
    sg_gen, sg_disc = check_sggan_loading() if tf_ok and layers_ok else (False, False)
    gnn_gen, gnn_disc = check_gnn_loading() if tf_ok and layers_ok else (False, False)
    svc_ok      = check_service_loading() if tf_ok and layers_ok else False

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{BOLD}{'=' * 60}{RESET}")
    print(f"{BOLD}  REPORT SUMMARY{RESET}")
    print(f"{BOLD}{'=' * 60}{RESET}")

    rows = [
        ("TensorFlow available",       tf_ok),
        ("Custom layers importable",   layers_ok),
        ("SG-GAN Generator loads",     sg_gen),
        ("SG-GAN Discriminator loads", sg_disc),
        ("GNN Generator loads",        gnn_gen),
        ("GNN Discriminator loads",    gnn_disc),
        ("GNNRoutingService ready",    svc_ok),
    ]

    all_critical = all([tf_ok, gnn_gen, sg_gen, svc_ok])

    for label, result in rows:
        icon = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"  {icon}  {label}")

    print()
    if all_critical:
        print(f"{GREEN}{BOLD}✅ All critical checks PASSED — models are ready for production.{RESET}")
        return 0
    else:
        print(f"{RED}{BOLD}❌ Some critical checks FAILED — see details above.{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
