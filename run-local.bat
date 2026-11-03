@echo off
rem Starts the whole app on this computer with throw-away demo data (SQLite). Double-click this file.
rem Needs Python installed. Run "python -m pip install -r backend\requirements.txt" once first.
rem These are local-only values. Real deployments use the host's settings instead.
set SECRET_KEY=dev-secret
set JWT_SECRET_KEY=dev-jwt-secret-that-is-at-least-32-chars
set DATABASE_URL=sqlite:///local.db
set CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500

cd /d "%~dp0backend"
python database/seed.py --create-tables
start "API (port 5000) - close this window to stop" cmd /k python -m flask --app app run

cd /d "%~dp0frontend"
start "Website (port 5500) - close this window to stop" cmd /k python -m http.server 5500

timeout /t 4 >nul
start http://127.0.0.1:5500
