#!/bin/bash
# Quick fix untuk menyelesaikan instalasi yang failed

echo "🔧 AI Clipper - Quick Fix Installation"
echo "======================================="
echo ""

cd /var/www/clipper-engine

# Fix 1: Install MongoDB via Docker
echo "📦 Installing MongoDB via Docker..."
sudo docker pull mongo:7 --platform linux/arm64
sudo docker run -d \
  --name clipper-mongo \
  --restart unless-stopped \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=clipper_secret_2024 \
  -v clipper_mongo_data:/data/db \
  mongo:7 || echo "MongoDB container already running"

# Fix 2: Fix frontend npm install
echo ""
echo "📦 Fixing frontend dependencies..."
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# Fix 3: Update systemd services with correct MongoDB connection
echo ""
echo "🔧 Updating systemd services..."

sudo tee /etc/systemd/system/clipper-backend.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Backend API
After=network.target docker.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/clipper-engine/backend
Environment=NODE_ENV=production
Environment=MONGODB_URI=mongodb://admin:clipper_secret_2024@localhost:27017/clipper?authSource=admin
Environment=REDIS_URL=redis://localhost:6379
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/clipper-worker.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Worker
After=network.target docker.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/clipper-engine/worker
Environment=NODE_ENV=production
Environment=USE_YTDL_CORE=true
Environment=MONGODB_URI=mongodb://admin:clipper_secret_2024@localhost:27017/clipper?authSource=admin
Environment=REDIS_URL=redis://localhost:6379
ExecStart=/usr/bin/node src/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/clipper-frontend.service > /dev/null <<EOF
[Unit]
Description=AI Clipper Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/clipper-engine/frontend
Environment=NODE_ENV=development
Environment=NEXT_PUBLIC_API_URL=http://localhost:5000
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

echo ""
echo "✅ Quick fix complete!"
echo ""
echo "🚀 Starting services..."
sudo systemctl start clipper-backend
sudo systemctl start clipper-worker
sudo systemctl start clipper-frontend

echo ""
sleep 3
echo "📊 Service status:"
sudo systemctl status clipper-backend --no-pager -l
echo ""
sudo systemctl status clipper-worker --no-pager -l
echo ""
sudo systemctl status clipper-frontend --no-pager -l

echo ""
echo "✅ All services started!"
echo ""
echo "🌐 Access:"
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:5000"
echo ""
echo "📝 View logs:"
echo "  sudo journalctl -u clipper-backend -f"
echo "  sudo journalctl -u clipper-worker -f"
echo "  sudo journalctl -u clipper-frontend -f"
echo ""
