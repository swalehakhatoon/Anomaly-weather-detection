

"""
Central configuration for SkyGuard AI.

Loads secrets and feature flags from environment variables (via a local
backend/.env file, which is git-ignored). This module is imported by
main.py, state.py, and weather_api.py so there is a single source of truth.
"""
import os
from dotenv import load_dotenv

# Loads backend/.env into the process environment (no-op if the file
# doesn't exist, e.g. in CI or production where real env vars are set).
load_dotenv()

# --- OpenWeatherMap ---------------------------------------------------
OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "").strip()

# --- Feature flags ------------------------------------------------------
# When true, the simulation loop blends in real observations fetched from
# OpenWeatherMap for each of the 15 seeded AWS station coordinates instead
# of relying purely on the synthetic diurnal model. Fault-injection presets
# (Judge Demo Simulator) still work on top of live data.
USE_LIVE_WEATHER: bool = os.getenv("USE_LIVE_WEATHER", "false").strip().lower() in (
    "1", "true", "yes", "on"
)

# How often (in seconds) to refresh live readings from the API per station.
# Keep this well above a few seconds — the fast 3.5s ticker in state.py
# just re-reads the cached values, it does NOT hit the network every tick.
LIVE_WEATHER_POLL_SECONDS: int = int(os.getenv("LIVE_WEATHER_POLL_SECONDS", "300"))

if USE_LIVE_WEATHER and not OPENWEATHER_API_KEY:
    raise RuntimeError(
        "USE_LIVE_WEATHER=true but OPENWEATHER_API_KEY is missing.\n"
        "Add your key to backend/.env (see backend/.env.example), "
        "or set USE_LIVE_WEATHER=false to run on simulated data."
    )
