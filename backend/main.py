import os
import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.models import (
    Station, Reading, Anomaly, Alert, FeedbackRequest,
    SimulationInjectRequest, NeighborsResponse, TrustScoreResponse, SystemMetrics
)
from backend.state import state_manager
from backend.detector import haversine_distance
from backend.config import USE_LIVE_WEATHER

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background simulation ticker
    loop_task = asyncio.create_task(state_manager.run_simulation_loop())

    # Only starts if USE_LIVE_WEATHER=true in backend/.env
    live_task = None
    if USE_LIVE_WEATHER:
        live_task = asyncio.create_task(state_manager.run_live_weather_loop())

    yield
    # Shutdown
    state_manager.is_running = False
    loop_task.cancel()
    if live_task:
        live_task.cancel()

app = FastAPI(
    title="SkyGuard AI  (वायु-दृष्टि) API",
    description="Intelligent Anomaly Detection and Quality-Control Engine for India's AWS Network (MoES/IMD)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "HEALTHY", "service": "VayuDrishti Anomaly Engine"}

@app.get("/api/stations", response_model=List[Station])
def get_stations(zone: Optional[str] = None, status: Optional[str] = None):
    stations = list(state_manager.stations.values())
    if zone:
        stations = [s for s in stations if zone.lower() in s["zone"].lower()]
    if status:
        stations = [s for s in stations if s["status"].upper() == status.upper()]
    return stations

@app.get("/api/stations/{station_id}", response_model=Station)
def get_station_detail(station_id: str):
    if station_id not in state_manager.stations:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
    return state_manager.stations[station_id]

@app.get("/api/stations/{station_id}/readings", response_model=List[Reading])
def get_station_readings(station_id: str, limit: int = Query(50, ge=1, le=100)):
    if station_id not in state_manager.readings_history:
        raise HTTPException(status_code=404, detail=f"No readings found for {station_id}")
    history = state_manager.readings_history[station_id]
    return history[-limit:]

@app.get("/api/stations/{station_id}/neighbors", response_model=NeighborsResponse)
def get_station_neighbors(station_id: str, parameter: str = "temperature"):
    if station_id not in state_manager.stations:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
   
    target_station = state_manager.stations[station_id]
    target_readings = state_manager.readings_history[station_id]
    target_val = target_readings[-1][parameter] if target_readings else target_station.get("base_" + parameter, 30.0)
    target_base = target_station.get("base_" + parameter, 30.0)

    current_map = {}
    for st_id, hist in state_manager.readings_history.items():
        if hist:
            current_map[st_id] = {parameter: hist[-1][parameter]}

    spatial_agreement, neighbors_info = state_manager.detector.evaluate_level4_spatial(
        target_station=target_station,
        target_val=target_val,
        target_baseline=target_base,
        all_stations=list(state_manager.stations.values()),
        current_readings_map=current_map,
        parameter=parameter
    )

    return NeighborsResponse(
        target_station_id=station_id,
        target_value=round(target_val, 2),
        parameter=parameter,
        spatial_agreement=round(spatial_agreement, 2),
        neighbors=neighbors_info
    )

@app.get("/api/anomalies", response_model=List[Anomaly])
def get_anomalies(
    classification: Optional[str] = None,
    station_id: Optional[str] = None
):
    anomalies = state_manager.active_anomalies
    if classification:
        anomalies = [a for a in anomalies if a["classification"].upper() == classification.upper()]
    if station_id:
        anomalies = [a for a in anomalies if a["station_id"] == station_id]
    return anomalies

@app.get("/api/alerts", response_model=List[Alert])
def get_alerts(severity: Optional[str] = None):
    alerts = state_manager.active_alerts
    if severity:
        alerts = [a for a in alerts if a["severity"].upper() == severity.upper()]
    return alerts

@app.post("/api/alerts/{alert_id}/feedback")
def submit_analyst_feedback(alert_id: str, payload: FeedbackRequest):
    # Map alert_id to corresponding anomaly
    matched_anomaly_id = None
    for a in state_manager.active_alerts:
        if a["alert_id"] == alert_id:
            matched_anomaly_id = a["anomaly_id"]
            a["acknowledged"] = True
            break
           
    if not matched_anomaly_id and state_manager.active_anomalies:
        matched_anomaly_id = state_manager.active_anomalies[0]["anomaly_id"]

    if not matched_anomaly_id:
        raise HTTPException(status_code=404, detail="No active anomaly associated with this alert")

    result = state_manager.record_feedback(matched_anomaly_id, payload.action, payload.notes)
    return result

@app.post("/api/simulator/inject")
def inject_fault(payload: SimulationInjectRequest):
    res = state_manager.inject_scenario(payload.scenario, payload.station_id)
    return res

@app.post("/api/simulator/reset")
def reset_simulation():
    res = state_manager.reset_all()
    return res

@app.get("/api/trust-score/{station_id}", response_model=TrustScoreResponse)
def get_station_trust_score(station_id: str):
    if station_id not in state_manager.stations:
        raise HTTPException(status_code=404, detail=f"Station {station_id} not found")
       
    st = state_manager.stations[station_id]
    overall_trust = st["trust_score"]
   
    # Grade assignment
    if overall_trust >= 0.90:
        grade = "A+ (EXCELLENT)"
    elif overall_trust >= 0.75:
        grade = "A (HIGH - TRUSTED)"
    elif overall_trust >= 0.50:
        grade = "B (MODERATE - CAUTION)"
    elif overall_trust >= 0.25:
        grade = "C (DEGRADED)"
    else:
        grade = "F (UNRELIABLE - REJECTED)"

    active_flags = []
    if st["status"] == "FAULT":
        active_flags.append("SENSOR_CALIBRATION_SUSPECT")
    elif st["status"] == "EXTREME":
        active_flags.append("GENUINE_EXTREME_EVENT_CONFIRMED")
    elif st["status"] == "UNCERTAIN":
        active_flags.append("SPATIAL_VERIFICATION_PENDING")

    return TrustScoreResponse(
        station_id=station_id,
        station_name=st["name"],
        overall_trust_score=round(overall_trust, 2),
        parameter_scores={
            "temperature": round(overall_trust, 2),
            "humidity": round(max(0.1, overall_trust - 0.04), 2),
            "pressure": 0.99,
            "wind_speed": 0.95,
            "rainfall": 0.97
        },
        confidence_interval=[round(overall_trust - 0.05, 2), round(min(1.0, overall_trust + 0.03), 2)],
        reliability_grade=grade,
        active_flags=active_flags,
        last_updated=st["last_reported"]
    )

@app.get("/api/metrics", response_model=SystemMetrics)
def get_metrics():
    return state_manager.get_system_metrics()

# Serve frontend build if dist folder exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
   
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
