@echo off
REM AI Clipper - Docker Quick Start for Windows
REM This script builds and runs all services using Docker

echo ========================================
echo   AI Clipper - Docker Deployment
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if .env exists
if not exist .env (
    echo [!] .env file not found
    echo.
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ========================================
    echo   IMPORTANT: Configure Environment
    echo ========================================
    echo.
    echo Please edit .env file and add:
    echo   - OPENAI_API_KEY
    echo.
    echo Get your API key from:
    echo   https://platform.openai.com/api-keys
    echo.
    pause
    notepad .env
    echo.
)

REM Check if OPENAI_API_KEY is set
findstr /C:"OPENAI_API_KEY=sk-" .env >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] OPENAI_API_KEY not configured in .env
    echo.
    echo The application will not work without a valid OpenAI API key.
    echo.
    choice /C YN /M "Do you want to edit .env now?"
    if %errorlevel%==1 (
        notepad .env
    )
    echo.
)

echo ========================================
echo   Building Docker Images
echo ========================================
echo.
echo This may take 5-10 minutes on first run...
echo.

docker-compose build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker build failed!
    echo.
    echo Common issues:
    echo   - Internet connection problem
    echo   - Insufficient disk space
    echo   - Docker Desktop memory too low (increase to 4GB+)
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Build completed successfully!
echo.

echo ========================================
echo   Starting Services
echo ========================================
echo.

docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start services!
    echo.
    pause
    exit /b 1
)

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Services are now running:
echo.

docker-compose ps

echo.
echo ========================================
echo   Access URLs
echo ========================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000
echo.
echo ========================================
echo   Useful Commands
echo ========================================
echo.
echo View logs:
echo   docker-compose logs -f
echo.
echo Stop services:
echo   docker-compose down
echo.
echo Restart service:
echo   docker-compose restart [api^|worker^|frontend]
echo.
echo Rebuild after code changes:
echo   docker-compose build
echo   docker-compose up -d
echo.
echo ========================================
echo.
pause
