"""Hardware scalability config - Pydantic Settings reading from .env file.

All limits are deliberately low-spec safe (i5 / 8 GB RAM laptop).
To scale up (e.g., cloud server), simply change .env values - zero code changes.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Map / Graph Limits ---
    OSMNX_RADIUS_METERS: int = 3000          # Limits RAM usage
    OSMNX_CENTER_LAT: float = 17.4435        # HITEC City, Hyderabad
    OSMNX_CENTER_LON: float = 78.3772

    # --- Training Limits ---
    MAX_TRAINING_EPISODES: int = 500          # Limits CPU usage


# Singleton - import this everywhere
settings = AppSettings()