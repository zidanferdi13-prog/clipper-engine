# 🎬 AI Clipper SaaS

AI-powered video clipper yang otomatis memotong video panjang jadi short-form viral clips dengan subtitle AI.

## 🚀 Quick Start (Docker)

### 1. Prerequisites
- Docker Desktop for Windows
- OpenAI API Key ([Get here](https://platform.openai.com/api-keys))

### 2. Setup

```bash
# Clone repository
git clone https://github.com/zidanferdi13-prog/clipper-engine.git
cd clipper-engine

# Copy .env and add your OPENAI_API_KEY
copy .env.example .env
notepad .env

# Build and run
docker-compose build
docker-compose up -d
```

### 3. Access

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

**See [DOCKER.md](DOCKER.md) for detailed Docker guide**

---

## 🏗️ Arsitektur

```
├── Backend API (Express.js)
│   ├── Authentication & Authorization
│   ├── Job Management
│   ├── Billing & Credits
│   └── API Routes
│
├── Worker Services
│   ├── Downloader (yt-dlp)
│   ├── Transcriber (Whisper AI)
│   ├── AI Analyzer (GPT-4)
│   └── Renderer (FFmpeg)
│
├── Frontend (Next.js)
│   ├── User Dashboard
│   └── Admin Panel
│
└── Infrastructure
    ├── MongoDB (Database)
    ├── Redis (Queue)
    └── Object Storage (Local/S3)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- OpenAI API Key

### Installation

1. Clone repository
```bash
git clone <repo-url>
cd ai-clipper
```

2. Setup environment
```bash
cp .env.example .env
# Edit .env dan isi OPENAI_API_KEY
```

3. Start dengan Docker
```bash
docker-compose up -d
```

4. Akses aplikasi
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

### Development Mode

```bash
# Backend
cd backend
npm install
npm run dev

# Worker
cd worker
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
ai-clipper/
├── backend/          # Express API
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middlewares/
│   │   ├── queues/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
│
├── worker/           # Background Workers
│   ├── src/
│   │   ├── workers/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/         # Next.js App
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   ├── Dockerfile
│   └── package.json
│
├── storage/          # Local file storage
│   ├── raw/
│   ├── audio/
│   ├── clips/
│   └── thumbnails/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔄 Workflow

1. **User Submit URL** → Backend create job
2. **Download Worker** → Download video dengan yt-dlp
3. **Transcriber Worker** → Extract audio + speech-to-text
4. **AI Analyzer Worker** → Cari segment terbaik dengan GPT-4
5. **Renderer Worker** → Potong & render clips dengan FFmpeg
6. **Notify User** → Update real-time via WebSocket

## 📊 Database Schema

### Users
```javascript
{
  name: String,
  email: String,
  passwordHash: String,
  plan: 'free' | 'pro' | 'enterprise',
  credits: Number,
  createdAt: Date
}
```

### Jobs
```javascript
{
  userId: ObjectId,
  sourceUrl: String,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: Number,
  settings: {
    clips: Number,
    subtitleStyle: String
  },
  createdAt: Date
}
```

### Clips
```javascript
{
  jobId: ObjectId,
  title: String,
  start: Number,
  end: Number,
  fileUrl: String,
  thumbnail: String,
  score: Number
}
```

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, JWT
- **Worker:** BullMQ, yt-dlp, FFmpeg, Whisper
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Database:** MongoDB
- **Queue:** Redis + BullMQ
- **AI:** OpenAI GPT-4, Whisper
- **Storage:** Local / S3 / R2
- **DevOps:** Docker, Docker Compose

## 🔐 API Endpoints

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

POST   /jobs/create
GET    /jobs/:id
GET    /jobs/my-jobs
DELETE /jobs/:id

GET    /clips/:id
GET    /clips/by-job/:jobId

GET    /usage/me
GET    /usage/stats

POST   /billing/checkout
GET    /billing/history
```

## 🎯 Roadmap

### V1 (MVP)
- [x] Basic architecture
- [ ] User authentication
- [ ] Job creation & queue
- [ ] Video download
- [ ] AI transcription
- [ ] AI clip selection
- [ ] Video rendering
- [ ] Basic dashboard

### V2 (Production)
- [ ] Multi-language subtitle
- [ ] Auto emojis
- [ ] Team workspace
- [ ] Usage analytics
- [ ] Payment gateway

### V3 (Scale)
- [ ] Auto upload to TikTok/IG
- [ ] White label
- [ ] Advanced AI prompts
- [ ] CDN integration

## 📝 License

MIT License

## 👨‍💻 Author

Built with ❤️ for content creators
