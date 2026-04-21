@echo off
REM View logs for AI Clipper services

echo AI Clipper - Service Logs
echo ========================================
echo.
echo Press Ctrl+C to stop viewing logs
echo.

docker-compose logs -f
