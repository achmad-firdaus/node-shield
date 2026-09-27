# Node Shield - Docker Deployment

## Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Run
```bash
cd /Users/achmad/Documents/projects/node-shield
docker-compose up -d
```

### Access
- Dashboard: http://localhost:3001
- API: http://localhost:3001/api/stats
- Database: localhost:5432 (shield_user / shield_password)

### Stop
```bash
docker-compose down
```

### Features
- ✅ PostgreSQL database (production-grade)
- ✅ Automatic schema initialization
- ✅ Connection pooling
- ✅ Indexed queries (FAST)
- ✅ Health checks
- ✅ Auto-restart on failure

### Architecture
```
Node Shield App (Node.js)
        ↓
PostgreSQL Database (with indexes)
```

