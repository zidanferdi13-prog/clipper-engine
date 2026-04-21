#!/bin/bash
# Manual Installation Script for Raspberry Pi
# Run without Docker when Docker builds fail

echo "🍓 AI Clipper - Manual Installation (No Docker)"
echo "================================================"
echo ""

# Check if running on ARM64
ARCH=$(uname -m)
if [ "$ARCH" != "aarch64" ]; then
  echo "⚠️  Warning: Not running on ARM64 architecture ($ARCH)"
fi

echo "📦 Installing system dependencies..."
echo ""

# Update package list
sudo apt-get update

# Install Node.js 18
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install FFmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "Installing FFmpeg..."
  sudo apt-get install -y ffmpeg
fi

# Install Python3 and pip (optional, for yt-dlp)
sudo apt-get install -y python3 python3-pip

# Install MongoDB via Docker (apt package not available on Raspberry Pi)
if ! sudo docker ps | grep -q mongo; then
  echo "Installing MongoDB via Docker..."
  sudo docker pull mongo:7 --platform linux/arm64
  sudo docker run -d \
    --name clipper-mongo \
    --restart unless-stopped \
    -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=clipper_secret_2024 \
    -v clipper_mongo_data:/data/db \
    mongo:7
  echo "MongoDB started in Docker container"
fi

# Install Redis
if ! command -v redis-server &> /dev/null; then
  echo "Installing Redis..."
  sudo apt-get install -y redis-server
  sudo systemctl start redis-server
  sudo systemctl enable redis-server
else
  echo "Redis already installed"
  sudo systemctl start redis-server 2>/dev/null || true
fi

echo ""
echo "✅ System dependencies installed!"
echo ""

# Install project dependencies
echo "📦 Installing project dependencies..."
echo ""

# Backend
cd backend
echo "Installing backend dependencies..."
npm install
cd ..

# Worker
cd worker
echo "Installing worker dependencies..."
npm install
# Install ytdl-core for Raspberry Pi
npm install ytdl-core
cd ..

# Frontend
cd frontend
echo "Installing frontend dependencies..."
# Clean node_modules if npm install failed before
if [ -d "node_modules" ]; then
  echo "Cleaning corrupted node_modules..."
  rm -rf node_modules package-lock.json
fi
# Retry npm install with verbose logging
npm install --verbose --legacy-peer-deps || {
  echo "⚠️  Frontend npm install failed, retrying..."
  npm cache clean --force
  npm install --legacy-peer-deps
}
cd ..

echo ""
echo "✅ Project dependencies installed!"
echo ""

# Setup environment
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit .env file and set:"
  echo "  - OPENAI_API_KEY"
  echo "  - JWT_SECRET"
  echo "  - JWT_REFRESH_SECRET"
  echo ""
fi

# Create systemd services
echo "🔧 Creating systemd services..."

# Backend service
sudo tee /etc/systemd/system/clipper-backend.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Backend API
After=network.target docker.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=NODE_ENV=production
Environment=MONGODB_URI=mongodb://admin:clipper_secret_2024@localhost:27017/clipper?authSource=admin
Environment=REDIS_URL=redis://localhost:6379
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Worker service
sudo tee /etc/systemd/system/clipper-worker.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Worker
After=network.target docker.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/worker
Environment=NODE_ENV=production
Environment=USE_YTDL_CORE=true
Environment=MONGODB_URI=mongodb://admin:clipper_secret_2024@localhost:27017/clipper?authSource=admin
Environment=REDIS_URL=redis://localhost:6379
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
sudo tee /etc/systemd/system/clipper-frontend.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Frontend
After=network.target

[Service]
Type=simple
User=$USERdevelopment
Environment=NEXT_PUBLIC_API_URL=http://localhost:5000
ExecStart=/usr/bin/npm run dev
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

echo ""
echo "✅ Systemd services created!"
echo ""

# Build frontend
echo "🔨 Building frontend..."
cd frontend
if [ -f "node_modules/.bin/next" ]; then
  npm run build
else
  echo "⚠️  Next.js not found, skipping build. Frontend will build on first start."
  echo "You can build manually later with: cd frontend && npm run build"
fi
cd ..

echo ""
echo "✅ Manual installation complete!"
echo ""
echo "🚀 To start services:"
echo "  sudo systemctl start clipper-backend"
echo "  sudo systemctl start clipper-worker"
echo "  sudo systemctl start clipper-frontend"
echo ""
echo "📊 To check status:"
echo "  sudo systemctl status clipper-backend"
echo "  sudo systemctl status clipper-worker"
echo "  sudo systemctl status clipper-frontend"
echo ""
echo "📝 To view logs:"
echo "  sudo journalctl -u clipper-backend -f"
echo "  sudo journalctl -u clipper-worker -f"
echo "  sudo journalctl -u clipper-frontend -f"
echo ""
echo "🔧 To enable auto-start on boot:"
echo "  sudo systemctl enable clipper-backend"
echo "  sudo systemctl enable clipper-worker"
echo "  sudo systemctl enable clipper-frontend"
echo ""
echo "🌐 Access:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:5000"
echo ""
