# AWMS — Developer & IT Operations Guide

This guide provides step-by-step instructions for company IT engineers and developers to set up, run, test, extend, and troubleshoot the **Asset Warehouse Management System (AWMS)**.

---

## 1. Prerequisites

Ensure your host workstation or deployment server meets the following version baselines:

| Requirement | Supported Versions | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` (LTS recommended) | `node -v` |
| **npm** | `v10.x` or later | `npm -v` |
| **PostgreSQL** | `15.x` – `17.x` | `psql --version` |
| **Git** | `2.x+` | `git --version` |

---

## 2. Local Environment Setup

### 2.1 Repository Cloning & Dependency Installation
AWMS is structured as an npm multi-workspace monorepo containing `frontend` and `backend`:

```bash
# Clone the repository
git clone https://github.com/secretceremony/awms.git
cd awms

# Install all dependencies across both workspaces from root
npm install
```

### 2.2 Environment Variables Configuration
Copy the template configuration from the root directory into `backend/.env`:

```bash
cp .env.example backend/.env
```

Review and adjust variables inside `backend/.env`:

```ini
# Server Port & Mode
PORT=3000
NODE_ENV=development

# PostgreSQL Connection String (format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/awms?schema=public"

# Authentication
JWT_SECRET="generate-a-secure-random-32-character-secret"
JWT_EXPIRATION="8h"

# Frontend Origin for CORS and Cookie reflection
FRONTEND_URL="http://localhost:5173"

# Default Seed Credentials
SEED_ADMIN_EMAIL="admin.logistics@alssa.com"
SEED_ADMIN_PASSWORD="YourSecurePassword2026!"
```

---

## 3. Database Migration & Seeding

Ensure your PostgreSQL service is running and the target database (e.g. `awms`) is created:

```bash
# Example creating the database in PostgreSQL CLI
createdb -U postgres awms
```

Run Prisma schema migrations and initial operational seeds:

```bash
cd backend

# Apply migrations to database
npx prisma migrate dev --name init

# Generate Prisma Client types
npx prisma generate

# Execute seed script (creates default roles, warehouses, master units, and sample data)
npm run seed
# or: npx tsx prisma/seed.ts

cd ..
```

### Default Seed Users
The seed script populates three reference accounts:
- **Super Admin**: `admin.logistics@alssa.com` (password: `SEED_ADMIN_PASSWORD` or fallback `AlssaAdmin2026!`)
- **Admin**: `admin.ops@alssa.com`
- **Read Only**: `viewer@alssa.com`

---

## 4. Running the Development Environment

From the root project directory, run both servers concurrently:

```bash
npm run dev
```

Alternatively, run them in separate terminal windows:
```bash
# Terminal 1 — Backend (http://localhost:3000)
npm run dev:backend

# Terminal 2 — Frontend (http://localhost:5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in a modern web browser (Google Chrome or Microsoft Edge recommended for thermal label printing).

---

## 5. Testing & Quality Assurance

### 5.1 Backend Unit & Integration Tests
Backend tests use Jest and test suites cover authentication, permissions, delivery order logic, and stock movements:

```bash
# Run test suite once
npm test --workspace=backend

# Run with watch mode
npm run test:watch --workspace=backend
```

### 5.2 Frontend Compilation & Type Checking
Frontend type safety is verified through Vite and TypeScript compiler:

```bash
# Verify TypeScript compile & production bundle build
npm run build:frontend
```

### 5.3 Full Monorepo Build
```bash
npm run build
```

---

## 6. How to Add New Features

### 6.1 Adding a New Master Data Entity
1. **Prisma Schema**: Add the model in `backend/prisma/schema.prisma`. Run `npx prisma migrate dev --name add_<entity>`.
2. **Backend Module**: Generate NestJS module, controller, and service under `backend/src/<entity>/`.
   - Implement DTOs with `class-validator`.
   - Protect modifying endpoints with `@Roles('SUPER_ADMIN', 'ADMIN')`.
   - Register module in `backend/src/app.module.ts`.
3. **Frontend Page**: Create `frontend/src/pages/<Entity>.tsx`.
   - Use shared UI components (`PageHeader`, `Card`, `Button`, `Modal`, `FormField`).
   - Register route in `frontend/src/App.tsx` wrapped in `ProtectedRoute`.
   - Add navigation entry in `frontend/src/components/DashboardLayout.tsx` under Master Data.

### 6.2 Modifying Stock Movement Logic
All stock mutations belong in `backend/src/stock-movements/stock-movements.service.ts`.
- **Golden Rule**: Never mutate `warehouse_stocks` directly without an accompanying `StockMovement` parent record and child `StockMovementItem` rows.
- Always wrap mutations inside `this.prisma.$transaction(async (tx) => { ... })` to prevent partial balance updates during server failures.

---

## 7. Troubleshooting & Debugging Guide

### 7.1 Database Connection Errors (`P1001: Can't reach database server`)
- Verify PostgreSQL service is active: `brew services list` (macOS) or `systemctl status postgresql` (Linux).
- Check `DATABASE_URL` credentials in `backend/.env`.
- Ensure the port `5432` is not blocked by local firewall policies.

### 7.2 Authentication Fails / Cookie Not Set
- AWMS uses `HttpOnly` session cookies. Ensure browser requests send credentials (`credentials: 'include'`).
- Verify `FRONTEND_URL` in `backend/.env` exactly matches the browser address (e.g. `http://localhost:5173` without trailing slashes).
- When deploying behind a reverse proxy (e.g. Nginx), ensure `proxy_set_header X-Forwarded-Proto $scheme;` is enabled.

### 7.3 Thermal Shipping Label or Delivery Order Layout Issues
- Print styles are declared in `frontend/src/styles/print.css`.
- Ensure paper size is configured to `A4` for Delivery Orders and `100mm x 150mm` for Shipping Labels.
- In Chrome print dialog:
  - Margins: **None** (internal CSS padding handles layout safety).
  - Options: Enable **Background graphics**.

### 7.4 Prisma Client Out of Sync
If schema fields are modified but TypeScript errors persist:
```bash
cd backend
npx prisma generate
```
Restart your NestJS development server to reload the generated client in `backend/generated/prisma`.
