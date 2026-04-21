# Quick Start Guide - Phase 1 Features

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Root dependencies (if not done)
npm install

# Backend
cd backend
npm install

# Worker
cd ../worker
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Update these critical variables in .env:
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
OPENAI_API_KEY=your-openai-key
```

### 3. Start Services
```bash
# Using Docker (recommended)
docker-compose up -d

# Or start manually:
# Terminal 1 - MongoDB & Redis
docker-compose up mongo redis

# Terminal 2 - Backend
cd backend && npm run dev

# Terminal 3 - Worker
cd worker && npm start

# Terminal 4 - Frontend
cd frontend && npm run dev
```

### 4. Create Admin User
```bash
# Method 1: Via MongoDB shell
docker exec -it clipper-mongo mongosh

use clipper_db

db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)

# Method 2: Register normally, then update in database
```

## 🎯 Feature Overview

### WebSocket Real-Time Updates
**What it does:** Live job progress without page refresh

**Try it:**
1. Open browser DevTools Console
2. Create a job from dashboard
3. Watch console logs: `WebSocket connected`, `job.progress`, `clip.rendered`
4. See progress bar update in real-time
5. Get toast notifications when clips complete

**Technical:**
- Frontend connects to `ws://localhost:5000`
- JWT authentication on connection
- Events: `job:progress`, `job:completed`, `job:failed`, `clip:rendered`

### Admin Dashboard
**What it does:** Manage users, jobs, and view system stats

**Access:**
1. Login with admin account
2. Navigate to `http://localhost:3000/admin`
3. See overview with stats
4. Switch tabs: Overview, Users, Jobs

**Features:**
- **Overview Tab:** System stats, recent activity
- **Users Tab:** Manage user status (active/suspended/banned)
- **Jobs Tab:** Monitor jobs, retry failed ones

### Refresh Tokens
**What it does:** Secure, long-lived sessions

**How it works:**
- Access token expires after 1 hour
- Refresh token lasts 7 days
- Frontend auto-refreshes access token
- No manual re-login needed for 7 days

**Testing:**
1. Login and note token expiry
2. Wait 1+ hour (or manually expire in JWT debugger)
3. Make API request
4. Frontend automatically refreshes token

### Role-Based Access Control
**What it does:** Admin-only features

**Roles:**
- `user` - Standard user (default)
- `admin` - Full system access

**Protected Routes:**
- All `/api/admin/*` endpoints require admin role
- `/admin` page checks role on frontend

## 📡 WebSocket Events Reference

### Frontend Listens For:
```javascript
socket.on('job:progress', (data) => {
  // data: { jobId, status, progress, message }
});

socket.on('job:completed', (data) => {
  // data: { jobId, clipsCount }
});

socket.on('job:failed', (data) => {
  // data: { jobId, error }
});

socket.on('clip:rendered', (data) => {
  // data: { jobId, clipId, clipIndex, totalClips }
});
```

### Using in Components:
```javascript
import { useWebSocket } from '@/hooks/useWebSocket';
import { useJobProgress } from '@/hooks/useJobProgress';

function MyComponent({ jobId }) {
  const { progress, status, message } = useJobProgress(jobId);
  
  return <div>Progress: {progress}%</div>;
}
```

## 🛡️ Admin API Endpoints

### Users
```bash
# List users
GET /api/admin/users?page=1&limit=20&search=john&status=active

# Get user details
GET /api/admin/users/:userId

# Update user
PATCH /api/admin/users/:userId
Body: { plan: "pro", credits: 100, status: "active", role: "admin" }

# Delete user
DELETE /api/admin/users/:userId
```

### Jobs
```bash
# List jobs
GET /api/admin/jobs?page=1&limit=20&status=failed

# Get job details
GET /api/admin/jobs/:jobId

# Retry failed job
POST /api/admin/jobs/:jobId/retry

# Delete job
DELETE /api/admin/jobs/:jobId
```

### Stats
```bash
# System stats
GET /api/admin/stats

# Usage analytics
GET /api/admin/stats/usage?days=30

# Failed jobs
GET /api/admin/failed-jobs?page=1&limit=20
```

## 🔧 Configuration

### Environment Variables
```env
# JWT - Updated for Phase 1
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1h              # New: shorter access token
JWT_REFRESH_SECRET=separate-secret  # New: refresh token secret
JWT_REFRESH_EXPIRES_IN=7d      # New: refresh token expiry

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:5000  # For WebSocket connection
```

### Frontend API Client
```javascript
// Refresh token automatically handled
import api from '@/lib/api';

// All requests auto-refresh token if expired
const response = await api.get('/api/jobs');
```

## 🐛 Troubleshooting

### WebSocket Not Connecting
```bash
# Check backend logs
docker logs clipper-api -f

# Verify token in localStorage
localStorage.getItem('token')

# Check browser console for errors
```

### Admin Page Access Denied
```bash
# Verify user role in database
docker exec -it clipper-mongo mongosh
use clipper_db
db.users.findOne({ email: "your-email" })

# Update role to admin
db.users.updateOne(
  { email: "your-email" },
  { $set: { role: "admin" } }
)
```

### Token Refresh Not Working
```bash
# Check environment variables
cat .env | grep JWT

# Verify refreshToken in user document
db.users.findOne({ email: "your-email" }, { refreshToken: 1 })

# Clear localStorage and re-login
localStorage.clear()
```

## 📊 Monitoring

### Backend Logs
```bash
# Docker
docker logs clipper-api -f
docker logs clipper-worker -f

# Manual
# Check terminal where backend/worker is running
```

### WebSocket Status
```javascript
// In browser console
const socket = io('http://localhost:5000', {
  auth: { token: localStorage.getItem('token') }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

### Database Inspection
```bash
# Users
db.users.find({}, { name: 1, email: 1, role: 1, plan: 1, credits: 1 })

# Jobs
db.jobs.find({ status: "failed" }).limit(5)

# WebSocket events (if logged)
db.usage_logs.find().sort({ createdAt: -1 }).limit(10)
```

## 🧪 Testing Checklist

- [ ] Create job and verify WebSocket updates in console
- [ ] Check job progress bar updates without page refresh
- [ ] See toast notification when job completes
- [ ] Access admin dashboard with admin account
- [ ] View system stats on admin overview
- [ ] Update user status from admin panel
- [ ] Retry a failed job from admin panel
- [ ] Login and wait 1+ hour to test token refresh
- [ ] Try accessing /admin as non-admin (should redirect)

## 📞 Support

**Issues:**
- Check `PHASE1_IMPLEMENTATION.md` for detailed docs
- Review `ASSESSMENT.md` for architecture context
- See `API_DOCS.md` for endpoint reference

**Logs:**
- Backend: Check terminal or Docker logs
- Frontend: Browser DevTools Console
- Worker: Worker terminal or Docker logs

## 🎉 Success Indicators

You'll know Phase 1 is working when:
1. ✅ Job progress updates appear instantly (no page refresh)
2. ✅ Admin dashboard shows live stats
3. ✅ Sessions last 7 days without re-login
4. ✅ Non-admin users can't access /admin
5. ✅ Failed jobs can be retried from admin panel
6. ✅ Toast notifications appear for job events

**You're now running a production-ready AI Clipper SaaS! 🚀**
