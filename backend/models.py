from typing import List, Optional, Dict, Tuple
from pydantic import BaseModel, Field
from datetime import datetime

class Station(BaseModel):
    id: str
    name: str
    state: str
    lat: float
    lng: float
    zone: str
    elevation: float
    sensor_types: List[str] = ["temperature", "humidity", "pressure", "wind_speed", "wind_direction", "rainfall"]
    status: str = "NORMAL"  # NORMAL, SUSPICIOUS, FAULT, EXTREME, UNCERTAIN, OFFLINE
    trust_score: float = 0.98
    base_temp: float
    base_humidity: float
    base_pressure: float
    last_reported: str = ""

class Reading(BaseModel):
    station_id: str
    timestamp: str
    temperature: float
    humidity: float
    pressure: float
    wind_speed: float
    wind_direction: float
    rainfall: float
    quality_flag: str = "VALIDATED"  # RAW, VALIDATED, SUSPICIOUS, REJECTED
    trust_score: float = 0.98

class Anomaly(BaseModel):
    anomaly_id: str
    station_id: str
    station_name: str
    timestamp: str
    parameter: str
    value: float
    expected_range: List[float]  # [min, max]
    anomaly_score: float  # 0.0 to 1.0
    anomaly_type: str  # SPIKE, DROP, FLATLINE, DRIFT, RULE_VIOLATION, COORDINATED_EXTREME
    classification: str  # GENUINE_EXTREME, SENSOR_FAULT, DATA_QUALITY_ISSUE, UNCERTAIN
    confidence_score: float  # 0.0 to 1.0
    contributing_factors: List[str]
    rule_violation: bool = False
    z_score: float = 0.0
    ml_score: float = 0.0
    spatial_agreement: float = 1.0
    recommended_action: str
    verification_status: str = "UNVERIFIED"  # UNVERIFIED, CONFIRMED_FAULT, CONFIRMED_EXTREME, DISMISSED

class Alert(BaseModel):
    alert_id: str
    anomaly_id: str
    station_id: str
    station_name: str
    timestamp: str
    parameter: str
    value: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    classification: str  # GENUINE_EXTREME, SENSOR_FAULT, DATA_QUALITY_ISSUE, UNCERTAIN
    message: str
    acknowledged: bool = False

class FeedbackRequest(BaseModel):
    action: str  # CONFIRM_FAULT, CONFIRM_EXTREME, DISMISS
    notes: Optional[str] = None

class SimulationInjectRequest(BaseModel):
    scenario: str  # STUCK_SENSOR, HEATWAVE, PHYSICAL_IMPOSSIBLE, DRIFT, CLOUDBURST
    station_id: Optional[str] = None
    parameter: Optional[str] = "temperature"
    boost_val: Optional[float] = None

class NeighborInfo(BaseModel):
    station_id: str
    name: str
    distance_km: float
    current_value: float
    deviation_from_baseline: float
    status: str

class NeighborsResponse(BaseModel):
    target_station_id: str
    target_value: float
    parameter: str
    spatial_agreement: float
    neighbors: List[NeighborInfo]

class TrustScoreResponse(BaseModel):
    station_id: str
    station_name: str
    overall_trust_score: float
    parameter_scores: Dict[str, float]
    confidence_interval: List[float]
    reliability_grade: str  # "A+ (EXCELLENT)", "A (HIGH)", "B (MODERATE)", "C (DEGRADED)", "F (UNRELIABLE)"
    active_flags: List[str]
    last_updated: str

class SystemMetrics(BaseModel):
    network_health_pct: float
    total_stations: int
    active_stations: int
    active_anomalies: int
    critical_alerts: int
    avg_latency_ms: float
    precision_estimate: float
    recall_estimate: float
    simulated_ist_time: str
