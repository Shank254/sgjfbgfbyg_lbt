# Deployment Guide

This guide covers deploying the WhatsApp Bot Manager to various cloud platforms.

## Table of Contents
- [Heroku Deployment](#heroku-deployment)
- [Render Deployment](#render-deployment)
- [Railway Deployment](#railway-deployment)
- [Fly.io Deployment](#fly-io-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)

---

## Heroku Deployment

### Prerequisites
- Heroku CLI installed
- Heroku account

### Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create a new Heroku app**
   ```bash
   heroku create your-whatsapp-bot-manager
   ```

3. **Add PostgreSQL addon**
   ```bash
   heroku addons:create heroku-postgresql:essential-0
   ```

4. **Set environment variables**
   ```bash
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Run database migrations**
   ```bash
   heroku run npm run db:push -- --force
   ```

7. **Open your app**
   ```bash
   heroku open
   ```

### Keep-Alive Configuration
To prevent the bot from sleeping on Heroku's free tier:
- Upgrade to a paid dyno (recommended)
- Use a service like [UptimeRobot](https://uptimerobot.com/) to ping your app every 5 minutes

---

## Render Deployment

### Prerequisites
- Render account
- GitHub repository

### Steps

1. **Connect GitHub Repository**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: whatsapp-bot-manager
   - **Environment**: Node
   - **Build Command**: `npm install && npm run db:push --force`
   - **Start Command**: `npm run start`

3. **Add PostgreSQL Database**
   - In Render Dashboard, create a new PostgreSQL database
   - Copy the Internal Database URL

4. **Set Environment Variables**
   - Go to your web service → Environment
   - Add:
     - `DATABASE_URL`: (paste the PostgreSQL URL)
     - `NODE_ENV`: `production`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app

### Keep-Alive
Render services on the free tier spin down after inactivity. The built-in keep-alive feature in the bot helps prevent this.

---

## Railway Deployment

### Prerequisites
- Railway account
- GitHub repository

### Steps

1. **Create New Project**
   - Go to [Railway](https://railway.app/)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Add PostgreSQL**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

3. **Configure Build**
   - Railway will auto-detect the `railway.json` configuration
   - Or manually set:
     - **Build Command**: `npm install && npm run db:push --force`
     - **Start Command**: `npm run start`

4. **Set Environment Variables**
   - Go to Variables tab
   - Add: `NODE_ENV=production`

5. **Deploy**
   - Railway deploys automatically on git push

### Custom Domain
- Go to Settings → Domains
- Click "Generate Domain" or add custom domain

---

## Fly.io Deployment

### Prerequisites
- Fly.io CLI installed
- Fly.io account

### Steps

1. **Login to Fly.io**
   ```bash
   flyctl auth login
   ```

2. **Initialize Fly app**
   ```bash
   flyctl launch
   ```
   - Choose app name
   - Select region
   - Don't deploy yet

3. **Create PostgreSQL**
   ```bash
   flyctl postgres create
   ```
   - Name it `whatsapp-bot-db`
   - Attach to your app:
     ```bash
     flyctl postgres attach whatsapp-bot-db
     ```

4. **Set Secrets**
   ```bash
   flyctl secrets set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   flyctl deploy
   ```

6. **Open App**
   ```bash
   flyctl open
   ```

### Scaling
```bash
flyctl scale count 1
flyctl scale vm shared-cpu-1x --memory 512
```

---

## Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose (optional)

### Using Docker

1. **Build Image**
   ```bash
   docker build -t whatsapp-bot-manager .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name whatsapp-bot \
     -p 5000:5000 \
     -e DATABASE_URL="your-postgres-url" \
     -e NODE_ENV="production" \
     whatsapp-bot-manager
   ```

### Using Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/whatsapp_bot
      - NODE_ENV=production
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=whatsapp_bot
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up -d
```

---

## Environment Variables

Required environment variables for all platforms:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Environment (production/development) | Yes |
| `PORT` | Port to run on (default: 5000) | No |

The app will automatically create necessary tables on first run.

---

## Post-Deployment

After deploying to any platform:

1. **Access your app** at the provided URL
2. **Register a user account**
3. **Generate QR code** and connect your WhatsApp
4. **Configure bot settings** (mode, owner number, etc.)
5. **Start using the bot!**

### Admin Access
- Default admin code: `4262`
- Change this after first deployment for security

---

## Troubleshooting

### Bot Keeps Disconnecting
- Enable keep-alive in bot settings
- Ensure your hosting plan doesn't sleep (upgrade from free tier)
- Check logs for connection errors

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Ensure database allows connections from your app's IP
- Run `npm run db:push --force` to sync schema

### Chromium/Puppeteer Errors
- Ensure Chromium is installed (Dockerfile handles this)
- Check platform-specific Chromium paths in `botManager.ts`
- Add `--no-sandbox` flag to Puppeteer config (already included)

### Memory Issues
- WhatsApp bots can be memory-intensive
- Recommended: At least 512MB RAM
- Monitor memory usage and scale up if needed

---

## Support

For issues or questions:
- Check the [main README](README.md)
- Review application logs
- Open an issue on GitHub

---

**Keep-Alive Tips:**
- Enable keep-alive toggle in dashboard
- Use paid hosting tiers for 24/7 uptime
- Consider using monitoring services like UptimeRobot
- Set up health check endpoints for auto-recovery
