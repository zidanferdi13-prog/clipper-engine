@echo off
REM Stop all AI Clipper services

echo Stopping AI Clipper services...
docker-compose down

echo.
echo Services stopped.
echo.
pause
