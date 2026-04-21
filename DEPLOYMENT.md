# Deployment Guide - AI Clipper

## 🚀 Production Deployment

### Option 1: VPS Deployment (Recommended for V1)

#### Prerequisites
- Ubuntu 20.04+ VPS
- 4GB+ RAM
- 50GB+ Storage
- Domain (optional)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y
```

#### 2. Clone Repository

```bash
cd /var/www
git clone <your-repo-url> ai-clipper
cd ai-clipper
```

#### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

Update production values:
```env
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://admin:STRONG_PASSWORD@mongo:27017/clipper?authSource=admin

# Redis
REDIS_URL=redis://redis:6379

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-here-use-random-string
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-your-real-openai-key

# Storage (use S3 for production)
STORAGE_TYPE=local
# or
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BUCKET_NAME=clipper-storage
AWS_REGION=us-east-1

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### 4. Start Services

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

#### 5. Setup Nginx (Optional - for domain)

```bash
sudo apt install nginx -y
```

Create nginx config:
```bash
sudo nano /etc/nginx/sites-available/clipper
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/clipper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL Certificate (Optional)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

### Option 2: Docker Swarm (For Scaling)

#### 1. Initialize Swarm

```bash
docker swarm init
```

#### 2. Create Stack

```bash
docker stack deploy -c docker-compose.yml clipper
```

#### 3. Scale Workers

```bash
docker service scale clipper_worker=3
```

---

### Option 3: Kubernetes (Advanced)

Coming soon...

---

## 📊 Monitoring Setup

### 1. Install Portainer (Docker UI)

```bash
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

Access: `http://your-server:9000`

### 2. Setup Logging

Edit `docker-compose.yml`:

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. Health Checks

```bash
# API Health
curl http://localhost:5000/health

# MongoDB
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Redis
docker-compose exec redis redis-cli ping
```

---

## 🔒 Security Checklist

- [ ] Change default MongoDB password
- [ ] Use strong JWT_SECRET
- [ ] Enable firewall (UFW)
- [ ] Setup SSL/TLS
- [ ] Regular backups
- [ ] Update dependencies
- [ ] Use environment variables
- [ ] Rate limiting enabled
- [ ] CORS configured properly

### Setup Firewall

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

---

## 💾 Backup Strategy

### Database Backup

```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/clipper"

mkdir -p $BACKUP_DIR

# MongoDB backup
docker-compose exec -T mongo mongodump \
  --username admin \
  --password clipper_secret_2024 \
  --authenticationDatabase admin \
  --out /tmp/backup

docker cp clipper-mongo:/tmp/backup $BACKUP_DIR/mongo_$DATE

# Compress
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/mongo_$DATE
rm -rf $BACKUP_DIR/mongo_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /var/www/ai-clipper/backup.sh
```

---

## 🔧 Maintenance

### Update Application

```bash
cd /var/www/ai-clipper
git pull
docker-compose down
docker-compose up -d --build
```

### Clean Old Storage

```bash
# Clean files older than 30 days
find ./storage/temp -type f -mtime +30 -delete
find ./storage/clips -type f -mtime +30 -delete
```

### Monitor Disk Space

```bash
df -h
docker system df
```

### Clean Docker

```bash
docker system prune -a --volumes
```

---

## 📈 Scaling Guide

### When to Scale?

- CPU usage > 70%
- RAM usage > 80%
- Queue backlog > 100 jobs
- Response time > 2s

### Vertical Scaling

Upgrade VPS plan:
- 2 vCPU → 4 vCPU
- 4GB RAM → 8GB RAM

### Horizontal Scaling

#### 1. Separate Worker Server

Deploy worker on different server:

```yaml
# worker-compose.yml
version: '3.8'
services:
  worker:
    build: ./worker
    environment:
      MONGODB_URI: mongodb://admin:pass@main-server:27017/clipper
      REDIS_URL: redis://main-server:6379
```

#### 2. Multiple Workers

```bash
docker-compose up -d --scale worker=3
```

#### 3. Load Balancer

Use Nginx for API load balancing:

```nginx
upstream api_servers {
    server api1.yourdomain.com;
    server api2.yourdomain.com;
    server api3.yourdomain.com;
}

server {
    location / {
        proxy_pass http://api_servers;
    }
}
```

---

## 💰 Cost Optimization

### Cheap Setup (~ $20/mo)

- **VPS**: Hetzner CX21 ($5/mo)
- **Object Storage**: Cloudflare R2 (Free 10GB)
- **Database**: MongoDB Atlas Free Tier
- **CDN**: Cloudflare Free

### Medium Setup (~ $50/mo)

- **VPS**: DigitalOcean 4GB ($24/mo)
- **Object Storage**: AWS S3 ($5-10/mo)
- **Database**: Self-hosted MongoDB
- **CDN**: Cloudflare Pro

### Production Setup (~ $200/mo)

- **API Server**: 8GB VPS ($48/mo)
- **Worker Server**: 8GB VPS ($48/mo)
- **Database**: Managed MongoDB ($50/mo)
- **Storage**: S3 ($20/mo)
- **CDN**: Cloudflare Business
- **Monitoring**: Datadog ($30/mo)

---

## 🆘 Troubleshooting

### High CPU Usage

```bash
# Check worker processes
docker stats

# Reduce worker concurrency
# Edit worker Dockerfile or code
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Queue Stuck

```bash
# Check Redis
docker-compose exec redis redis-cli
KEYS *

# Clear queue
FLUSHALL
```

---

## 📞 Support

For deployment help:
- Email: support@yourdomain.com
- Discord: discord.gg/yourserver

---

Happy Deploying! 🚀
