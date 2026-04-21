# Windows Development Notes

## Quick Setup (First Time)

```powershell
# Run setup script
.\setup-windows.bat
```

**Script akan:**
1. Create `.env` file dari `.env.example`
2. Open Notepad untuk edit `.env`
3. Start MongoDB & Redis via Docker
4. Install semua npm dependencies

**IMPORTANT:** Tambahkan `OPENAI_API_KEY` di file `.env`:
```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Get API key dari: https://platform.openai.com/api-keys

---

## Manual Setup

### 1. Create .env File

```powershell
# Copy example file
Copy-Item .env.example .env

# Edit dengan notepad
notepad .env
```

**Tambahkan OPENAI_API_KEY:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### 2. Start Infrastructure

```powershell
docker-compose up -d mongo redis
```

### 3. Install Dependencies

```powershell
# Backend
cd backend
npm install

# Worker
cd ..\worker
npm install
npm install ytdl-core

# Frontend
cd ..\frontend
npm install
```

---

## Known Issues & Solutions

### 1. Next.js EPERM Error (.next/trace)

**Error:**
```
[Error: EPERM: operation not permitted, open 'D:\Project VeridFace\AI Clipper\frontend\.next\trace']
```

**Cause:** Windows file permission issue with Next.js trace file.

**Solutions:**

**Option A: Ignore (Safe)**
- Error dapat diabaikan, aplikasi tetap jalan normal
- Frontend masih accessible di http://localhost:3000 atau 3001

**Option B: Delete .next folder**
```powershell
# Di PowerShell
cd "D:\Project VeridFace\AI Clipper\frontend"
Remove-Item -Recurse -Force .next
npm run dev
```

**Option C: Run as Administrator**
```powershell
# Buka PowerShell as Administrator, lalu:
cd "D:\Project VeridFace\AI Clipper\frontend"
npm run dev
```

**Option D: Disable trace (Recommended)**

Create `next.config.js` di frontend folder:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    disableOptimizedLoading: true
  }
}

module.exports = nextConfig
```

### 2. Port Already in Use

**Error:**
```
⚠ Port 3000 is in use, trying 3001 instead.
```

**Solution:** Next.js otomatis pindah ke port 3001. Atau stop service di port 3000:
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### 3. Worker/Backend Crashes

**Jika worker atau backend crash setelah fix:**
```powershell
# Restart terminal dan coba lagi
cd "D:\Project VeridFace\AI Clipper\backend"
npm run dev

cd "D:\Project VeridFace\AI Clipper\worker"
npm run dev
```

## Development Workflow (Windows)

### Terminal Setup

**Terminal 1 - MongoDB & Redis (Docker):**
```powershell
docker-compose up mongo redis
```

**Terminal 2 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 3 - Worker:**
```powershell
cd worker
npm run dev
```

**Terminal 4 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Quick Start (All Services)

```powershell
# Start infrastructure
docker-compose up -d mongo redis

# Start all Node services (in separate terminals)
# Or use PM2:
npm install -g pm2
pm2 start ecosystem.config.js
```

### Environment Variables

Windows menggunakan file `.env` sama seperti Linux.

**Load .env di PowerShell:**
```powershell
# Option 1: Use dotenv-cli
npm install -g dotenv-cli
dotenv npm run dev

# Option 2: Set manually
$env:MONGODB_URI="mongodb://localhost:27017/clipper"
$env:REDIS_URL="redis://localhost:6379"
npm run dev
```

## VS Code Tips

### Recommended Extensions

- ESLint
- Prettier
- Docker
- MongoDB for VS Code
- Redis Client

### Debug Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.js",
      "envFile": "${workspaceFolder}/.env"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Worker",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/worker/src/index.js",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

## Performance Notes

- Windows file I/O lebih lambat dari Linux
- Docker Desktop on Windows consume banyak memory
- Recommendation: Minimum 16GB RAM untuk development
- Use WSL2 untuk better performance (optional)

## Troubleshooting

### MongoDB Connection Failed

```powershell
# Check Docker container
docker ps | findstr mongo

# Restart MongoDB
docker restart clipper-mongo
```

### Redis Connection Failed

```powershell
# Check Docker container
docker ps | findstr redis

# Restart Redis
docker restart clipper-redis
```

### Node Modules Issues

```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

**Status:** All development features work on Windows dengan minor adjustments
**Recommended:** Use WSL2 untuk production-like environment
