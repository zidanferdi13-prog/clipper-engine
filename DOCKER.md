# AI Clipper - Docker Deployment

## Quick Start

### 1. Setup Environment

```bash
# Copy .env.example and edit with your values
cp .env.example .env
notepad .env
```

**Required environment variables:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys
- `JWT_SECRET` - Random 32+ character string
- `JWT_REFRESH_SECRET` - Different random 32+ character string

### 2. Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 3. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017 (internal)
- **Redis:** localhost:6379 (internal)

## Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f frontend
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose build api
docker-compose up -d api

# Rebuild all
docker-compose build
docker-compose up -d
```

### Reset Everything
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

## Service Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│   MongoDB   │
│  (Next.js)  │     │  (Express)  │     │             │
│   :3000     │     │    :5000    │     │   :27017    │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    ▲
                            │                    │
                            ▼                    │
                    ┌─────────────┐              │
                    │    Redis    │              │
                    │   (Queue)   │              │
                    │    :6379    │              │
                    └─────────────┘              │
                            │                    │
                            ▼                    │
                    ┌─────────────┐              │
                    │   Worker    │──────────────┘
                    │  (BullMQ)   │
                    └─────────────┘
```

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key for transcription & analysis
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Backend port (default: 5000)
- `MONGODB_URI` - MongoDB connection string (auto-configured in Docker)
- `REDIS_URL` - Redis connection string (auto-configured in Docker)
- `STORAGE_PATH` - Storage directory (default: ./storage)

## Storage

Data is persisted in Docker volumes:
- `mongo_data` - MongoDB database
- `redis_data` - Redis cache
- `storage_data` - Uploaded videos and generated clips

View volumes:
```bash
docker volume ls
```

## Troubleshooting

### Port Already in Use

**Error:** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution:**
```bash
# Find and stop process using the port
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

### Container Fails to Start

```bash
# Check logs
docker-compose logs api

# Check container status
docker ps -a

# Restart service
docker-compose restart api
```

### Out of Memory

Docker Desktop on Windows defaults to 2GB memory.

**Solution:**
1. Open Docker Desktop
2. Settings → Resources
3. Increase Memory to at least 4GB
4. Apply & Restart

### MongoDB Connection Failed

```bash
# Check MongoDB container
docker-compose ps mongo

# Restart MongoDB
docker-compose restart mongo

# View MongoDB logs
docker-compose logs mongo
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker-compose logs -f worker

# Ensure OpenAI API key is set
docker-compose exec worker printenv | grep OPENAI

# Restart worker
docker-compose restart worker
```

## Production Deployment

### Security Checklist

- [ ] Change default MongoDB password
- [ ] Generate strong JWT secrets (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up backup for MongoDB
- [ ] Configure log rotation
- [ ] Set up monitoring (Sentry, etc.)

### Performance Optimization

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M
```

### Scaling Workers

```bash
# Scale workers to 3 instances
docker-compose up -d --scale worker=3
```

## Backup & Restore

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongo mongodump \
  --username admin \
  --password clipper_secret_2024 \
  --authenticationDatabase admin \
  --out /backup

# Copy backup to host
docker cp clipper-mongo:/backup ./backup
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ./backup clipper-mongo:/backup

# Restore
docker-compose exec mongo mongorestore \
  --username admin \
  --password clipper_secret_2024 \
  --authenticationDatabase admin \
  /backup
```

## Health Checks

```bash
# Check API health
curl http://localhost:5000/health

# Check all services
docker-compose ps
```

## Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d
```

---

**Documentation:**
- [API Documentation](API_DOCS.md)
- [Changelog](CHANGELOG.md)
- [Deployment Guide](DEPLOYMENT.md)

**Support:** Report issues on GitHub
