"""
Thin async client for OpenWeatherMap's Current Weather Data endpoint.

Used by state.py to periodically refresh a per-station cache of real
observations. Any failure (bad key, network error, rate limit, missing
field) returns None so the caller can safely fall back to the existing
synthetic simulation for that station instead of crashing the loop.
"""
import httpx
from typing import Optional, Dict

from backend.config import OPENWEATHER_API_KEY

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


async def fetch_live_reading(lat: float, lng: float) -> Optional[Dict[str, float]]:
    """Fetch one current observation for a coordinate.

    Returns a dict shaped like the rest of the pipeline's reading fields,
    or None if the fetch failed for any reason.
    """
    params = {
        "lat": lat,
        "lon": lng,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        main = data.get("main", {})
        wind = data.get("wind", {})
        rain = data.get("rain", {})

        return {
            "temperature": float(main["temp"]),
            "humidity": float(main["humidity"]),
            "pressure": float(main["pressure"]),
            # OpenWeatherMap reports wind speed in m/s (metric units) -> convert to km/h
            "wind_speed": round(float(wind.get("speed", 0.0)) * 3.6, 1),
            "wind_direction": float(wind.get("deg", 0.0)),
            # "1h" rainfall volume in mm, absent when it isn't raining
            "rainfall": float(rain.get("1h", 0.0)),
        }
    except (httpx.HTTPError, KeyError, ValueError, TypeError) as e:
        print(f"[weather_api] Live fetch failed for ({lat}, {lng}): {e}")
        return None



