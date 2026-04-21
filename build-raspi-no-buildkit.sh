#!/bin/bash
# Raspberry Pi Build - Without BuildKit
# Fixes exit code 159 by disabling BuildKit

echo "🍓 AI Clipper - Raspberry Pi Build (No BuildKit)"
echo "=================================================="
echo ""

# Disable BuildKit
export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

echo "🔧 BuildKit disabled (using legacy builder)"
echo ""

# Check available memory
TOTAL_MEM=$(free -m | awk 'NR==2 {print $2}')
echo "📊 Available memory: ${TOTAL_MEM}MB"
echo ""

# Remove version warning
sed -i '/^version:/d' docker-compose.raspi.yml 2>/dev/null || true

# Pull base images first
echo "📥 Pulling base images..."
sudo DOCKER_BUILDKIT=0 docker pull --platform linux/arm64 mongo:7
sudo DOCKER_BUILDKIT=0 docker pull --platform linux/arm64 redis:7-alpine
sudo DOCKER_BUILDKIT=0 docker pull --platform linux/arm64 node:18-alpine

echo ""
echo "🔨 Building services WITHOUT BuildKit..."
echo ""

# Build with BuildKit disabled
sudo DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose -f docker-compose.raspi.yml build --no-cache

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
  echo "❌ Build still failed with BuildKit disabled!"
  echo ""
  echo "This indicates a severe issue with Docker on your Raspberry Pi."
  echo ""
  echo "🔧 Alternative Solutions:"
  echo ""
  echo "1. Use Manual Installation (No Docker):"
  echo "   ./install-manual.sh"
  echo ""
  echo "2. Use Pre-built Images from Docker Hub:"
  echo "   Coming soon..."
  echo ""
  echo "3. Check Docker version and reinstall:"
  echo "   docker --version"
  echo "   sudo apt-get remove docker docker-engine docker.io containerd runc"
  echo "   sudo apt-get update"
  echo "   sudo apt-get install docker.io docker-compose-plugin"
  echo ""
  exit 1
fi
