import sys
import os

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(__file__))

from backend.state import state_manager
from backend.detector import haversine_distance

def run_tests():
    print("=== Testing VayuDrishti AI Anomaly Engine ===")
    
    # 1. Verify 15 stations seeded
    assert len(state_manager.stations) == 15, f"Expected 15 stations, got {len(state_manager.stations)}"
    print("[PASS] 15 Indian AWS stations initialized")

    # 2. Verify Level 1: Impossible Physics Rule Check
    res_l1, reason_l1 = state_manager.detector.check_level1_rules("humidity", 118.0, {})
    assert res_l1 is True, "Expected rule violation for RH=118%"
    print(f"[PASS] Level 1 Rule Caught: {reason_l1}")

    res_l1_rain, reason_l1_rain = state_manager.detector.check_level1_rules("rainfall", -10.0, {})
    assert res_l1_rain is True, "Expected rule violation for negative rain"
    print(f"[PASS] Level 1 Rule Caught: {reason_l1_rain}")

    # 3. Verify Level 2: Flatline Detection
    flatline_data = [34.0] * 15
    z, outlier, is_flatline, mean, std = state_manager.detector.check_level2_statistics(flatline_data, 34.0)
    assert is_flatline is True, "Expected flatline detection for frozen values"
    print(f"[PASS] Level 2 Flatline Caught (std={std:.4f})")

    # 4. Verify Level 3: Isolation Forest ML Scoring
    score_normal = state_manager.detector.score_level3_ml(33.0, 32.5, 14)
    score_extreme = state_manager.detector.score_level3_ml(49.0, 32.5, 14)
    assert score_extreme > score_normal, f"Extreme score ({score_extreme}) should be higher than normal ({score_normal})"
    print(f"[PASS] Level 3 ML Isolation Forest: normal={score_normal:.2f}, extreme={score_extreme:.2f}")

    # 5. Verify Level 4: Spatial Distance (Haversine)
    dist_delhi_palam = haversine_distance(28.5840, 77.2065, 28.5665, 77.1031)
    assert 5.0 < dist_delhi_palam < 20.0, f"Distance Delhi Safdarjung to Palam unexpected: {dist_delhi_palam} km"
    print(f"[PASS] Level 4 Haversine Distance: Safdarjung to Palam = {dist_delhi_palam:.1f} km")

    # 6. Test Scenario A: Stuck Sensor Flatline (Should classify as SENSOR_FAULT)
    res_a = state_manager.inject_scenario("STUCK_SENSOR", "IMD-RJ-04")
    assert res_a["status"] == "SUCCESS"
    state_manager._generate_tick_readings("2026-09-03T01:00:00Z", 14)
    anom_a = next((a for a in state_manager.active_anomalies if a["station_id"] == "IMD-RJ-04"), None)
    assert anom_a is not None, "Expected anomaly for stuck sensor"
    assert anom_a["classification"] == "SENSOR_FAULT", f"Expected SENSOR_FAULT, got {anom_a['classification']}"
    print(f"[PASS] Scenario A: Correctly Classified as {anom_a['classification']} (Confidence: {anom_a['confidence_score']})")

    # 7. Test Scenario B: Coordinated Heatwave (Should classify as GENUINE_EXTREME)
    state_manager.reset_all()
    res_b = state_manager.inject_scenario("HEATWAVE", "IMD-RJ-04")
    assert res_b["status"] == "SUCCESS"
    state_manager._generate_tick_readings("2026-09-03T01:00:00Z", 14)
    anom_b = next((a for a in state_manager.active_anomalies if a["station_id"] == "IMD-RJ-04"), None)
    assert anom_b is not None, "Expected anomaly for heatwave"
    assert anom_b["classification"] == "GENUINE_EXTREME", f"Expected GENUINE_EXTREME, got {anom_b['classification']}"
    print(f"[PASS] Scenario B: Correctly Classified as {anom_b['classification']} (Spatial Agreement: {anom_b['spatial_agreement']})")

    # 8. Test Scenario C: Physical Violation (Should classify as DATA_QUALITY_ISSUE)
    state_manager.reset_all()
    res_c = state_manager.inject_scenario("PHYSICAL_IMPOSSIBLE", "IMD-MH-01")
    assert res_c["status"] == "SUCCESS"
    state_manager._generate_tick_readings("2026-09-03T01:00:00Z", 14)
    anom_c = next((a for a in state_manager.active_anomalies if a["station_id"] == "IMD-MH-01"), None)
    assert anom_c is not None, "Expected anomaly for physical impossible"
    assert anom_c["classification"] == "DATA_QUALITY_ISSUE", f"Expected DATA_QUALITY_ISSUE, got {anom_c['classification']}"
    print(f"[PASS] Scenario C: Correctly Classified as {anom_c['classification']} (Rule Penalty Active)")

    state_manager.reset_all()
    print("\n>>> ALL 8 CORE METEOROLOGICAL ENGINE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
