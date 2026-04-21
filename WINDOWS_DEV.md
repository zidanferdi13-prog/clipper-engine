# Windows Development with Docker

## Quick Start

### Prerequisites
- Docker Desktop for Windows
- Git for Windows
- VS Code (recommended)

### Setup

```powershell
# Clone repository
git clone https://github.com/zidanferdi13-prog/clipper-engine.git
cd clipper-engine

# Setup environment
copy .env.example .env
notepad .env  # Add your OPENAI_API_KEY

# Start with Docker
docker-compose up -d

# View logs
docker-compose logs -f
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Development Workflow

### Hot Reload Development

Edit `docker-compose.yml` to enable hot reload:

```yaml
services:
  api:
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev  # Instead of node src/index.js

  worker:
    volumes:
      - ./worker:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
```

Restart services:
```powershell
docker-compose down
docker-compose up -d
```

### Local Development (Without Docker)

If you prefer local development:
