# Deployment Guide

## Local Development

### Node.js (Standalone)
```bash
cd node-shield
npm start
# Opens http://localhost:3000
```

### Docker
```bash
docker-compose up
# Opens http://localhost:3000
```

---

## Cloud Deployment

### Vercel (Recommended for Portfolio)

#### Option 1: Serverless Functions

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Create `vercel.json`**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app-standalone.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app-standalone.js"
    }
  ]
}
```

3. **Deploy**
```bash
vercel
```

#### Option 2: Docker on Vercel

```bash
vercel --prod --docker
```

### Heroku

```bash
heroku create your-shield-app
heroku container:push web
heroku container:release web
```

### Railway

```bash
railway login
railway init
railway deploy
```

### Self-Hosted (VPS/Dedicated)

```bash
# SSH into server
ssh user@your-server.com

# Clone repo
git clone <repo-url>
cd node-shield

# Start with PM2 (process manager)
npm install -g pm2
pm2 start app-standalone.js
pm2 save
pm2 startup
```

---

## Docker Deployment

### Build Image
```bash
docker build -t node-shield .
docker run -p 3000:3000 node-shield
```

### Docker Compose (Production)
```bash
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Push to Registry
```bash
# Docker Hub
docker login
docker tag node-shield yourusername/node-shield
docker push yourusername/node-shield

# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URI
docker tag node-shield:latest YOUR_ECR_URI:latest
docker push YOUR_ECR_URI:latest
```

---

## Environment Variables

Create `.env` file:
```
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
ATTACK_LOG_FILE=./attacks.json
```

Load in app:
```javascript
const port = process.env.PORT || 3000;
```

---

## Monitoring

### Health Checks

```bash
# Simple health check
curl http://localhost:3000/api/stats

# With monitoring service
# Set endpoint: http://your-domain/api/stats
# Expected: JSON response with { total: ... }
```

### Logging

View real-time logs:
```bash
# Local
tail -f shield.log

# Docker
docker-compose logs -f

# PM2
pm2 logs app-standalone
```

### Metrics to Monitor

- **Total Attacks Blocked** — Growing trend = active threats
- **Rate Limit Alerts** — Indicates scanning/brute force
- **Top Attackers** — Identify repeat offenders
- **Attack Types** — Trends in attack patterns

---

## Scaling

### Vertical Scaling (More Resources)
- Increase CPU/RAM on single server
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=2048`

### Horizontal Scaling (Multiple Instances)
1. Deploy to 2+ servers behind load balancer (nginx/HAProxy)
2. Share `attacks.json` via NFS or centralized database
3. Use Redis for distributed rate limiting

### Database (Future)
Currently uses JSON file. For scale, consider:
- PostgreSQL (time-series data)
- MongoDB (document storage)
- Elasticsearch (search & analytics)

---

## Security for Production

### Firewall Rules
```bash
# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block unusual ports
ufw default deny incoming
ufw default allow outgoing
```

### HTTPS/TLS
```bash
# With Let's Encrypt
sudo apt install certbot
certbot certonly --standalone -d your-domain.com

# Point Node Shield behind nginx with SSL
# See nginx reverse proxy config below
```

### Nginx Reverse Proxy
```nginx
server {
    listen 443 ssl http2;
    server_name your-shield-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### API Security (Future)
- [ ] API key authentication
- [ ] Rate limiting per key
- [ ] CORS restrictions
- [ ] IP whitelisting for dashboard

---

## Backup & Recovery

### Backup Attack Logs
```bash
# Daily backup
0 2 * * * cp /var/app/attacks.json /backups/attacks-$(date +\%Y\%m\%d).json
```

### Restore from Backup
```bash
cp /backups/attacks-20260901.json ./attacks.json
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### High Memory Usage
```bash
# Check memory
free -h

# Restart service
pm2 restart app-standalone

# Or check for attack log size
du -sh attacks.json
```

### Dashboard Not Loading
```bash
# Check server status
curl http://localhost:3000/api/stats

# Check logs
docker-compose logs
```

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring/alerts
- [ ] Enable access logs
- [ ] Test health endpoint
- [ ] Test attack detection
- [ ] Set up backup system
- [ ] Document deployment process
- [ ] Train team on usage
- [ ] Plan for updates/patches

