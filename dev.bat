@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "BACKEND_DIR=%REPO_ROOT%Backend"
set "FRONTEND_DIR=%REPO_ROOT%Frontend\app"
set "PYTHON_EXE=C:\Users\rizal\AppData\Local\Python\pythoncore-3.11-64\python.exe"

echo ============================================================
echo  Kalau service BalloonBackend / BalloonFrontend lagi jalan,
echo  port 8000 / 3000 bakal bentrok dengan dev server ini.
echo  Stop dulu kalau perlu (PowerShell as Administrator):
echo    Stop-Service BalloonBackend, BalloonFrontend
echo ============================================================
echo.

start "Backend (uvicorn --reload)" cmd /k "cd /d "%BACKEND_DIR%" && "%PYTHON_EXE%" -m uvicorn main:app --reload --port 8000"
start "Frontend (next dev)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

endlocal
