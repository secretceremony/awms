# AWMS — Deployment & Hosting Guide

This document provides system administrators and IT engineers at **PT ALSSA Corporindo** with practical instructions for deploying, containerizing, and hosting the **Asset Warehouse Management System (AWMS)**.

---

## 1. Deployment Overview & Architecture

AWMS can be deployed using three primary strategies depending on company infrastructure:

```
┌─────────────────────────────────────────────────────────────┐
│                 Company Host / Cloud VPS                    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               Nginx Reverse Proxy / SSL             │   │
│   │          (Port 80 / 443 HTTPS - Domain Name)        │   │
│   └──────────────┬────────────────────────┬─────────────┘   │
│                  │                        │                 │
│         /        │                        │   /api/         │
│   ┌──────────────▼──────────┐   ┌─────────▼─────────────┐   │
│   │     Frontend SPA        │   │     Backend API       │   │
│   │   (Static Dist / Nginx) │   │     (NestJS / PM2)    │   │
│   └─────────────────────────┘   └─────────┬─────────────┘   │
│                                           │                 │
│                                 ┌─────────▼─────────────┐   │
│                                 │      PostgreSQL       │   │
│                                 │   (Database Instance) │   │
│                                 └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Deployment Options

### Option 1: Docker Compose Deployment (Recommended)
This approach encapsulates the entire environment (PostgreSQL database, NestJS API, and Nginx-served React frontend) into isolated containers, eliminating host dependency discrepancies.

#### Prerequisites
- Docker Engine `24.x+`
- Docker Compose `v2.x+`

#### Step-by-Step Execution
1. **Clone repository on the server**:
   ```bash
   git clone https://github.com/secretceremony/awms.git
   cd awms
   ```

2. **Configure environment variables**:
   Create a root `.env` file (copied from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Set strong production values:
   ```ini
   POSTGRES_DB=awms
   POSTGRES_USER=alssa_admin
   POSTGRES_PASSWORD=YourStrongDatabasePassword2026!
   JWT_SECRET=YourGenerated64CharacterProductionJwtSecretKey
   FRONTEND_URL=http://localhost
   SEED_ADMIN_EMAIL=admin.logistics@alssa.com
   SEED_ADMIN_PASSWORD=InitialAdminPassword2026!
   ```

3. **Build and start services**:
   ```bash
   docker compose up -d --build
   ```

4. **Initialize database schema & seed**:
   Once containers are healthy, run database migrations inside the backend container:
   ```bash
   docker compose exec backend npx prisma migrate deploy
   docker compose exec backend npm run seed
   ```

5. **Access application**:
   - Web application: `http://<SERVER_IP_OR_DOMAIN>`
   - API endpoint: `http://<SERVER_IP_OR_DOMAIN>/api/`

---

### Option 2: Bare-Metal / Virtual Machine (Host Deployment)
For hosting on a company Ubuntu/Debian Linux server with dedicated PostgreSQL and PM2 process manager:

#### 1. Setup PostgreSQL
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE awms;"
sudo -u postgres psql -c "CREATE USER alssa WITH PASSWORD 'StrongPassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE awms TO alssa;"
```

#### 2. Deploy Backend with PM2
```bash
cd /opt/awms/backend
npm ci
cp .env.example .env # Set DATABASE_URL, JWT_SECRET, PORT=3000
npx prisma migrate deploy
npx prisma generate
npm run build

# Install PM2 and launch backend daemon
npm install -g pm2
pm2 start dist/main.js --name "awms-api"
pm2 save
pm2 startup
```

#### 3. Build & Host Frontend with Nginx
```bash
cd /opt/awms/frontend
npm ci
npm run build

# Copy build artifacts to web root
sudo cp -r dist/* /var/www/awms/
```

Configure `/etc/nginx/sites-available/awms`:
```nginx
server {
    listen 80;
    server_name awms.alssa.co.id;

    root /var/www/awms;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/awms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### Option 3: Internal Testing / Staging Access (Temporary Tunneling)
When demonstrating or testing features remotely with site teams without public IP or domain name:

1. Run application locally via standard development workflow (`npm run dev`).
2. Use an internal tunnel tool (e.g. Cloudflare Tunnel, Tailscale, or ngrok) pointing to frontend port `5173`.
3. Configure `FRONTEND_URL` in `backend/.env` to reflect the tunnel URL to ensure session cookies pass CORS validation.

> [!WARNING]
> Tunneling is intended exclusively for temporary staging and user acceptance evaluation. Production dispatches and customer delivery documentation should always use a persistent company server or Docker container.

---

## 3. Database Migration & Maintenance

### Applying Schema Updates Safely
In production environments, **always use `migrate deploy`**:
```bash
cd backend
npx prisma migrate deploy
```
This safely applies recorded migrations sequentially without resetting tables.

### Automated Daily Database Backups
Add a nightly cron job to back up the database:
```bash
crontab -e
```
Add the following line (runs every night at 02:00 AM):
```cron
0 2 * * * pg_dump -U alssa -d awms -Fc -f /var/backups/awms_$(date +\%F).dump
```

---

## 4. Monitoring & Troubleshooting

| Symptom | Diagnostic Command | Typical Solution |
| :--- | :--- | :--- |
| **Containers fail to start** | `docker compose logs -f` | Check for port conflicts on `80`, `3000`, or `5432`. |
| **Prisma migration error** | `docker compose exec backend npx prisma migrate status` | Resolve migration drift; ensure PostgreSQL container is healthy before executing. |
| **Login error (401 / CORS)** | Check browser network tab response headers | Confirm `FRONTEND_URL` matches the exact browser URL origin. |
| **Thermal printer layout shift** | Check print dialog margins in Chrome | Set margins to **None** and enable **Background graphics**. |

---

## 5. Operational Deployment Checklist

Before handing the system over or cutting over to production, verify every item on this checklist:

- [ ] **1. Configure Environment Variables**: Create `.env` on root/backend and set production credentials (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`).
- [ ] **2. Verify Production Secrets**: Replace default JWT secret with a secure 32+ character random string.
- [ ] **3. Start PostgreSQL Database**: Ensure database service or container is healthy and accepting connections.
- [ ] **4. Run Prisma Migrations**: Execute `npx prisma migrate deploy` (never run `migrate dev` in production).
- [ ] **5. Seed Initial Accounts**: Run seed script to establish the first `SUPER_ADMIN` account or use custom `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- [ ] **6. Build Production Services**: Compile backend (`nest build`) and frontend (`tsc -b && vite build`) or build Docker images (`docker compose build`).
- [ ] **7. Verify Health & Security Endpoints**: Confirm `GET /api/auth/me` responds as expected, cookies have `HttpOnly; SameSite=Lax`, and CORS disallows unauthorized origins.
- [ ] **8. Test Automated Database Backup**: Verify scheduled `pg_dump` cron job executes and test-restore a sample archive.

