@echo off
cd /d "%~dp0"
echo ====================================
echo  Starting AWMS Application...
echo ====================================
start "" http://localhost:5173
npm run dev
pause
