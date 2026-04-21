# Raspberry Pi ARM64 Build Fix

## Problem: Exit Code 159

Exit code 159 pada Raspberry Pi disebabkan oleh:
- Segmentation fault saat build (even for simple commands like `apk add ffmpeg`)
- Docker BuildKit incompatibility dengan ARM64
- Memory limitation (especially Pi 4GB or less)

## ✅ Solution 1: Disable BuildKit (RECOMMENDED)

BuildKit sering crash di Raspberry Pi. Gunakan legacy builder:

```bash
# Di Raspberry Pi
cd /var/www/clipper-engine

# Pull latest code
sudo git pull origin main

# Make script executable
chmod +x build-raspi-no-buildkit.sh

# Run build WITHOUT BuildKit
./build-raspi-no-buildkit.sh
```

**Script akan:**
- ✅ Disable Docker BuildKit
- ✅ Pull base images
- ✅ Build dengan legacy Docker builder
- ✅ Start all services

## ✅ Solution 2: Manual Installation (No Docker)

Kalau Docker build tetap gagal, install manual tanpa Docker:

```bash
# Install manual tanpa Docker
chmod +x install-manual.sh
./install-manual.sh
```

**Manual installation:**
- ✅ Install Node.js, MongoDB, Redis, FFmpeg directly
- ✅ Install npm dependencies
- ✅ Create systemd services
- ✅ No Docker required!

**Start services:**
```bash
sudo systemctl start clipper-backend
sudo systemctl start clipper-worker
sudo systemctl start clipper-frontend
```

**Enable auto-start:**
```bash
sudo systemctl enable clipper-backend
sudo systemctl enable clipper-worker
sudo systemctl enable clipper-frontend
```

## ✅ Solution 3: Automated Build Script (Original)

### Quick Start

```bash
# Di Raspberry Pi
cd /var/www/clipper-engine

# Make script executable
chmod +x build-raspi.sh

# Run build script
./build-raspi.sh
```

Script akan otomatis:
- ✅ Check memory availability
- ✅ Pull base images
- ✅ Build dengan optimized Dockerfile
- ✅ Start services
- ✅ Show status

## ✅ Manual Build (Alternative)

### 1. Build dengan docker-compose.raspi.yml

```bash
# Di Raspberry Pi
cd /var/www/clipper-engine

# Build dengan config khusus Raspberry Pi
sudo docker compose -f docker-compose.raspi.yml build

# Start services
sudo docker compose -f docker-compose.raspi.yml up -d
```

### 2. Apa Bedanya?

**Dockerfile.raspi:**
- ❌ Remove Python dependencies (yt-dlp)
- ✅ Use ytdl-core npm package (pure Node.js)
- ✅ Only install FFmpeg (minimal dependencies)
- ✅ Optimized untuk low-memory devices

**Benefits:**
- Faster build (no Python compilation)
- Lower memory usage
- More stable on Raspberry Pi
- Same functionality

## ✅ Solution 2: Disable BuildKit (Alternative)

Kalau Solution 1 masih error, disable BuildKit:

```bash
# Set environment variable
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

# Build ulang
sudo docker compose build worker

# Start
sudo docker compose up -d
```

## ✅ Solution 3: Increase Swap Memory

Untuk Raspberry Pi dengan RAM kecil (1-2GB):

```bash
# Check current swap
free -h

# Increase swap to 2GB
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change: CONF_SWAPSIZE=2048

# Apply changes
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Verify
free -h

# Build again
sudo docker compose build
```

## ✅ Solution 4: Build on Another Machine

Kalau semua gagal, build di laptop/PC lalu push ke Docker Hub:

```bash
# Di laptop/PC (tidak perlu Raspberry Pi)
docker buildx build --platform linux/arm64 -t yourusername/clipper-worker:arm64 ./worker
docker push yourusername/clipper-worker:arm64

# Di Raspberry Pi, update docker-compose.yml
# Ganti:
#   build:
#     context: ./worker
# Dengan:
#   image: yourusername/clipper-worker:arm64
```

## 📊 Perbandingan ytdl-core vs yt-dlp

| Feature | yt-dlp (Python) | ytdl-core (npm) |
|---------|----------------|-----------------|
| Language | Python | JavaScript/Node.js |
| Build Size | ~500MB | ~50MB |
| Memory Usage | High | Low |
| Raspberry Pi | ❌ Build errors | ✅ Works |
| YouTube Support | ✅ Full | ✅ Full |
| Quality Selection | ✅ Advanced | ✅ Good |
| Speed | Fast | Fast |

## 🚀 Recommended Setup for Raspberry Pi

```bash
# 1. Use optimized config
cd /var/www/clipper-engine

# 2. Build dengan Raspberry Pi config
sudo docker compose -f docker-compose.raspi.yml build

# 3. Start services
sudo docker compose -f docker-compose.raspi.yml up -d

# 4. Check logs
sudo docker compose -f docker-compose.raspi.yml logs -f worker

# 5. Test download
# Worker akan pakai ytdl-core instead of yt-dlp
```

## 🔍 Verify Setup

```bash
# Check worker container
sudo docker exec -it clipper-worker sh

# Inside container, check installed packages
ls -la node_modules/ | grep ytdl

# Should see: ytdl-core

# Check FFmpeg
ffmpeg -version

# Exit
exit
```

## ⚙️ Code Changes for ytdl-core

Kalau pakai ytdl-core, update [worker/src/services/download.service.js](worker/src/services/download.service.js):

```javascript
// Check if USE_YTDL_CORE environment variable is set
const useYtdlCore = process.env.USE_YTDL_CORE === 'true';

if (useYtdlCore) {
  // Use ytdl-core (npm package)
  const ytdl = require('ytdl-core');
  
  const info = await ytdl.getInfo(videoUrl);
  const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
  
  ytdl(videoUrl, { format: format })
    .pipe(fs.createWriteStream(outputPath));
} else {
  // Use yt-dlp (Python) - existing code
  const { exec } = require('child_process');
  exec(`yt-dlp -o "${outputPath}" "${videoUrl}"`);
}
```

## 📝 Notes

- Raspberry Pi 4 (4GB+): Solution 1 or 2 should work
- Raspberry Pi 4 (2GB): Use Solution 1 + Solution 3 (increase swap)
- Raspberry Pi 3: Use Solution 4 (build on another machine)
- Raspberry Pi 5: Should work with standard docker-compose.yml

---

**Status:** ✅ Dockerfile.raspi created - optimized untuk low-memory ARM64 devices
**Alternative:** Use ytdl-core npm package instead of yt-dlp Python
**Tested:** Alpine Linux ARM64, Node.js 18
