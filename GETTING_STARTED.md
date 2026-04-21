# AI Clipper - Getting Started

## 🚀 Quick Start Guide

### Prerequisites

Pastikan sudah terinstall:
- Node.js v18+
- Docker & Docker Compose
- OpenAI API Key

### 1. Clone & Setup

```bash
git clone <repository-url>
cd ai-clipper
```

### 2. Environment Setup

Copy environment file dan isi dengan data yang sesuai:

```bash
cp .env.example .env
```

Edit `.env` dan isi:
- `OPENAI_API_KEY` - API key dari OpenAI
- `JWT_SECRET` - Random string untuk JWT (gunakan: `openssl rand -base64 32`)

### 3. Start dengan Docker

**Development Mode:**
```bash
docker-compose up -d
```

Tunggu sampai semua container running:
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- Backend API: `localhost:5000`
- Frontend: `localhost:3000`
- Worker: (background process)

### 4. Akses Aplikasi

Buka browser: **http://localhost:3000**

## 📁 Structure Overview

```
ai-clipper/
├── backend/        # Express API Server
├── worker/         # Background Workers
├── frontend/       # Next.js Dashboard
└── storage/        # File Storage (auto-created)
```

## 🔧 Development Mode

### Backend API
```bash
cd backend
npm install
npm run dev
```

### Worker
```bash
cd worker
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing API

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Create Job
```bash
curl -X POST http://localhost:5000/api/jobs/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "sourceUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "settings": {
      "clips": 5,
      "subtitleStyle": "tiktok",
      "aspectRatio": "9:16"
    }
  }'
```

### 3. Check Job Status
```bash
curl http://localhost:5000/api/jobs/<job-id> \
  -H "Authorization: Bearer <your-token>"
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Stop semua container
docker-compose down

# Atau ubah port di docker-compose.yml
```

### MongoDB Connection Failed
```bash
# Cek MongoDB status
docker-compose logs mongo

# Restart MongoDB
docker-compose restart mongo
```

### Worker Tidak Jalan
```bash
# Lihat logs
docker-compose logs worker

# Restart worker
docker-compose restart worker
```

### FFmpeg Error
Worker container sudah include FFmpeg. Jika error, cek:
```bash
docker-compose exec worker ffmpeg -version
```

## 📊 Monitoring

### Logs
```bash
# Semua services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Database
```bash
# Connect ke MongoDB
docker-compose exec mongo mongosh -u admin -p clipper_secret_2024

# View databases
show dbs
use clipper
show collections
```

### Redis Queue
```bash
# Connect ke Redis
docker-compose exec redis redis-cli

# Check queues
KEYS *
LLEN download
```

## 🚀 Production Deployment

### 1. Build Images
```bash
docker-compose build
```

### 2. Update Environment
Edit `.env` untuk production:
- Set `NODE_ENV=production`
- Update `MONGODB_URI` dengan production DB
- Update `JWT_SECRET` dengan secret yang aman
- Configure S3/R2 untuk storage

### 3. Deploy
```bash
docker-compose -f docker-compose.yml up -d
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Jobs
- `POST /api/jobs/create` - Create clip job
- `GET /api/jobs/my-jobs` - List jobs
- `GET /api/jobs/:id` - Get job detail
- `DELETE /api/jobs/:id` - Delete job

### Clips
- `GET /api/clips/:id` - Get clip detail
- `GET /api/clips/by-job/:jobId` - Get clips by job

### Usage
- `GET /api/usage/me` - Get usage stats
- `GET /api/usage/stats` - Get detailed stats

## 🔑 Credits System

- Free plan: 10 credits
- 1 credit = 1 job
- Upgrade untuk unlimited

## 💡 Tips

1. **Optimize Video URLs**: Use direct YouTube/TikTok URLs
2. **Monitor Credits**: Check remaining credits before creating jobs
3. **Queue Management**: Worker processes jobs sequentially
4. **Storage**: Clean up old files periodically

## 🆘 Support

Issues? Check:
1. Docker logs: `docker-compose logs`
2. Backend logs: `backend/logs/`
3. Environment variables: `.env`

## 📚 Next Steps

- [ ] Setup payment gateway
- [ ] Configure CDN
- [ ] Add email notifications
- [ ] Setup monitoring (Grafana)
- [ ] Configure auto-scaling

Happy clipping! 🎬
