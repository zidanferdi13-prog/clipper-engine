# Docker ARM64 Build Instructions

## For ARM64 Linux (Apple Silicon, ARM Servers)

### Prerequisites
```bash
# Enable Docker Buildx (multi-platform builds)
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap
```

### Build for ARM64
```bash
# Build all services for ARM64
docker compose build --platform linux/arm64

# Or build individual services
docker buildx build --platform linux/arm64 -t clipper-api ./backend
docker buildx build --platform linux/arm64 -t clipper-worker ./worker
docker buildx build --platform linux/arm64 -t clipper-frontend ./frontend
```

### Start Services
```bash
# Start all services
docker compose up -d

# Or start specific service
docker compose up -d mongo redis
docker compose up -d api worker frontend
```

### Verify ARM64 Build
```bash
# Check running containers
docker compose ps

# Verify architecture
docker inspect clipper-api | grep Architecture
docker inspect clipper-worker | grep Architecture
docker inspect clipper-frontend | grep Architecture

# Should output: "Architecture": "arm64"
```

### Troubleshooting ARM64 Issues

#### Issue: FFmpeg not found in worker
**Solution:**
```bash
# Enter worker container
docker exec -it clipper-worker sh

# Verify FFmpeg
ffmpeg -version

# If missing, install manually
apk add --no-cache ffmpeg
```

#### Issue: yt-dlp fails to install
**Solution:**
Worker Dockerfile now includes build tools (gcc, g++, musl-dev) needed for ARM64.

#### Issue: Platform mismatch warning
**Solution:**
```bash
# Rebuild with explicit platform
docker compose build --no-cache --platform linux/arm64
```

#### Issue: OpenAI Whisper not working
**Note:** OpenAI Whisper removed from Dockerfile because:
- Heavy dependencies (PyTorch, etc.)
- Better to use OpenAI Whisper API instead
- Worker uses OpenAI API for transcription

### Alternative: Use Whisper API (Recommended)
Instead of local Whisper installation, use OpenAI API:
```javascript
// In transcribe.service.js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const transcription = await openai.audio.transcriptions.create({
  file: audioStream,
  model: "whisper-1"
});
```

### Performance Notes

**ARM64 vs x86_64:**
- MongoDB: ✅ Native ARM64 support, same performance
- Redis: ✅ Native ARM64 support, excellent performance
- Node.js: ✅ Native ARM64 support, may be faster
- FFmpeg: ✅ ARM64 builds available, good performance
- Alpine Linux: ✅ Full ARM64 support

**Expected Build Times:**
- Backend: ~1-2 minutes
- Frontend: ~2-3 minutes
- Worker: ~3-5 minutes (FFmpeg installation)

### Multi-Architecture Build (Optional)

To build for both ARM64 and AMD64:
```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t clipper-api ./backend
docker buildx build --platform linux/amd64,linux/arm64 -t clipper-worker ./worker
docker buildx build --platform linux/amd64,linux/arm64 -t clipper-frontend ./frontend
```

### Development on ARM64

**Recommended Setup:**
1. Use native ARM64 MongoDB & Redis (fast)
2. Build Node services for ARM64
3. Use OpenAI API instead of local Whisper
4. FFmpeg from Alpine repositories works well

**Quick Start:**
```bash
# One-command start
docker compose up -d

# Check logs
docker compose logs -f

# Stop all
docker compose down
```

### Production Deployment on ARM64

**Cloud Providers with ARM64:**
- AWS EC2 (Graviton instances)
- Google Cloud (Tau T2A instances)
- Azure (Ampere Altra instances)
- Oracle Cloud (Ampere A1 instances)
- DigitalOcean (Premium AMD/ARM droplets)

**Benefits of ARM64 in Production:**
- Lower cost (especially AWS Graviton)
- Better power efficiency
- Good performance for Node.js workloads

---

**Status:** ✅ All Dockerfiles now ARM64-compatible
**Tested:** Alpine Linux ARM64 builds
**Recommendation:** Use OpenAI Whisper API instead of local installation
