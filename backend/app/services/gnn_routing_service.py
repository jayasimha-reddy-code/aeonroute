"""GNN Routing Service — integrates GNNRouteGAN into the production routing pipeline.

This service acts as an adapter between:
  - src.gnn_route_generator.GNNRouteGAN  (TensorFlow/Keras research model)
  - backend.app.services.routing_service  (FastAPI production service)

It provides:
  - Model loading with robust path discovery (searches multiple locations/formats)
  - Graph tensor preparation from HyderabadGraph
  - Traffic prediction per edge
  - Energy consumption estimation per route
  - Route quality scoring (0–1)
  - Candidate route ranking

Academic justification:
  GNNs are used because road networks are inherently graph-structured.
  Traffic conditions exhibit strong spatial dependencies — congestion on
  one road propagates to neighbouring roads. The GraphAttentionLayerV2
  models these dependencies via learned attention weights, enabling
  spatially-aware traffic prediction and route scoring.

Model loading strategy:
  Both GNNRouteGAN and SGGANTrafficGenerator are subclassed Keras Models.
  keras.models.load_model() fails for subclassed models that use
  SpectralNormalization as instance attributes (config JSON reconstruction
  cannot re-map u/v singular vectors).

  Strategy: rebuild architecture from code (constructor + dummy forward pass),
  then load weights from the saved file. Architecture is NEVER reconstructed
  from serialized config.
"""

from __future__ import annotations

import logging
import os
import zipfile
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("ev_routing")

# ─────────────────────────────────────────────────────────────────────────────
# Lazy TF import — avoids hard crash if TF is not available
# ─────────────────────────────────────────────────────────────────────────────
try:
    import tensorflow as tf  # noqa: F401

    HAS_TF = True
except ImportError:
    HAS_TF = False
    logger.warning("TensorFlow not available. GNN routing will use heuristic fallback.")


# ─────────────────────────────────────────────────────────────────────────────
# Model path discovery helpers
# ─────────────────────────────────────────────────────────────────────────────

def _project_root() -> Path:
    """Resolve project root by locating pyproject.toml upward from this file."""
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "pyproject.toml").exists():
            return parent
    # Fallback: three levels up (backend/app/services/ → project root)
    return current.parent.parent.parent


def _find_gnn_weights(project_root: Path) -> Tuple[Optional[Path], Optional[Path]]:
    """Search for GNNRouteGAN weights in all known locations.

    Returns (generator_path, discriminator_path) or (None, None).

    Search order (first match wins):
      1. models/gnn_gan/gnn_generator.keras          (full model)
      2. models/gnn_gan/gnn_generator.weights.h5     (weights-only)
      3. src/models/gnn_gan/gnn_generator.keras
      4. src/models/gnn_gan/gnn_generator.weights.h5
    """
    search_dirs = [
        project_root / "models" / "gnn_gan",
        project_root / "src" / "models" / "gnn_gan",
    ]
    suffixes = ["gnn_generator.keras", "gnn_generator.weights.h5"]

    gen_path: Optional[Path] = None
    disc_path: Optional[Path] = None

    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for suffix in suffixes:
            candidate = search_dir / suffix
            if candidate.exists():
                gen_path = candidate
                disc_suffix = suffix.replace("generator", "discriminator")
                disc_candidate = search_dir / disc_suffix
                disc_path = disc_candidate if disc_candidate.exists() else None
                logger.info("[GNNService] Found GNN weights: %s", gen_path)
                return gen_path, disc_path

    return None, None


def _find_sggan_prefix(project_root: Path) -> Optional[str]:
    """Search for SG-GAN model files and return the filepath prefix.

    Returns the prefix string (without _generator.keras suffix), or None.

    Search order:
      1. models/sg_gan/traffic_gan
      2. src/models/sg_gan/traffic_gan
    """
    search_prefixes = [
        project_root / "models" / "sg_gan" / "traffic_gan",
        project_root / "src" / "models" / "sg_gan" / "traffic_gan",
    ]
    for prefix in search_prefixes:
        gen = Path(str(prefix) + "_generator.keras")
        if gen.exists():
            logger.info("[GNNService] Found SG-GAN files at prefix: %s", prefix)
            return str(prefix)
    return None


def _load_weights_from_keras_or_h5(model: Any, path: Path, label: str) -> bool:
    """Load weights into a pre-built model.

    Tries in order:
      1. If .keras: unzip and load inner model.weights.h5
      2. If .h5 / .weights.h5: load directly
      3. Full model load then copy weights (last resort)

    Returns True on success.
    """
    if not path.exists():
        logger.error("[GNNService] %s: file not found at %s", label, path)
        return False

    suffix = path.suffix.lower()

    # ── Strategy A: weights-only .h5 file ─────────────────────────────────────
    if suffix in (".h5",):
        try:
            model.load_weights(str(path))
            logger.info("[GNNService] %s: weights loaded from %s", label, path)
            return True
        except Exception as e:
            logger.warning("[GNNService] %s: direct h5 load failed: %s", label, e)

    # ── Strategy B: .keras archive → extract model.weights.h5 ─────────────────
    if suffix == ".keras":
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                with zipfile.ZipFile(str(path), "r") as zf:
                    zf.extractall(tmpdir)
                tmp = Path(tmpdir)
                # Keras 3 stores weights at model.weights.h5 inside the archive
                w_path = tmp / "model.weights.h5"
                if not w_path.exists():
                    candidates = list(tmp.glob("*.h5")) + list(tmp.glob("*.weights.h5"))
                    if not candidates:
                        raise FileNotFoundError("No .h5 inside .keras archive")
                    w_path = candidates[0]
                model.load_weights(str(w_path))
            logger.info("[GNNService] %s: weights extracted+loaded from %s", label, path)
            return True
        except Exception as e:
            logger.warning("[GNNService] %s: keras-archive weights load failed: %s", label, e)

    # ── Strategy C: full model load, then copy weights (last resort) ───────────
    try:
        import tensorflow as tf  # noqa: PLC0415
        loaded = tf.keras.models.load_model(str(path), compile=False)
        model.set_weights(loaded.get_weights())
        del loaded
        logger.info("[GNNService] %s: full-model copy succeeded from %s", label, path)
        return True
    except Exception as e:
        logger.error("[GNNService] %s: all loading strategies failed. Last error: %s", label, e)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Route scoring result
# ─────────────────────────────────────────────────────────────────────────────


class GNNRouteScore:
    """Container for per-route GNN evaluation results."""

    def __init__(
        self,
        route_nodes: List[int],
        gnn_score: float,
        traffic_level: float,
        energy_estimate_kwh: float,
        validity: float,
        energy_feasibility: float,
        realism: float,
        used_gnn: bool,
    ) -> None:
        self.route_nodes = route_nodes
        self.gnn_score = float(gnn_score)
        self.traffic_level = float(traffic_level)
        self.energy_estimate_kwh = float(energy_estimate_kwh)
        self.validity = float(validity)
        self.energy_feasibility = float(energy_feasibility)
        self.realism = float(realism)
        self.used_gnn = used_gnn  # False → heuristic fallback

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gnn_score": round(self.gnn_score, 4),
            "traffic_level": round(self.traffic_level, 4),
            "energy_estimate_kwh": round(self.energy_estimate_kwh, 4),
            "validity": round(self.validity, 4),
            "energy_feasibility": round(self.energy_feasibility, 4),
            "realism": round(self.realism, 4),
            "used_gnn": self.used_gnn,
        }


# ─────────────────────────────────────────────────────────────────────────────
# GNN Routing Service
# ─────────────────────────────────────────────────────────────────────────────


class GNNRoutingService:
    """Loads and wraps GNNRouteGAN for production routing.

    Usage (with dependency injection via AppState):
        svc = GNNRoutingService()
        svc.load_model()                            # call once at startup
        scores = svc.rank_routes(candidates, graph) # returns sorted list
    """

    def __init__(self, model_dir: Optional[str] = None) -> None:
        self._project_root = _project_root()
        # model_dir kept for API compatibility but we use robust discovery
        self._model_dir = Path(model_dir) if model_dir else self._project_root / "models" / "gnn_gan"
        self._gan: Optional[Any] = None          # GNNRouteGAN instance
        self._sg_gan: Optional[Any] = None       # SGGANTrafficGenerator (traffic prediction)
        self._graph_data: Optional[Dict] = None  # pre-computed tensors
        self._graph_ref: Optional[Any] = None    # HyderabadGraph reference
        self._is_loaded: bool = False
        self._loaded_gnn_path: Optional[str] = None
        self._loaded_sggan_path: Optional[str] = None

    # ─────────────────────────────────────────────── public API ──────────────

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def load_model(self, graph=None) -> bool:
        """Attempt to load GNNRouteGAN + SG-GAN.  Returns True if successful.

        Searches multiple locations and supports both .keras and .weights.h5 formats.
        Fails loudly in logs when models cannot be found — never silently degrades
        without explanation.
        """
        if not HAS_TF:
            logger.error(
                "[GNNService] TensorFlow is not installed. Install it with: "
                "pip install tensorflow  — GNN routing unavailable."
            )
            return False

        # ── Load SG-GAN (traffic generator) ─────────────────────────────────
        sg_prefix = _find_sggan_prefix(self._project_root)
        if sg_prefix is None:
            logger.warning(
                "[GNNService] SG-GAN model files not found. Searched:\n"
                "  %s/models/sg_gan/traffic_gan_generator.keras\n"
                "  %s/src/models/sg_gan/traffic_gan_generator.keras\n"
                "Run training to generate these files.",
                self._project_root, self._project_root,
            )
        else:
            try:
                from src.traffic_generator import SGGANTrafficGenerator  # noqa: PLC0415

                sg_gan = SGGANTrafficGenerator()
                sg_gan.load(sg_prefix)
                self._sg_gan = sg_gan
                self._loaded_sggan_path = sg_prefix
                logger.info("[GNNService] SG-GAN loaded from %s", sg_prefix)
            except Exception as exc:
                logger.warning(
                    "[GNNService] SG-GAN load failed: %s\n"
                    "  Traffic prediction will use time-of-day heuristic.", exc
                )

        # ── Load GNN-GAN ─────────────────────────────────────────────────────
        gen_path, disc_path = _find_gnn_weights(self._project_root)

        if gen_path is None:
            logger.error(
                "[GNNService] GNN model weights not found. Searched:\n"
                "  %s/models/gnn_gan/gnn_generator.{keras,weights.h5}\n"
                "  %s/src/models/gnn_gan/gnn_generator.{keras,weights.h5}\n"
                "Run `python src/main.py --mode train` or check model inventory at "
                "docs/model_inventory.md. Falling back to heuristic scoring.",
                self._project_root, self._project_root,
            )
            self._is_loaded = self._sg_gan is not None
            return self._is_loaded

        try:
            from src.gnn_route_generator import GNNRouteGAN  # noqa: PLC0415

            # Instantiate fresh model (builds architecture + all weights via __init__)
            gan = GNNRouteGAN()

            # --- KEY FIX FOR KERAS 3 SUBCLASSED MODELS ---
            # Run a dummy forward pass *before* load_weights to fully initialize
            # all layers, attention heads, and weights with exact expected shapes.
            try:
                import tensorflow as tf  # noqa: PLC0415
                num_nodes = gan.num_nodes
                dummy_feats = tf.zeros((1, num_nodes, 8), dtype=tf.float32)
                dummy_adj   = tf.zeros((1, num_nodes, num_nodes), dtype=tf.float32)
                dummy_ev    = tf.zeros((1, 5), dtype=tf.float32)
                
                # Discriminator dummy pass
                gan.discriminator([dummy_feats, dummy_adj, dummy_ev], training=False)
                
                # Generator dummy pass
                noise = tf.zeros((1, gan.noise_dim), dtype=tf.float32)
                source_dest = tf.zeros((1, 20), dtype=tf.float32)
                gan.generator([noise, dummy_ev, source_dest], dummy_adj, training=False)
                logger.info("[GNNService] Model architectures built via dummy forward pass.")
            except Exception as e:
                logger.warning("[GNNService] Dummy forward pass failed: %s", e)
            # ---------------------------------------------

            # Load generator weights
            gen_ok = _load_weights_from_keras_or_h5(gan.generator, gen_path, "GNN Generator")

            # Load discriminator weights
            disc_ok = False
            if disc_path is not None:
                disc_ok = _load_weights_from_keras_or_h5(gan.discriminator, disc_path, "GNN Discriminator")
            else:
                logger.warning(
                    "[GNNService] GNN discriminator weights not found alongside %s. "
                    "Route scoring (discriminator) will be unavailable.", gen_path
                )

            if gen_ok:
                self._gan = gan
                self._loaded_gnn_path = str(gen_path)
                self._is_loaded = True
                logger.info(
                    "[GNNService] GNNRouteGAN loaded:\n"
                    "  Generator:     %s  [%s]\n"
                    "  Discriminator: %s  [%s]",
                    gen_path, "OK" if gen_ok else "FAILED",
                    disc_path, "OK" if disc_ok else "FAILED/MISSING",
                )
            else:
                logger.error("[GNNService] GNN generator weight loading failed.")
                self._is_loaded = False

        except Exception as exc:
            logger.error("[GNNService] GNNRouteGAN instantiation/load failed: %s", exc, exc_info=True)
            self._is_loaded = False

        # ── Validate inference with a dummy forward pass ─────────────────────
        if self._gan is not None:
            self._validate_gnn_inference()

        # ── Pre-compute graph tensors ─────────────────────────────────────────
        if graph is not None:
            self._prepare_graph_data(graph)

        return self._is_loaded

    def _validate_gnn_inference(self) -> bool:
        """Run a tiny dummy forward pass through the discriminator to confirm it works."""
        try:
            import tensorflow as tf  # noqa: PLC0415

            num_nodes = self._gan.num_nodes  # 100 default
            dummy_feats = tf.zeros((1, num_nodes, 8), dtype=tf.float32)
            dummy_adj   = tf.zeros((1, num_nodes, num_nodes), dtype=tf.float32)
            dummy_ev    = tf.zeros((1, 5), dtype=tf.float32)
            out = self._gan.discriminator([dummy_feats, dummy_adj, dummy_ev], training=False)
            score = float(out["combined"].numpy().mean())
            logger.info("[GNNService] GNN inference validated — dummy discriminator output: %.4f", score)
            return True
        except Exception as exc:
            logger.warning("[GNNService] GNN inference validation failed: %s", exc)
            return False

    def prepare_graph(self, graph) -> None:
        """Pre-compute graph tensors from HyderabadGraph. Call after load_model()."""
        self._prepare_graph_data(graph)

    def score_route(
        self,
        route_nodes: List[int],
        graph,
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> GNNRouteScore:
        """Score a single route using GNN. Fails loudly if model is unavailable."""
        if not self._is_loaded or self._gan is None:
            raise RuntimeError("GNN model is not loaded. Cannot score route.")
        return self._score_with_gnn(route_nodes, graph, battery_soc, battery_capacity_kwh)

    def rank_routes(
        self,
        candidate_routes: List[List[int]],
        graph,
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> List[Tuple[List[int], GNNRouteScore]]:
        """Score and rank a list of candidate routes.

        Returns list of (route_nodes, score) sorted best-first.
        """
        if not candidate_routes:
            return []

        scored: List[Tuple[List[int], GNNRouteScore]] = []
        for route in candidate_routes:
            if len(route) < 2:
                continue
            score = self.score_route(route, graph, battery_soc, battery_capacity_kwh)
            scored.append((route, score))

        scored.sort(key=lambda t: t[1].gnn_score, reverse=True)
        return scored

    def generate_route(
        self,
        source: int,
        destination: int,
        graph,
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> Optional[List[int]]:
        """Generate a route using the GNN generator (may produce suboptimal paths).

        Falls back to None if GNN is not loaded or generation fails.
        """
        if self._gan is None:
            return None
        try:
            ev_state = self._build_ev_state(battery_soc, battery_capacity_kwh, source)
            route = self._gan.generate_route(source, destination, graph.graph, ev_state)
            if route and len(route) >= 2:
                logger.debug("[GNNService] GNN generated route with %d nodes", len(route))
                return route
        except Exception as exc:
            logger.warning("[GNNService] Route generation failed: %s", exc)
        return None

    def get_status(self) -> Dict[str, Any]:
        """Return current model status for /api/model/status endpoint."""
        return {
            "gnn_loaded": self._gan is not None,
            "sg_gan_loaded": self._sg_gan is not None,
            "graph_data_prepared": self._graph_data is not None,
            "model_dir": str(self._model_dir),
            "project_root": str(self._project_root),
            "has_tensorflow": HAS_TF,
            "is_ready": self._is_loaded,
            "model_paths": {
                "gnn_generator": self._loaded_gnn_path,
                "sggan_prefix": self._loaded_sggan_path,
            },
        }

    # ─────────────────────────────────────────────── private helpers ─────────

    def _prepare_graph_data(self, graph) -> None:
        """Convert HyderabadGraph to tensors for GNN input."""
        try:
            if not HAS_TF:
                return
            import tensorflow as tf  # noqa: PLC0415

            num_nodes = graph.num_nodes
            # Build adjacency matrix (sparse COO → dense)
            rows, cols = [], []
            for i in range(num_nodes):
                for j in graph.get_neighbors(i):
                    rows.append(i)
                    cols.append(j)

            adj = np.zeros((num_nodes, num_nodes), dtype=np.float32)
            for r, c in zip(rows, cols):
                adj[r, c] = 1.0

            # Node feature matrix: [x_norm, y_norm, degree_norm, is_charging, 0, 0, 0, 0]
            node_feats = np.zeros((num_nodes, 8), dtype=np.float32)
            max_deg = max(len(graph.get_neighbors(i)) for i in range(num_nodes)) or 1

            x_coords = np.array([graph.get_node_pos(i)["x"] for i in range(num_nodes)])
            y_coords = np.array([graph.get_node_pos(i)["y"] for i in range(num_nodes)])
            x_min, x_max = x_coords.min(), x_coords.max()
            y_min, y_max = y_coords.min(), y_coords.max()
            x_range = (x_max - x_min) or 1.0
            y_range = (y_max - y_min) or 1.0

            for i in range(num_nodes):
                pos = graph.get_node_pos(i)
                deg = len(graph.get_neighbors(i))
                node_feats[i, 0] = (pos["x"] - x_min) / x_range
                node_feats[i, 1] = (pos["y"] - y_min) / y_range
                node_feats[i, 2] = deg / max_deg
                node_feats[i, 3] = 1.0 if i in graph.charging_stations else 0.0

            self._graph_data = {
                "adjacency": tf.constant(adj, dtype=tf.float32),
                "node_features": tf.constant(node_feats, dtype=tf.float32),
                "num_nodes": num_nodes,
            }
            self._graph_ref = graph
            logger.info("[GNNService] Graph tensors prepared: %d nodes, %d edges", num_nodes, len(rows))
        except Exception as exc:
            logger.warning("[GNNService] Graph tensor preparation failed: %s", exc)

    def _score_with_gnn(
        self,
        route_nodes: List[int],
        graph,
        battery_soc: float,
        battery_capacity_kwh: float,
    ) -> GNNRouteScore:
        """Score route using GNNRouteGAN discriminator."""
        try:
            import tensorflow as tf  # noqa: PLC0415

            if self._graph_data is None:
                self._prepare_graph_data(graph)

            ev_state = self._build_ev_state(battery_soc, battery_capacity_kwh, route_nodes[0])
            ev_state_arr = np.array(ev_state, dtype=np.float32).reshape(1, -1)

            num_nodes = self._graph_data["num_nodes"]
            route_adj = np.zeros((1, num_nodes, num_nodes), dtype=np.float32)
            route_node_feats = np.zeros((1, num_nodes, 8), dtype=np.float32)

            # Mark route nodes in features
            for k, n in enumerate(route_nodes):
                if n < num_nodes:
                    route_node_feats[0, n, 0] = 1.0  # is_in_route
                    route_node_feats[0, n, 1] = k / len(route_nodes)  # position
                if k < len(route_nodes) - 1:
                    a, b = route_nodes[k], route_nodes[k + 1]
                    if a < num_nodes and b < num_nodes:
                        route_adj[0, a, b] = 1.0
                        route_adj[0, b, a] = 1.0

            # Source/dest markers
            src, dst = route_nodes[0], route_nodes[-1]
            if src < num_nodes:
                route_node_feats[0, src, 2] = 1.0
            if dst < num_nodes:
                route_node_feats[0, dst, 3] = 1.0

            disc_out = self._gan.discriminator(
                [
                    tf.constant(route_node_feats, dtype=tf.float32),
                    tf.constant(route_adj, dtype=tf.float32),
                    tf.constant(ev_state_arr, dtype=tf.float32),
                ],
                training=False,
            )

            # Discriminator outputs dict: combined, validity, energy_feasibility, realism
            combined = float(disc_out["combined"].numpy().mean())
            validity = float(disc_out.get("validity", disc_out["combined"]).numpy().mean())
            energy_feas = float(
                disc_out.get("energy_feasibility", disc_out["combined"]).numpy().mean()
            )
            realism = float(disc_out.get("realism", disc_out["combined"]).numpy().mean())

            # Traffic level from SG-GAN if available
            traffic_level = self._estimate_traffic(route_nodes, graph)
            # Energy estimate from edge data
            energy_est = self._estimate_energy(route_nodes, graph, battery_capacity_kwh)

            # Composite GNN score
            gnn_score = (
                0.35 * combined
                + 0.25 * validity
                + 0.25 * energy_feas
                + 0.15 * realism
            )

            logger.debug(
                "[GNNService] GNN scored route (%d nodes): score=%.4f "
                "validity=%.4f energy_feas=%.4f realism=%.4f used_gnn=True",
                len(route_nodes), gnn_score, validity, energy_feas, realism,
            )

            return GNNRouteScore(
                route_nodes=route_nodes,
                gnn_score=gnn_score,
                traffic_level=traffic_level,
                energy_estimate_kwh=energy_est,
                validity=validity,
                energy_feasibility=energy_feas,
                realism=realism,
                used_gnn=True,
            )
        except Exception as exc:
            logger.error("[GNNService] GNN scoring failed: %s", exc)
            raise RuntimeError(f"GNN scoring failed: {exc}") from exc

    def _estimate_traffic(self, route_nodes: List[int], graph) -> float:
        """Estimate average traffic level for route edges (0–1)."""
        if self._sg_gan is not None:
            try:
                import datetime

                hour = datetime.datetime.now().hour
                scenarios = self._sg_gan.generate_traffic_scenarios(num_scenarios=1)
                if scenarios is not None and len(scenarios) > 0:
                    scenario = scenarios[0]
                    # Average traffic at current hour across route edges
                    n = len(route_nodes) - 1
                    if n > 0:
                        idx_bound = min(n, scenario.shape[0])
                        traffic_vals = [
                            float(scenario[i % idx_bound, hour % scenario.shape[1]])
                            for i in range(n)
                        ]
                        return float(np.clip(np.mean(traffic_vals), 0.0, 1.0))
            except Exception:
                pass

        # Fallback: time-of-day synthetic
        import datetime

        hour = datetime.datetime.now().hour
        # Morning rush: 7-10, Evening rush: 17-20
        if 7 <= hour <= 10 or 17 <= hour <= 20:
            return 0.75
        elif 0 <= hour <= 6 or 22 <= hour <= 23:
            return 0.2
        return 0.5

    def _estimate_energy(
        self, route_nodes: List[int], graph, battery_capacity_kwh: float
    ) -> float:
        """Estimate total energy consumption for the route in kWh."""
        total_kwh = 0.0
        energy_rate = 0.18  # kWh/km default
        try:
            for i in range(len(route_nodes) - 1):
                edge = graph.get_edge_data(route_nodes[i], route_nodes[i + 1])
                if edge:
                    dist_km = edge.get("distance_km", 0.5)
                    total_kwh += dist_km * energy_rate
                else:
                    total_kwh += 0.5 * energy_rate
        except Exception:
            total_kwh = len(route_nodes) * 0.5 * energy_rate
        return round(total_kwh, 4)

    def _build_ev_state(
        self,
        battery_soc: float,
        battery_capacity_kwh: float,
        current_node: int,
    ) -> List[float]:
        """Build normalized EV state vector for GNN input."""
        return [
            float(battery_soc) / 100.0,
            float(battery_capacity_kwh) / 100.0,
            float(current_node) / max(1, 1000),  # rough normalisation
            0.5,  # time_of_day (noon default)
            0.0,  # placeholder for speed
        ]

