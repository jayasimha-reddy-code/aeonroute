"""Centralized configuration for the EV Routing System.

Uses Pydantic Settings to load values from environment variables (prefix EV_)
or .env file, with sensible defaults. All path resolution is relative to
project_root (auto-detected as the directory containing pyproject.toml).
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


def _project_root() -> Path:
    """Walk upward from this file until we find pyproject.toml."""
    current = Path(__file__).resolve().parent
    for parent in [current, *current.parents]:
        if (parent / "pyproject.toml").exists():
            return parent
    # Fallback: one level above src/
    return current.parent


class EVRoutingSettings(BaseSettings):
    """All configuration for the EV Routing project."""

    #  Directory names (relative to project root) 
    project_root: Path = _project_root()
    model_dir: str = "models"
    data_dir: str = "data"
    results_dir: str = "results"
    frontend_dist_dir: str = "frontend/dist"

    #  ML hyper-parameters 
    grid_size: int = 10
    max_battery: float = 100.0
    battery_capacity_kwh: float = 60.0
    gan_epochs: int = 100
    gan_batch_size: int = 32
    gnn_epochs: int = 50
    gnn_batch_size: int = 16
    rl_episodes: int = 500
    rl_max_steps: int = 200
    traffic_samples: int = 500
    historical_routes: int = 300
    seed: int = 42
    use_gnn_gan: bool = True

    # GNN Route GAN hyperparameters
    gnn_hidden_dim: int = 128
    gnn_num_layers: int = 3
    gnn_noise_dim: int = 64
    gnn_attention_heads: int = 4
    gnn_learning_rate: float = 1e-4

    #  API config 
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:3000",
    ]
    log_format: str = "json"
    max_body_size: int = 10 * 1024 * 1024  # 10 MB
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    #  Resolved absolute paths (computed properties) 
    @property
    def models_path(self) -> Path:
        return self.project_root / self.model_dir

    @property
    def data_path(self) -> Path:
        return self.project_root / self.data_dir

    @property
    def results_path(self) -> Path:
        return self.project_root / self.results_dir

    @property
    def frontend_dist_path(self) -> Path:
        return self.project_root / self.frontend_dist_dir

    @property
    def sg_gan_model_path(self) -> Path:
        return self.models_path / "sg_gan"

    @property
    def gnn_gan_model_path(self) -> Path:
        return self.models_path / "gnn_gan"

    @property
    def q_learning_model_path(self) -> Path:
        return self.models_path / "q_learning"

    @property
    def plots_path(self) -> Path:
        return self.results_path / "plots"

    @property
    def metrics_path(self) -> Path:
        return self.results_path / "metrics"

    model_config = {
        "env_prefix": "EV_",
        "env_file": ".env",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> EVRoutingSettings:
    """Return a cached singleton of the project settings."""
    return EVRoutingSettings()
