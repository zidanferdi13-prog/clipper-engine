@echo off
REM Quick Setup Script for Windows Development

echo ====================================
echo AI Clipper - Windows Quick Setup
echo ====================================
echo.

REM Check if .env exists
if exist .env (
    echo [OK] .env file already exists
) else (
    echo [!] Creating .env file from .env.example...
    copy .env.example .env
    echo [IMPORTANT] Edit .env file and add your OPENAI_API_KEY
    echo             Get it from: https://platform.openai.com/api-keys
    echo.
    pause
    notepad .env
)

echo.
echo Checking dependencies...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
) else (
    echo [OK] Node.js installed
)

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker not found. Install Docker Desktop for Windows
    echo     Download: https://www.docker.com/products/docker-desktop
) else (
    echo [OK] Docker installed
)

echo.
echo Starting MongoDB and Redis...
docker-compose up -d mongo redis
if %errorlevel% neq 0 (
    echo [!] Failed to start Docker services
    echo     Make sure Docker Desktop is running
    pause
    exit /b 1
)

echo.
echo [OK] MongoDB and Redis started
echo.
echo Installing dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install worker dependencies  
echo Installing worker dependencies...
cd worker
call npm install
call npm install ytdl-core
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo To start development:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 - Worker:
echo   cd worker
echo   npm run dev
echo.
echo Terminal 3 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo IMPORTANT: Make sure you've added OPENAI_API_KEY to .env file!
echo.
pause
