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

# Install MongoDB
if ! command -v mongod &> /dev/null; then
  echo "Installing MongoDB..."
  sudo apt-get install -y mongodb
  sudo systemctl start mongodb
  sudo systemctl enable mongodb
fi

# Install Redis
if ! command -v redis-server &> /dev/null; then
  echo "Installing Redis..."
  sudo apt-get install -y redis-server
  sudo systemctl start redis-server
  sudo systemctl enable redis-server
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
npm install
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
After=network.target mongodb.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Worker service
sudo tee /etc/systemd/system/clipper-worker.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Worker
After=network.target mongodb.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/worker
Environment=NODE_ENV=production
Environment=USE_YTDL_CORE=true
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
User=$USER
WorkingDirectory=$(pwd)/frontend
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
npm run build
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
