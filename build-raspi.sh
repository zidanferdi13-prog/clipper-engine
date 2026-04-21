#!/bin/bash
# Raspberry Pi Build Script
# Handles exit code 159 by using optimized Dockerfile

echo "🍓 AI Clipper - Raspberry Pi ARM64 Build Script"
echo "================================================"
echo ""

# Check if running on ARM64
ARCH=$(uname -m)
if [ "$ARCH" != "aarch64" ]; then
  echo "⚠️  Warning: Not running on ARM64 architecture ($ARCH)"
  echo "This script is optimized for Raspberry Pi ARM64"
  echo ""
fi

# Remove version warning
echo "Removing docker-compose version warning..."
sed -i '/^version:/d' docker-compose.raspi.yml 2>/dev/null || true

# Check available memory
TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
echo "📊 Available memory: ${TOTAL_MEM}MB"

if [ "$TOTAL_MEM" -lt 2048 ]; then
  echo "⚠️  Low memory detected (< 2GB)"
  echo "Recommendation: Increase swap space"
  echo ""
  echo "Run these commands to increase swap:"
  echo "  sudo dphys-swapfile swapoff"
  echo "  sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile"
  echo "  sudo dphys-swapfile setup"
  echo "  sudo dphys-swapfile swapon"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Pull base images first
echo ""
echo "📥 Pulling base images..."
sudo docker pull mongo:7 --platform linux/arm64
sudo docker pull redis:7-alpine --platform linux/arm64
sudo docker pull node:18-alpine --platform linux/arm64

# Build services
echo ""
echo "🔨 Building services with Raspberry Pi optimized Dockerfile..."
echo "Using ytdl-core (npm) instead of yt-dlp (python)"
echo ""

# Build with memory limit for Raspberry Pi
if [ "$TOTAL_MEM" -lt 4096 ]; then
  echo "Building with memory limit (2GB)..."
  sudo docker compose -f docker-compose.raspi.yml build --memory 2g
else
  sudo docker compose -f docker-compose.raspi.yml build
fi

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build successful!"
  echo ""
  echo "🚀 Starting services..."
  sudo docker compose -f docker-compose.raspi.yml up -d
  
  echo ""
  echo "📊 Checking status..."
  sleep 5
  sudo docker compose -f docker-compose.raspi.yml ps
  
  echo ""
  echo "✅ Setup complete!"
  echo ""
  echo "📝 Useful commands:"
  echo "  Check logs:    sudo docker compose -f docker-compose.raspi.yml logs -f"
  echo "  Stop services: sudo docker compose -f docker-compose.raspi.yml down"
  echo "  Restart:       sudo docker compose -f docker-compose.raspi.yml restart"
  echo ""
  echo "🌐 Access:"
  echo "  Frontend: http://localhost:3000"
  echo "  API:      http://localhost:5000"
  echo ""
else
  echo ""
  echo "❌ Build failed!"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check RASPBERRY_PI_FIX.md for solutions"
  echo "2. Increase swap memory"
  echo "3. Try building individual services:"
  echo "   sudo docker compose -f docker-compose.raspi.yml build mongo"
  echo "   sudo docker compose -f docker-compose.raspi.yml build redis"
  echo "   sudo docker compose -f docker-compose.raspi.yml build api"
  echo "   sudo docker compose -f docker-compose.raspi.yml build worker"
  echo "   sudo docker compose -f docker-compose.raspi.yml build frontend"
  echo ""
  exit 1
fi
