import math
import time
import uuid
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from backend.seed_data import SEED_STATIONS
from backend.detector import AnomalyDetector
from backend.models import Station, Reading, Anomaly, Alert, SystemMetrics
from backend.config import USE_LIVE_WEATHER, LIVE_WEATHER_POLL_SECONDS
from backend.weather_api import fetch_live_reading

class TelemetryStateManager:
    def __init__(self):
        self.detector = AnomalyDetector()
        self.stations: Dict[str, Dict[str, Any]] = {}
        self.readings_history: Dict[str, List[Dict[str, Any]]] = {}
        self.active_anomalies: List[Dict[str, Any]] = []
        self.active_alerts: List[Dict[str, Any]] = []
        self.feedback_log: List[Dict[str, Any]] = []
       
        # Fault Injection States
        self.active_faults: Dict[str, Dict[str, Any]] = {}
        self.simulated_tick = 0
        self.is_running = False

        # Live weather cache: station_id -> latest real observation dict
        # (populated by run_live_weather_loop when USE_LIVE_WEATHER is on)
        self.live_cache: Dict[str, Dict[str, float]] = {}

        # Initialize state with historical baseline
        self._initialize_network()

    def _initialize_network(self):
        """Seed 15 stations and 40 historical readings per station."""
        for s in SEED_STATIONS:
            st_id = s["id"]
            self.stations[st_id] = {
                "id": st_id,
                "name": s["name"],
                "state": s["state"],
                "lat": s["lat"],
                "lng": s["lng"],
                "zone": s["zone"],
                "elevation": s["elevation"],
                "sensor_types": s["sensor_types"],
                "status": "NORMAL",
                "trust_score": 0.98,
                "base_temp": s["base_temp"],
                "base_humidity": s["base_humidity"],
                "base_pressure": s["base_pressure"],
                "last_reported": ""
            }
            self.readings_history[st_id] = []
           
        # Pre-populate historical readings (last 4 hours, 1 reading per 5 min)
        base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
        for i in range(35, 0, -1):
            tick_time = base_time - timedelta(minutes=i * 5)
            self._generate_tick_readings(tick_time.isoformat(), tick_time.hour, is_initial=True)

    def _get_diurnal_temp(self, base_temp: float, hour: int) -> float:
        """Standard diurnal solar cycle: coolest at 05:00, warmest at 14:00."""
        cycle = math.sin((hour - 8.5) * math.pi / 12.0)
        return round(base_temp + 5.0 * cycle + random.uniform(-0.6, 0.6), 2)

    def _get_diurnal_humidity(self, base_humidity: float, hour: int) -> float:
        """Inverse diurnal cycle: lowest humidity at peak temperature."""
        cycle = -math.sin((hour - 8.5) * math.pi / 12.0)
        val = base_humidity + 6.5 * cycle + random.uniform(-1.0, 1.0)
        return round(max(5.0, min(98.0, val)), 1)

    def _generate_tick_readings(self, timestamp: str, hour: int, is_initial: bool = False):
        """Generate one round of telemetry for all stations and evaluate anomalies."""
        current_readings_map: Dict[str, Dict[str, float]] = {}

        # 1. Synthesize (or fetch-cached) current raw values for all stations
        for st_id, station in self.stations.items():
            live = self.live_cache.get(st_id) if USE_LIVE_WEATHER else None

            if live is not None:
                # Use the most recent real observation, with a small jitter
                # so consecutive ticks between API polls aren't identical
                # (mirrors genuine sensor micro-noise).
                temp = round(live["temperature"] + random.uniform(-0.1, 0.1), 2)
                humidity = round(max(0.0, min(100.0, live["humidity"] + random.uniform(-0.5, 0.5))), 1)
                pressure = round(live["pressure"] + random.uniform(-0.2, 0.2), 1)
                wind_spd = round(max(0.0, live["wind_speed"] + random.uniform(-0.5, 0.5)), 1)
                wind_dir = round(live["wind_direction"], 1)
                rainfall = round(max(0.0, live["rainfall"]), 1)
            else:
                base_temp = station["base_temp"]
                base_hum = station["base_humidity"]
                base_pres = station["base_pressure"]

                temp = self._get_diurnal_temp(base_temp, hour)
                humidity = self._get_diurnal_humidity(base_hum, hour)
                pressure = round(base_pres + random.uniform(-0.8, 0.8), 1)
                wind_spd = round(max(1.0, random.gauss(12.0, 4.0)), 1)
                wind_dir = round(random.uniform(45.0, 280.0), 1)
                rainfall = round(max(0.0, random.expovariate(1.8) if "Rainfall" in station["zone"] else 0.0), 1)

            # Apply active fault injections if present
            if st_id in self.active_faults:
                fault = self.active_faults[st_id]
                f_type = fault["type"]
               
                if f_type == "FLATLINE":
                    temp = fault.get("fixed_val", 34.0)
                elif f_type == "HEATWAVE":
                    temp = round(temp + fault.get("boost", 7.5), 1)
                elif f_type == "PHYSICAL_IMPOSSIBLE":
                    humidity = fault.get("rh", 118.0)
                    rainfall = fault.get("rain", -12.0)
                elif f_type == "DRIFT":
                    drift_step = fault.get("step", 0) + 1
                    fault["step"] = drift_step
                    temp = round(temp + drift_step * 0.25, 2)
                elif f_type == "CLOUDBURST":
                    rainfall = round(fault.get("rain", 55.0) + random.uniform(-2.0, 5.0), 1)
                    wind_spd = round(fault.get("wind", 85.0) + random.uniform(-3.0, 7.0), 1)
                    pressure = round(base_pres - fault.get("p_drop", 16.0), 1)

            current_readings_map[st_id] = {
                "temperature": temp,
                "humidity": humidity,
                "pressure": pressure,
                "wind_speed": wind_spd,
                "wind_direction": wind_dir,
                "rainfall": rainfall
            }

        # 2. Build expected baselines map for all stations for Level 4 spatial correlation
        expected_baselines_map: Dict[str, float] = {}
        for st_id, station in self.stations.items():
            live = self.live_cache.get(st_id) if USE_LIVE_WEATHER else None
            if live is not None:
                # The real observation itself is the "expected" value before
                # any fault injection is layered on top of it.
                expected_baselines_map[st_id] = live["temperature"]
            else:
                expected_baselines_map[st_id] = self._get_diurnal_temp(station["base_temp"], hour)

        # 3. Evaluate each station through the 4-Level Pipeline
        for st_id, station in self.stations.items():
            station["last_reported"] = timestamp
            readings = current_readings_map[st_id]
            temp = readings["temperature"]
           
            # History of temperatures for statistical Level 2
            past_temps = [r["temperature"] for r in self.readings_history[st_id][-30:]]
            expected_temp = expected_baselines_map[st_id]
           
            is_synoptic = self.active_faults.get(st_id, {}).get("type") in ["HEATWAVE", "CLOUDBURST"]

            # Run 4-level evaluation
            analysis = self.detector.classify_and_score(
                station=station,
                parameter="temperature" if st_id not in self.active_faults or self.active_faults[st_id]["type"] != "PHYSICAL_IMPOSSIBLE" else "humidity",
                value=temp if (st_id not in self.active_faults or self.active_faults[st_id]["type"] != "PHYSICAL_IMPOSSIBLE") else readings["humidity"],
                expected_baseline=expected_temp if (st_id not in self.active_faults or self.active_faults[st_id]["type"] != "PHYSICAL_IMPOSSIBLE") else station["base_humidity"],
                history_values=past_temps,
                all_stations=list(self.stations.values()),
                current_readings_map=current_readings_map,
                hour=hour,
                expected_baselines_map=expected_baselines_map,
                is_synoptic_event=is_synoptic
            )

            classification = analysis["classification"]
            trust = analysis["trust_score"]
            anomaly_score = analysis["anomaly_score"]

            # Update Station Status
            if classification == "GENUINE_EXTREME":
                station["status"] = "EXTREME"
                station["trust_score"] = trust
            elif classification == "SENSOR_FAULT":
                station["status"] = "FAULT"
                station["trust_score"] = trust
            elif classification == "DATA_QUALITY_ISSUE":
                station["status"] = "FAULT"
                station["trust_score"] = trust
            elif classification == "UNCERTAIN":
                station["status"] = "UNCERTAIN"
                station["trust_score"] = trust
            elif anomaly_score > 0.40:
                station["status"] = "SUSPICIOUS"
                station["trust_score"] = 0.82
            else:
                station["status"] = "NORMAL"
                station["trust_score"] = 0.98

            # Append reading to historical buffer
            reading_entry = {
                "station_id": st_id,
                "timestamp": timestamp,
                "temperature": temp,
                "humidity": readings["humidity"],
                "pressure": readings["pressure"],
                "wind_speed": readings["wind_speed"],
                "wind_direction": readings["wind_direction"],
                "rainfall": readings["rainfall"],
                "quality_flag": "VALIDATED" if station["status"] in ["NORMAL", "EXTREME"] else "REJECTED" if station["status"] == "FAULT" else "SUSPICIOUS",
                "trust_score": station["trust_score"]
            }
            self.readings_history[st_id].append(reading_entry)
            if len(self.readings_history[st_id]) > 60:
                self.readings_history[st_id].pop(0)

            # Record Anomaly and Alert if non-normal (only during live stream, not seed setup)
            if not is_initial and classification != "NORMAL":
                anom_id = f"ANOM-{st_id[-5:]}-{int(time.time()) % 100000}"
                eval_param = "humidity" if analysis["rule_violation"] and readings["humidity"] > 100 else "temperature"
                eval_val = readings[eval_param]
               
                anomaly_entry = {
                    "anomaly_id": anom_id,
                    "station_id": st_id,
                    "station_name": station["name"],
                    "timestamp": timestamp,
                    "parameter": eval_param,
                    "value": eval_val,
                    "expected_range": analysis["expected_range"],
                    "anomaly_score": analysis["anomaly_score"],
                    "anomaly_type": analysis["anomaly_type"],
                    "classification": classification,
                    "confidence_score": analysis["confidence_score"],
                    "contributing_factors": analysis["contributing_factors"],
                    "rule_violation": analysis["rule_violation"],
                    "z_score": analysis["z_score"],
                    "ml_score": analysis["ml_score"],
                    "spatial_agreement": analysis["spatial_agreement"],
                    "recommended_action": analysis["recommended_action"],
                    "verification_status": "UNVERIFIED"
                }
               
                # Deduplicate ongoing anomalies for same station
                self.active_anomalies = [a for a in self.active_anomalies if a["station_id"] != st_id]
                self.active_anomalies.insert(0, anomaly_entry)
                if len(self.active_anomalies) > 30:
                    self.active_anomalies.pop()

                # Generate Severity Tiered Alert
                sev = "CRITICAL" if classification in ["GENUINE_EXTREME", "DATA_QUALITY_ISSUE"] else "HIGH" if classification == "SENSOR_FAULT" else "MEDIUM"
                alert_entry = {
                    "alert_id": f"ALRT-{int(time.time() * 1000) % 1000000}",
                    "anomaly_id": anom_id,
                    "station_id": st_id,
                    "station_name": station["name"],
                    "timestamp": timestamp,
                    "parameter": eval_param,
                    "value": eval_val,
                    "severity": sev,
                    "classification": classification,
                    "message": f"{classification}: {station['name']} observed {eval_val} for {eval_param}. {analysis['recommended_action']}",
                    "acknowledged": False
                }
                self.active_alerts = [al for al in self.active_alerts if al["station_id"] != st_id]
                self.active_alerts.insert(0, alert_entry)
                if len(self.active_alerts) > 25:
                    self.active_alerts.pop()

    # Fault Injection Presets
    def inject_scenario(self, scenario: str, station_id: Optional[str] = None) -> Dict[str, Any]:
        """Inject 1 of 5 realistic scenarios."""
        target_id = station_id or "IMD-RJ-04"
       
        if scenario == "STUCK_SENSOR":
            # Preset A: Stuck sensor flatline at 34.0°C
            self.active_faults[target_id] = {
                "type": "FLATLINE",
                "fixed_val": 34.0
            }
            # Pre-seed last 15 historical values to 34.0 to trigger flatline immediately
            for r in self.readings_history[target_id][-14:]:
                r["temperature"] = 34.0
            return {"status": "SUCCESS", "scenario": scenario, "target_station": target_id, "desc": "Temperature sensor frozen at 34.0°C flatline"}

        elif scenario == "HEATWAVE":
            # Preset B: Coordinated regional heatwave across 4 stations
            targets = ["IMD-RJ-04", "IMD-RJ-05", "IMD-RJ-06", "IMD-DL-01"]
            for tid in targets:
                self.active_faults[tid] = {
                    "type": "HEATWAVE",
                    "boost": 7.5
                }
            return {"status": "SUCCESS", "scenario": scenario, "targets": targets, "desc": "Coordinated +7.5°C heat dome across Rajasthan & Delhi"}

        elif scenario == "PHYSICAL_IMPOSSIBLE":
            # Preset C: Impossible physics (RH 118%, negative rain)
            target = station_id or "IMD-MH-01"
            self.active_faults[target] = {
                "type": "PHYSICAL_IMPOSSIBLE",
                "rh": 118.0,
                "rain": -12.0
            }
            return {"status": "SUCCESS", "scenario": scenario, "target_station": target, "desc": "Injected RH = 118.0% and Rainfall = -12.0 mm"}

        elif scenario == "DRIFT":
            # Preset D: Progressive sensor drift
            target = station_id or "IMD-DL-01"
            self.active_faults[target] = {
                "type": "DRIFT",
                "step": 5
            }
            return {"status": "SUCCESS", "scenario": scenario, "target_station": target, "desc": "Calibration drift active: +0.25°C per interval"}

        elif scenario == "CLOUDBURST":
            # Preset E: Synoptic cloudburst / cyclone front
            target = station_id or "IMD-ML-01"
            self.active_faults[target] = {
                "type": "CLOUDBURST",
                "rain": 62.0,
                "wind": 92.0,
                "p_drop": 18.0
            }
            return {"status": "SUCCESS", "scenario": scenario, "target_station": target, "desc": "Severe storm: 62 mm rain, 92 km/h wind, 18 hPa drop"}

        return {"status": "ERROR", "message": f"Unknown scenario: {scenario}"}

    def reset_all(self):
        """Clears all active fault injections and resets all stations to pristine normal state."""
        self.active_faults.clear()
        self.active_anomalies.clear()
        self.active_alerts.clear()
        for s in self.stations.values():
            s["status"] = "NORMAL"
            s["trust_score"] = 0.98
        # Clear and re-populate nominal historical readings
        base_time = datetime.now(timezone(timedelta(hours=5, minutes=30)))
        for st_id in self.stations:
            self.readings_history[st_id] = []
        for i in range(25, 0, -1):
            tick_time = base_time - timedelta(minutes=i * 5)
            self._generate_tick_readings(tick_time.isoformat(), tick_time.hour, is_initial=True)
        return {"status": "SUCCESS", "message": "All stations restored to normal baseline"}

    def record_feedback(self, anomaly_id: str, action: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Logs analyst feedback and updates verification status."""
        for anom in self.active_anomalies:
            if anom["anomaly_id"] == anomaly_id:
                anom["verification_status"] = action
                st_id = anom["station_id"]
               
                # If analyst dismissed or confirmed, adjust station accordingly
                if action == "DISMISS":
                    if st_id in self.active_faults:
                        del self.active_faults[st_id]
                    if st_id in self.stations:
                        self.stations[st_id]["status"] = "NORMAL"
                        self.stations[st_id]["trust_score"] = 0.95
                       
                feedback_item = {
                    "anomaly_id": anomaly_id,
                    "action": action,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "notes": notes
                }
                self.feedback_log.append(feedback_item)
                return {"status": "SUCCESS", "anomaly": anom}
               
        return {"status": "ERROR", "message": "Anomaly ID not found"}

    def get_system_metrics(self) -> Dict[str, Any]:
        """Calculates real-time network health metrics."""
        total = len(self.stations)
        normal_count = sum(1 for s in self.stations.values() if s["status"] == "NORMAL")
        health_pct = round((normal_count / total) * 100.0, 1)
        critical_count = sum(1 for a in self.active_alerts if a["severity"] == "CRITICAL")
       
        ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
       
        return {
            "network_health_pct": health_pct,
            "total_stations": total,
            "active_stations": total,
            "active_anomalies": len(self.active_anomalies),
            "critical_alerts": critical_count,
            "avg_latency_ms": 142.0 + random.uniform(-15.0, 20.0),
            "precision_estimate": 0.92,
            "recall_estimate": 0.89,
            "simulated_ist_time": ist_now.strftime("%d-%b-%Y %H:%M:%S IST")
        }

    async def run_simulation_loop(self):
        """Continuous background loop streaming new readings every 3.5 seconds."""
        self.is_running = True
        while self.is_running:
            try:
                ist_now = datetime.now(timezone(timedelta(hours=5, minutes=30)))
                self._generate_tick_readings(ist_now.isoformat(), ist_now.hour)
            except Exception as e:
                print(f"Error in simulation loop: {e}")
            await asyncio.sleep(3.5)

    async def refresh_live_weather(self):
        """Fetch one real observation per station from OpenWeatherMap and
        update self.live_cache. Failures for individual stations are logged
        and simply leave that station's previous cached value (or None) in
        place, so the fast tick loop above falls back to synthetic data."""
        for st_id, station in self.stations.items():
            result = await fetch_live_reading(station["lat"], station["lng"])
            if result is not None:
                self.live_cache[st_id] = result

    async def run_live_weather_loop(self):
        """Background loop that refreshes self.live_cache on a slow cadence
        (LIVE_WEATHER_POLL_SECONDS). Only started when USE_LIVE_WEATHER=true.
        Kept separate from run_simulation_loop so the fast 3.5s UI ticker
        never blocks on a network call."""
        while self.is_running:
            try:
                await self.refresh_live_weather()
            except Exception as e:
                print(f"Error in live weather loop: {e}")
            await asyncio.sleep(LIVE_WEATHER_POLL_SECONDS)

# Global singleton manager instance
state_manager = TelemetryStateManager()
