from pydantic import BaseModel, Field, field_validator

class EVStateRequest(BaseModel):
    battery_soc: float = Field(..., ge=0, le=100, description="State of charge (0-100%)")
    current_node: int = Field(..., ge=0, le=9999, description="Current node ID")
    battery_capacity_kwh: float = Field(60, gt=0, le=500, description="Battery capacity in kWh")
    time_minutes: int = Field(480, ge=0, le=1440, description="Current time of day in minutes")

class RouteRequest(BaseModel):
    source: int = Field(..., ge=0, le=9999, description="Source node ID")
    destination: int = Field(..., ge=0, le=9999, description="Destination node ID")
    ev_state: EVStateRequest
    num_candidates: int = Field(5, ge=1, le=20, description="Number of candidate routes")

    @field_validator("destination")
    @classmethod
    def source_ne_dest(cls, v, info):
        if "source" in info.data and v == info.data["source"]:
            raise ValueError("source and destination must differ")
        return v

class TrainingConfig(BaseModel):
    grid_size: int = Field(10, ge=3, le=50, description="Road network grid size")
    gan_epochs: int = Field(100, ge=1, le=1000, description="GAN training epochs")
    rl_episodes: int = Field(500, ge=1, le=5000, description="RL training episodes")
    traffic_samples: int = Field(500, ge=10, le=5000, description="Number of traffic samples")
    gan_batch_size: int = Field(32, ge=1, le=256, description="GAN batch size")
    rl_max_steps: int = Field(200, ge=10, le=1000, description="Max steps per RL episode")
    demo_mode: bool = Field(False, description="Fast training from checkpoints (5-10 epochs)")
