# Docker Quick Start Guide - Boutique Dropship Store

## Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Git repository cloned
- 4GB RAM available for Docker

## First Time Setup (2 minutes)

### 1. Copy Environment Template
```bash
cp .env.docker .env
```

### 2. Edit .env File
Open `.env` and ensure these values are set:
```env
# Already configured in template:
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://mongodb:27017/holistic-store
FRONTEND_URL=http://localhost:3001

# YOU MUST ADD:
JWT_SECRET=your-very-long-random-string-at-least-32-chars
SESSION_SECRET=another-very-long-random-string
MOLLIE_API_KEY=your_mollie_api_key_here
```

### 3. Start Everything
```bash
./docker-helper.sh dev
```

## Daily Development Workflow

### Start Development
```bash
# Start all services
./docker-helper.sh dev

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Your app is now running at:**
- 🛍️ **Store Frontend**: http://localhost:3001
- 🔧 **API Backend**: http://localhost:5001
- 📊 **Database UI**: http://localhost:8081 (admin/pass)

### Making Code Changes
- **Frontend changes**: Auto-refresh in browser
- **Backend changes**: Auto-restart via nodemon
- **Database changes**: Persist between restarts

### Stop Development
```bash
# Stop all services
./docker-helper.sh stop

# Or manually:
docker-compose down
```

## Common Development Tasks

### View Logs
```bash
# All logs
./docker-helper.sh logs

# Just backend logs
docker-compose logs -f backend

# Just frontend logs
docker-compose logs -f frontend
```

### Run Tests
```bash
# Backend tests
./docker-helper.sh test-backend

# Frontend tests
./docker-helper.sh test-frontend
```

### Database Management
```bash
# Populate with sample data
docker-compose exec backend node populate-simple.js

# Access MongoDB shell
docker-compose exec mongodb mongosh holistic-store

# Backup database
./docker-helper.sh backup

# Restore database
./docker-helper.sh restore backup_file.tar
```

### Update Dependencies
```bash
# Backend
docker-compose exec backend npm install <package-name>

# Frontend
docker-compose exec frontend npm install <package-name>

# Rebuild after package changes
./docker-helper.sh rebuild
```

## Troubleshooting

### Ports Already in Use
```bash
# Error: "bind: address already in use"
# Kill processes on ports:
lsof -ti:3001 | xargs kill -9
lsof -ti:5001 | xargs kill -9
lsof -ti:27017 | xargs kill -9
```

### Clean Start
```bash
# Remove everything and start fresh
./docker-helper.sh clean
./docker-helper.sh dev
```

### Permission Issues
```bash
# Fix ownership if needed
sudo chown -R $(whoami):$(whoami) .
```

## Production Deployment

### Build for Production
```bash
# Build optimized images
./docker-helper.sh build

# Start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Deploy to Server
```bash
# On your server:
git pull
./docker-helper.sh prod
```

## Git Workflow with Docker

### Important: Files to NEVER Commit
- `.env` (contains secrets)
- `node_modules/` (managed by Docker)
- Database files in `data/`

### Making Changes
1. Make code changes as normal
2. Git add/commit/push as normal
3. Docker automatically uses your latest code

### After Pulling Changes
```bash
git pull
./docker-helper.sh rebuild  # Only if package.json changed
```

## Multi-Language/Currency Testing

### Test Different Languages
1. Visit http://localhost:3001
2. Click language selector in top right
3. Verify currency changes with language

### Supported Languages
- 🇺🇸 English (USD)
- 🇪🇸 Spanish (EUR)
- 🇫🇷 French (EUR)
- 🇨🇳 Chinese (CNY)
- 🇦🇪 Arabic (SAR) - RTL
- 🇯🇵 Japanese (JPY)
- 🇩🇪 German (EUR)

## Quick Command Reference

| Task | Command |
|------|---------|
| Start dev | `./docker-helper.sh dev` |
| Stop all | `./docker-helper.sh stop` |
| View logs | `./docker-helper.sh logs` |
| Rebuild | `./docker-helper.sh rebuild` |
| Clean all | `./docker-helper.sh clean` |
| Backup DB | `./docker-helper.sh backup` |
| Shell access | `docker-compose exec backend bash` |

## Test Users
After running populate script:
- **Admin**: john@example.com / Password123!
- **Customer**: jane@example.com / Password123!

## Need Help?
1. Check logs: `./docker-helper.sh logs`
2. Restart: `./docker-helper.sh stop` then `./docker-helper.sh dev`
3. Clean start: `./docker-helper.sh clean` then `./docker-helper.sh dev`