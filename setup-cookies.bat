@echo off
echo ============================================================
echo  YouTube Cookies Setup for clipper-engine
echo ============================================================
echo.
echo STEP 1 - Export cookies from your browser:
echo   Option A (Recommended): Use the "Get cookies.txt LOCALLY" Chrome extension
echo     https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
echo     1. Open YouTube in Chrome while logged in
echo     2. Click the extension icon
echo     3. Click "Export" - save as cookies.txt anywhere
echo.
echo   Option B: Use yt-dlp directly on your HOST machine (not Docker):
echo     yt-dlp --cookies-from-browser chrome --cookies cookies.txt --skip-download "https://youtube.com"
echo.
echo STEP 2 - Copy the cookies file into the worker storage volume:
echo   (Run this after you have cookies.txt ready)
echo.
set /p COOKIES_PATH="Enter full path to your cookies.txt file: "

if not exist "%COOKIES_PATH%" (
  echo ERROR: File not found: %COOKIES_PATH%
  pause
  exit /b 1
)

echo.
echo Copying cookies into Docker volume via clipper-worker container...
docker cp "%COOKIES_PATH%" clipper-worker:/app/storage/youtube-cookies.txt

if %ERRORLEVEL% == 0 (
  echo.
  echo [OK] Cookies installed at /app/storage/youtube-cookies.txt
  echo      The worker will use them automatically on next job.
  echo.
  echo TIP: Refresh cookies monthly or when downloads start failing again.
) else (
  echo.
  echo ERROR: docker cp failed. Make sure clipper-worker container is running.
  echo Run: docker-compose up -d worker
)

pause
