import math
import numpy as np
from typing import List, Dict, Tuple, Any, Optional
from sklearn.ensemble import IsolationForest

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in km."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class AnomalyDetector:
    def __init__(self):
        # Initialize and pre-train Isolation Forest on synthetic normal diurnal variations
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42
        )
        self._pretrain_ml_model()

    def _pretrain_ml_model(self):
        """Train IsolationForest on synthetic normal meteorological cycles."""
        np.random.seed(42)
        samples = []
        for hour in range(24):
            hour_sin = math.sin(2 * math.pi * hour / 24.0)
            hour_cos = math.cos(2 * math.pi * hour / 24.0)
            # 50 normal observations per hour with natural diurnal noise
            for _ in range(50):
                expected_delta = 5.0 * hour_sin
                normal_temp_noise = np.random.normal(0, 1.2)
                val_normalized = (expected_delta + normal_temp_noise) / 10.0
                samples.append([val_normalized, hour_sin, hour_cos, normal_temp_noise])
        
        X = np.array(samples)
        self.model.fit(X)

    def check_level1_rules(self, parameter: str, value: float, current_readings: Dict[str, float]) -> Tuple[bool, Optional[str]]:
        """
        Level 1: Deterministic Physical and Climatic Bound Checks.
        Returns (is_violation, reason).
        """
        if parameter == "temperature":
            if value < -25.0:
                return True, f"Temperature {value:.1f}°C is below physical limit (-25.0°C)"
            if value > 58.0:
                return True, f"Temperature {value:.1f}°C exceeds national maximum record (58.0°C)"
        
        elif parameter == "humidity":
            if value < 0.0:
                return True, f"Relative humidity {value:.1f}% cannot be negative"
            if value > 100.0:
                return True, f"Relative humidity {value:.1f}% exceeds supersaturation limit (> 100.0%)"
        
        elif parameter == "rainfall":
            if value < 0.0:
                return True, f"Rainfall {value:.1f} mm cannot be negative"
            if value > 250.0:
                return True, f"Rainfall rate {value:.1f} mm/hr exceeds physical cloudburst threshold"

        elif parameter == "wind_speed":
            if value < 0.0:
                return True, f"Wind speed {value:.1f} km/h cannot be negative"
            if value > 260.0:
                return True, f"Wind speed {value:.1f} km/h exceeds Super Cyclonic Storm limits (> 260 km/h)"

        elif parameter == "wind_direction":
            if value < 0.0 or value > 360.0:
                return True, f"Wind direction {value:.1f}° outside valid compass circle [0, 360]"

        elif parameter == "pressure":
            if value < 600.0 or value > 1090.0:
                return True, f"Atmospheric pressure {value:.1f} hPa outside terrestrial bounds [600, 1090]"

        return False, None

    def check_level2_statistics(self, values: List[float], current_val: float) -> Tuple[float, bool, bool, float, float]:
        """
        Level 2: Rolling Statistics, Z-Score, and Flatline Check.
        Returns (z_score, is_outlier, is_flatline, rolling_mean, rolling_std).
        """
        if len(values) < 5:
            return 0.0, False, False, current_val, 1.0
        
        arr = np.array(values)
        mean = float(np.mean(arr))
        std = float(np.std(arr))
        
        # Avoid division by zero
        safe_std = std if std > 1e-4 else 1e-4
        z_score = abs(current_val - mean) / safe_std
        
        # Check flatline: if last 12 readings have virtually zero variance
        is_flatline = False
        if len(values) >= 10:
            last_recent = values[-12:] if len(values) >= 12 else values
            recent_std = float(np.std(last_recent))
            if recent_std < 0.04 and len(set([round(v, 2) for v in last_recent])) <= 2:
                is_flatline = True
                
        is_outlier = z_score > 3.2
        return float(z_score), is_outlier, is_flatline, mean, safe_std

    def score_level3_ml(self, current_val: float, expected_val: float, hour: int) -> float:
        """
        Level 3: Isolation Forest Anomaly Scoring.
        Returns continuous anomaly score between 0.0 and 1.0.
        """
        hour_sin = math.sin(2 * math.pi * hour / 24.0)
        hour_cos = math.cos(2 * math.pi * hour / 24.0)
        delta = current_val - expected_val
        val_norm = delta / 10.0
        
        sample = np.array([[val_norm, hour_sin, hour_cos, delta]])
        try:
            # decision_function yields higher values for normal, negative for outliers
            raw_score = float(self.model.decision_function(sample)[0])
            # Map [-0.4, 0.2] to [1.0, 0.0]
            ml_anomaly = 1.0 - (raw_score + 0.35) / 0.55
            return float(np.clip(ml_anomaly, 0.0, 1.0))
        except Exception:
            # Fallback based on normalized delta
            return float(np.clip(abs(delta) / 12.0, 0.0, 1.0))

    def evaluate_level4_spatial(
        self,
        target_station: Dict[str, Any],
        target_val: float,
        target_baseline: float,
        all_stations: List[Dict[str, Any]],
        current_readings_map: Dict[str, Dict[str, float]],
        expected_baselines_map: Optional[Dict[str, float]] = None,
        parameter: str = "temperature"
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Level 4: Spatial Correlation with k-nearest neighbors.
        Returns (spatial_agreement_score, neighbors_info).
        """
        target_lat = target_station["lat"]
        target_lng = target_station["lng"]
        target_id = target_station["id"]
        
        # Calculate distances to all other stations
        distances = []
        for st in all_stations:
            if st["id"] == target_id:
                continue
            dist = haversine_distance(target_lat, target_lng, st["lat"], st["lng"])
            distances.append((dist, st))
            
        distances.sort(key=lambda x: x[0])
        nearest = distances[:3]  # Top 3 nearest neighbors
        
        target_deviation = target_val - target_baseline
        neighbor_deviations = []
        neighbors_info = []
        
        for dist, st in nearest:
            st_id = st["id"]
            st_readings = current_readings_map.get(st_id, {})
            st_val = st_readings.get(parameter, target_baseline)
            if expected_baselines_map and st_id in expected_baselines_map:
                st_base = expected_baselines_map[st_id]
            else:
                st_base = st.get("base_" + parameter, target_baseline)
            st_dev = st_val - st_base
            neighbor_deviations.append(st_dev)
            
            neighbors_info.append({
                "station_id": st_id,
                "name": st["name"],
                "distance_km": round(dist, 1),
                "current_value": round(st_val, 2),
                "deviation_from_baseline": round(st_dev, 2),
                "status": "ELEVATED" if abs(st_dev) > 3.0 else "NORMAL"
            })
            
        if not neighbor_deviations:
            return 0.5, neighbors_info
            
        avg_neighbor_dev = float(np.mean(neighbor_deviations))
        diff = abs(target_deviation - avg_neighbor_dev)
        
        # If target deviation closely tracks neighbor deviation -> High agreement
        # If target has +8°C deviation while neighbors have 0°C -> Low agreement (Isolated anomaly)
        if diff <= 2.5:
            agreement = 0.95
        elif diff <= 4.5:
            agreement = 0.80
        elif diff <= 6.5:
            agreement = 0.50
        elif diff <= 9.0:
            agreement = 0.20
        else:
            agreement = 0.05
            
        # If neighbors are very distant (> 500 km), reduce agreement confidence (Himalayan / island isolation)
        closest_dist = nearest[0][0] if nearest else 999.0
        if closest_dist > 450.0:
            agreement = min(agreement, 0.48)  # Triggers UNCERTAIN
            
        return float(agreement), neighbors_info

    def classify_and_score(
        self,
        station: Dict[str, Any],
        parameter: str,
        value: float,
        expected_baseline: float,
        history_values: List[float],
        all_stations: List[Dict[str, Any]],
        current_readings_map: Dict[str, Dict[str, float]],
        hour: int,
        expected_baselines_map: Optional[Dict[str, float]] = None,
        is_synoptic_event: bool = False
    ) -> Dict[str, Any]:
        """
        Synthesizes Levels 1, 2, 3, and 4 to compute Anomaly Score, Classification,
        Confidence Score, Trust Score, and Explainability Attribution.
        """
        # Level 1: Rule Engine
        rule_violation, rule_reason = self.check_level1_rules(
            parameter, value, current_readings_map.get(station["id"], {})
        )
        
        # Level 2: Statistical Profiling
        z_score, stat_outlier, is_flatline, rolling_mean, rolling_std = self.check_level2_statistics(
            history_values, value
        )
        
        # Level 3: ML Isolation Forest
        ml_score = self.score_level3_ml(value, expected_baseline, hour)
        
        # Level 4: Spatial Context
        spatial_agreement, neighbors_info = self.evaluate_level4_spatial(
            station, value, expected_baseline, all_stations, current_readings_map, expected_baselines_map, parameter
        )
        
        # Multi-sensor cross check (synoptic check for cyclone/cloudburst)
        target_readings = current_readings_map.get(station["id"], {})
        p_drop = target_readings.get("pressure", 1010.0) < (station.get("base_pressure", 1010.0) - 10.0)
        w_surge = target_readings.get("wind_speed", 10.0) > 45.0
        r_surge = target_readings.get("rainfall", 0.0) > 20.0
        is_synoptic_cross_confirmed = (p_drop and w_surge) or (w_surge and r_surge) or is_synoptic_event

        contributing_factors = []
        
        # Decision Matrix
        if rule_violation:
            classification = "DATA_QUALITY_ISSUE"
            confidence = 0.99
            anomaly_type = "RULE_VIOLATION"
            anomaly_score = 0.98
            contributing_factors.append(f"Level 1: {rule_reason}")
            contributing_factors.append("Deterministic bound exceeded without meteorological precedent")
            recommended_action = "Reject record immediately; verify sensor calibration & data packet transmission."
            trust_score = 0.08
            
        elif is_flatline:
            classification = "SENSOR_FAULT"
            confidence = 0.94
            anomaly_type = "FLATLINE"
            anomaly_score = 0.92
            contributing_factors.append("Level 2: Sensor flatline detected (standard deviation < 0.04 over 12 readings)")
            contributing_factors.append("Diurnal variation missing; readings frozen despite natural solar cycle")
            contributing_factors.append(f"Level 4: Nearest neighbors show active variation (Spatial agreement: {spatial_agreement*100:.0f}%)")
            recommended_action = "Dispatch field technician to inspect sensor mechanical mechanism or GPRS telemetry."
            trust_score = 0.12

        elif stat_outlier or ml_score > 0.60:
            if stat_outlier:
                contributing_factors.append(f"Level 2: Statistical outlier (|Z| = {z_score:.2f} > 3.20 limit)")
            if ml_score > 0.60:
                contributing_factors.append(f"Level 3: Isolation Forest anomaly score = {ml_score:.2f} (Model Outlier)")
                
            # Classify based on Spatial & Synoptic Agreement
            if (spatial_agreement >= 0.70 or is_synoptic_cross_confirmed):
                classification = "GENUINE_EXTREME"
                confidence = 0.91
                anomaly_type = "COORDINATED_EXTREME"
                anomaly_score = max(0.75, ml_score)
                contributing_factors.append(f"Level 4: Strong regional neighbor agreement ({spatial_agreement*100:.0f}%) confirms wide-area event")
                if is_synoptic_cross_confirmed:
                    contributing_factors.append("Cross-sensor correlation matches physical cyclone / storm front signature")
                recommended_action = "DO NOT dispatch repair. Escalate immediately to NDMA & Regional Disaster Warning Center."
                # Note: Sensor is functioning accurately, so Trust Score remains very high!
                trust_score = 0.96
                
            elif spatial_agreement <= 0.25:
                classification = "SENSOR_FAULT"
                confidence = 0.88
                anomaly_type = "SPIKE" if value > expected_baseline else "DROP"
                anomaly_score = max(0.80, ml_score)
                contributing_factors.append(f"Level 4: Complete neighbor divergence ({spatial_agreement*100:.0f}% agreement) - isolated reading")
                contributing_factors.append("Nearby stations under identical air mass show no corresponding trend")
                recommended_action = "Mark observation as invalid; queue station for remote diagnostic reset."
                trust_score = 0.15
                
            else:
                # Ambiguous or sparse neighbor zone
                classification = "UNCERTAIN"
                confidence = 0.52
                anomaly_type = "DRIFT" if abs(z_score) < 4.0 else "SPIKE"
                anomaly_score = 0.62
                contributing_factors.append(f"Level 4: Moderate neighbor agreement ({spatial_agreement*100:.0f}%) or sparse geographic density")
                contributing_factors.append("Signals insufficient to conclusively separate sensor glitch from localized microclimate")
                recommended_action = "Escalate to IMD Duty Meteorologist for manual review; do not alter automated warnings."
                trust_score = 0.55
                
        else:
            # Normal condition
            classification = "NORMAL"
            confidence = 0.95
            anomaly_type = "NONE"
            anomaly_score = max(0.02, ml_score * 0.3)
            recommended_action = "Nominal operations; no action needed."
            trust_score = 0.99

        expected_min = round(expected_baseline - 3.5, 1)
        expected_max = round(expected_baseline + 3.5, 1)

        return {
            "classification": classification,
            "confidence_score": round(confidence, 2),
            "anomaly_score": round(anomaly_score, 2),
            "anomaly_type": anomaly_type,
            "rule_violation": rule_violation,
            "z_score": round(z_score, 2),
            "ml_score": round(ml_score, 2),
            "spatial_agreement": round(spatial_agreement, 2),
            "neighbors_info": neighbors_info,
            "contributing_factors": contributing_factors,
            "recommended_action": recommended_action,
            "trust_score": round(trust_score, 2),
            "expected_range": [expected_min, expected_max]
        }
