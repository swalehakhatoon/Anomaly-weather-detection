# VayuDrishti AI (वायु-दृष्टि)
## Intelligent AI/ML-Based Quality-Control & Anomaly Detection Platform for India's Automatic Weather Station (AWS) Network
### Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD) — Smart India Hackathon 2026

---

## 1. Executive Summary

**VayuDrishti AI** is an intelligent meteorological telemetry surveillance and quality-control system designed for the India Meteorological Department (IMD) under the Ministry of Earth Sciences (MoES).

Across India's vast geographical expanse—from the Thar Desert to the Western Himalayas and coastal peninsulas—thousands of Automatic Weather Stations (AWS) transmit continuous high-velocity weather telemetry (temperature, humidity, atmospheric pressure, wind, and rainfall). Sensors frequently suffer insect intrusion, mechanical sticking, power loss, and calibration drift.

### The Critical Challenge
Traditional static thresholds (e.g. `if temp > 45°C: alert()`) fail because:
1. 47°C is ordinary in a Jaisalmer summer but catastrophic in Shimla.
2. They cannot detect subtle sensor drift (+0.2°C/week).
3. **They mistake true weather disasters (heatwaves, cloudbursts) for sensor hardware malfunctions.**

**VayuDrishti AI solves this with a 4-Layer Detection Architecture and Spatial Cross-Validation Engine.**

---

## 2. The 4-Level Detection Pipeline

```
Raw Telemetry Stream (MQTT / GPRS / INSAT-3D)
  │
  ▼
[ Level 1: Deterministic Physical Rules ]
  ├─ Absolute bounds (Temp: -20°C to 58°C, RH: 0–100%, Rain >= 0)
  └─ Physical consistency (Supersaturation, pressure bounds)
  │
  ▼
[ Level 2: Statistical Profiling & Sensor Flatline Check ]
  ├─ Rolling Z-Score & Modified Z-Score (MAD)
  └─ Sensor Flatline / Freeze detection (std < 0.04 over 12 readings)
  │
  ▼
[ Level 3: Unsupervised ML Outlier Scoring ]
  ├─ Isolation Forest (scikit-learn) trained on diurnal solar baselines
  └─ Continuous anomaly score from 0.00 to 1.00
  │
  ▼
[ Level 4: Spatial Neighbor & Synoptic Cross-Validation ]
  ├─ Haversine distance to 3 nearest AWS stations in climatic zone
  └─ Spatial agreement metric: does the regional air mass corroborate the trend?
  │
  ▼
[ Extreme Weather vs. Sensor Malfunction Decision Engine ]
  ├─ 🔴 SENSOR_FAULT: Isolated anomaly, flatline, or 0% neighbor agreement
  ├─ 🟣 GENUINE_EXTREME: Anomaly corroborated by >=70% regional neighbor agreement
  ├─ 🟡 DATA_QUALITY_ISSUE: Impossible bounds / corrupted transmission
  └─ ⚪ UNCERTAIN: Sparse geographic density; routes to human review (No false confidence)
```

---

## 3. Quickstart & Installation

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 1. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Run the Application
You can run both servers with the provided batch scripts:

**Start Backend (FastAPI on Port 8000):**
```bash
run_backend.bat
# Or manually:
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Start Frontend (Vite React on Port 5000):**
```bash
run_frontend.bat
# Or manually:
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5000`** to view the live dashboard.

---

## 4. SIH 2026 Judge Demo Walkthrough (The Killer Hook)

Navigate to the **⚡ Judge Demo Simulator** tab in the application:

### Preset A: Stuck Sensor Flatline (Hardware Malfunction)
- **Action:** Click `[Inject Stuck Sensor Flatline]`.
- **Target:** `IMD-RJ-04` (Jaisalmer).
- **What Happens:** The temperature freezes at **34.0°C**.
- **The Core AI Insight:** 34.0°C is an ordinary temperature. A basic threshold check would completely miss it. However, VayuDrishti catches it because:
  1. Standard deviation over 12 readings is zero (Level 2 Flatline).
  2. Nearest stations (Bikaner and Jodhpur) have active diurnal variation (Level 4 Divergence).
  3. System classifies it as **`SENSOR_FAULT`** (Red pin) and prompts: *"Dispatch technician for sensor inspection."*

### Preset B: Coordinated Regional Heatwave (Genuine Extreme Weather)
- **Action:** Click `[Inject Coordinated Regional Heatwave]`.
- **Target:** 4 stations across Rajasthan and Delhi.
- **What Happens:** Temperature surges +7.5°C to ~46.5°C.
- **The Core AI Insight:** Because all 4 neighboring stations corroborate the heat dome, spatial agreement is **>80%**.
- VayuDrishti classifies it as **`GENUINE_EXTREME`** (Purple pin).
- Recommended action: *"DO NOT dispatch repair. Escalate immediately to NDMA Disaster Advisory feed."*

### Preset C: Physical Bound Violation
- **Action:** Click `[Inject Physically Impossible Bounds]`.
- **Target:** `IMD-MH-01` (Mumbai Colaba).
- **What Happens:** Injects RH = 118% and Rainfall = -12.0 mm.
- Level 1 deterministic rules immediately catch and reject the packet as **`DATA_QUALITY_ISSUE`**.

---

## 5. Downstream Trust Score API

Downstream agencies (NDMA, Agricultural Advisories, Renewable Energy Forecasting) query `/api/trust-score/{station_id}`:

```json
{
  "station_id": "IMD-RJ-04",
  "station_name": "Jaisalmer",
  "overall_trust_score": 0.98,
  "parameter_scores": {
    "temperature": 0.98,
    "humidity": 0.94,
    "pressure": 0.99,
    "wind_speed": 0.95,
    "rainfall": 0.97
  },
  "confidence_interval": [0.93, 1.0],
  "reliability_grade": "A+ (EXCELLENT)",
  "active_flags": [],
  "last_updated": "2026-09-03T01:05:00+05:30"
}
```

If a sensor degrades or is stuck, the Trust Score drops immediately to **12% (Grade F - REJECTED)**, preventing poisoned data from corrupting numerical weather forecasts or agricultural sowing advisories.

---

## 6. Pre-Seeded Indian AWS Network (15 Stations)

1. **IMD-RJ-04** Jaisalmer (Arid / Thar Desert)
2. **IMD-RJ-05** Bikaner (Arid / Thar Desert)
3. **IMD-RJ-06** Jodhpur (Arid / Thar Desert)
4. **IMD-DL-01** New Delhi Safdarjung (Composite / Urban)
5. **IMD-DL-02** New Delhi Palam (Composite / Urban)
6. **IMD-MH-01** Mumbai Colaba (Coastal)
7. **IMD-MH-02** Mumbai Santacruz (Coastal)
8. **IMD-ML-01** Cherrapunji (High Rainfall / Meghalaya)
9. **IMD-ML-02** Mawsynram (High Rainfall / Meghalaya)
10. **IMD-HP-01** Shimla (Montane / Western Himalaya)
11. **IMD-UT-01** Leh (Cold Desert / Trans-Himalaya)
12. **IMD-TN-01** Chennai Meenambakkam (Coastal)
13. **IMD-MH-03** Nagpur (Central Semi-Arid)
14. **IMD-WB-01** Kolkata Alipore (Gangetic Delta)
15. **IMD-KA-01** Bengaluru (Deccan Plateau)
