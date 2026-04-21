# Quick Start untuk ARM64 Linux

## Build & Run

### For Raspberry Pi (Exit Code 159 Fix)

```bash
# Use optimized config untuk Raspberry Pi
sudo docker compose -f docker-compose.raspi.yml build
sudo docker compose -f docker-compose.raspi.yml up -d

# Check status
sudo docker compose -f docker-compose.raspi.yml ps

# View logs
sudo docker compose -f docker-compose.raspi.yml logs -f
```

### For Other ARM64 Linux (Server/VM)

```bash
# 1. Build untuk ARM64
docker compose build --platform linux/arm64

# 2. Start services
docker compose up -d

# 3. Check status
docker compose ps

# 4. View logs
docker compose logs -f
```

## Verify ARM64

```bash
# Check architecture
docker inspect clipper-api | grep Architecture
docker inspect clipper-worker | grep Architecture

# Should show: "Architecture": "arm64"
```

## Troubleshooting

**Issue: Platform mismatch**
```bash
docker compose build --no-cache --platform linux/arm64
```

**Issue: FFmpeg not found**
```bash
docker exec -it clipper-worker ffmpeg -version
```

**Lihat:** DOCKER_ARM64.md untuk detail lengkap
