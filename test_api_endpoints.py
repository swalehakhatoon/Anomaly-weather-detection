import time
import json
import urllib.request
import urllib.error
import subprocess
import sys
import os

def test_api():
    print("=== Starting End-to-End API Server Test ===")
    
    # Start FastAPI server via uvicorn in subprocess
    cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8015"]
    proc = subprocess.Popen(cmd, cwd=os.path.dirname(__file__))
    
    base_url = "http://127.0.0.1:8015"
    
    try:
        # 1. Wait for server to become responsive
        connected = False
        for _ in range(25):
            try:
                with urllib.request.urlopen(f"{base_url}/api/health", timeout=2) as resp:
                    if resp.status == 200:
                        connected = True
                        print("[PASS] FastAPI server is UP and responding to /api/health")
                        break
            except Exception:
                time.sleep(0.5)
                
        if not connected:
            raise RuntimeError("FastAPI server failed to start within timeout")

        # 2. Test GET /api/stations
        with urllib.request.urlopen(f"{base_url}/api/stations") as resp:
            assert resp.status == 200
            stations = json.loads(resp.read().decode())
            assert len(stations) == 15
            print(f"[PASS] GET /api/stations returned {len(stations)} stations")

        # 3. Test GET /api/stations/{id}
        with urllib.request.urlopen(f"{base_url}/api/stations/IMD-RJ-04") as resp:
            assert resp.status == 200
            st = json.loads(resp.read().decode())
            assert st["name"] == "Jaisalmer"
            print(f"[PASS] GET /api/stations/IMD-RJ-04 returned: {st['name']} ({st['zone']})")

        # 4. Test GET /api/stations/{id}/readings
        with urllib.request.urlopen(f"{base_url}/api/stations/IMD-RJ-04/readings?limit=10") as resp:
            assert resp.status == 200
            readings = json.loads(resp.read().decode())
            assert len(readings) > 0
            print(f"[PASS] GET /api/stations/IMD-RJ-04/readings returned {len(readings)} time-series records")

        # 5. Test GET /api/stations/{id}/neighbors
        with urllib.request.urlopen(f"{base_url}/api/stations/IMD-RJ-04/neighbors?parameter=temperature") as resp:
            assert resp.status == 200
            neigh = json.loads(resp.read().decode())
            assert len(neigh["neighbors"]) == 3
            print(f"[PASS] GET /api/stations/IMD-RJ-04/neighbors returned 3 nearest neighbors ({neigh['spatial_agreement']*100:.0f}% agreement)")

        # 6. Test GET /api/metrics
        with urllib.request.urlopen(f"{base_url}/api/metrics") as resp:
            assert resp.status == 200
            metrics = json.loads(resp.read().decode())
            assert "network_health_pct" in metrics
            print(f"[PASS] GET /api/metrics returned Network Health: {metrics['network_health_pct']}%")

        # 7. Test GET /api/trust-score/{id}
        with urllib.request.urlopen(f"{base_url}/api/trust-score/IMD-RJ-04") as resp:
            assert resp.status == 200
            trust = json.loads(resp.read().decode())
            assert "overall_trust_score" in trust
            print(f"[PASS] GET /api/trust-score/IMD-RJ-04 returned Trust: {trust['overall_trust_score']*100:.0f}% ({trust['reliability_grade']})")

        # 8. Test POST /api/simulator/inject (Stuck sensor)
        req_data = json.dumps({"scenario": "STUCK_SENSOR", "station_id": "IMD-RJ-04"}).encode()
        req = urllib.request.Request(
            f"{base_url}/api/simulator/inject",
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            sim_res = json.loads(resp.read().decode())
            assert sim_res["status"] == "SUCCESS"
            print(f"[PASS] POST /api/simulator/inject successfully dispatched: {sim_res['scenario']}")

        # 9. Test POST /api/simulator/reset
        reset_req = urllib.request.Request(f"{base_url}/api/simulator/reset", data=b"{}", headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(reset_req) as resp:
            assert resp.status == 200
            print("[PASS] POST /api/simulator/reset successfully restored baseline")

        # 10. Test static frontend serving (GET /)
        with urllib.request.urlopen(f"{base_url}/") as resp:
            assert resp.status == 200
            html = resp.read().decode()
            assert "SkyGuard AI " in html
            print("[PASS] GET / serves built React Single Page Application bundle")

        print("\n>>> ALL 10 REST API AND STATIC ASSET ENDPOINTS VERIFIED AND PASSING! <<<")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    test_api()
