# 09 - Deployment Guide

This guide outlines the production deployment procedure for AWMS on standard Linux environments.

---

## 1. System Requirements

- **Node.js**: `v20.x` or `v22.x` (LTS)
- **Database**: PostgreSQL `15.x` &ndash; `17.x`
- **Process Manager**: PM2 or Systemd
- **Web Server / Reverse Proxy**: Nginx or Caddy with TLS/HTTPS certificates

---

## 2. Environment Configuration

Create a secure `.env` file for the backend server:

```env
PORT=3000
NODE_ENV=production
DATABASE_URL="postgresql://awms_user:STRONG_PASSWORD@127.0.0.1:5432/awms?schema=public&sslmode=prefer"
JWT_SECRET="GENERATE_A_64_CHAR_RANDOM_HEX_SECRET"
JWT_EXPIRATION="8h"
FRONTEND_URL="https://awms.yourdomain.com"
COOKIE_DOMAIN=".yourdomain.com"
```

---

## 3. Build & Migration Pipeline

```bash
# 1. Install dependencies across monorepo
npm ci

# 2. Apply production database migrations
cd backend
npx prisma migrate deploy
cd ..

# 3. Build backend and frontend distribution bundles
npm run build:backend
npm run build:frontend
```

---

## 4. Process Management (PM2 Example)

```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "awms-backend",
      cwd: "./backend",
      script: "dist/src/main.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

Start the application service:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## 5. Reverse Proxy Configuration (Nginx Example)

```nginx
server {
    listen 443 ssl http2;
    server_name awms.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/awms.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/awms.yourdomain.com/privkey.pem;

    # Static Frontend
    location / {
        root /var/www/awms/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
