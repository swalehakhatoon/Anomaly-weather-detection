@echo off
echo =======================================================
echo Starting VayuDrishti AI (वायु-दृष्टि) FastAPI Backend
echo Port: 8000 | http://127.0.0.1:8000
echo =======================================================
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
