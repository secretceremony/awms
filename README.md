# AWMS — ALSSA Warehouse Management System

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-7.10-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-Proprietary-darkred?style=for-the-badge" alt="License" />
</p>

AWMS (ALSSA Warehouse Management System) is an enterprise logistics and inventory execution platform designed for warehouse operations, material allocation, dispatch management, and transactional auditing.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: NestJS v11 (Express)
- **Database & ORM**: PostgreSQL 17, Prisma ORM v7
- **Styling**: Modern corporate CSS variables, responsive layouts, print-ready document views

---

## ✨ Features

- 🔐 **Authentication & Security**: Secure cookie-based JWT sessions with role-based access control.
- 📊 **Operations Dashboard**: Real-time KPI summaries, stock health tracking, and recent activity feeds.
- 🏢 **Master Data**: Centralized management of clients, storage hubs, project sites, and measurement units.
- 📦 **Inventory & Asset Tracking**: Multi-warehouse stock tracking supporting both bulk consumables and serialized assets.
- 🔄 **Movement Ledger**: Transactional handling of supplier receipts, site dispatches, project returns, and physical cycle counts.
- 🚚 **Outbound Logistics**: Dispatch documentation, automated sequential Delivery Orders (DO), and package shipping labels.
- ⚙️ **System Settings**: Global threshold alerts and default logistics dispatch configurations.
- 🛡️ **Audit Logs**: Immutable administrative activity trails recording operational events.
- 📤 **Data Export**: Marked as *Coming Soon*.

---

## 🧭 Basic Workflow

```text
Authentication
   │
   ├── Master Data Setup (Clients, Warehouses, Projects, Units)
   │     │
   │     └── Inventory Catalog (Bulk & Serialized Items)
   │           │
   │           ├── Receipts & Intake (Opening Balances / Supplier Deliveries)
   │           │     │
   │           │     └── Outbound Logistics (Dispatches, Delivery Orders, Labels)
   │           │           │
   │           │           └── Asset Recovery (Project Returns to Hubs)
   │           │
   │           └── Cycle Counts & Stock Adjustments
   │
   └── Operations Dashboard & System Audit Logs
```

---

## 🔑 Environment Variables

The project uses `.env` configuration files. Reference [.env.example](.env.example) for baseline parameters:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `3000` |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/awms?schema=public` |
| `JWT_SECRET` | Secret key for signing session tokens | `awms-jwt-secret-placeholder-key-2026` |
| `FRONTEND_URL` | Allowed client origin for CORS | `http://localhost:5173` |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **PostgreSQL**: `15.x` &ndash; `17.x`

### 2. Installation & Setup
```bash
# Clone repository
git clone https://github.com/secretceremony/awms.git
cd awms

# Install dependencies
npm install

# Setup environment & database
cp .env.example backend/.env
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 3. Development Servers
```bash
# Run backend and frontend concurrently
npm run dev
```
- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### 4. Demo Credentials
- **Email**: `admin.logistics@alssa.com`
- **Password**: `securepassword123`

---

## 🧪 Testing & Production Builds

```bash
# Run unit tests
npm run test --workspace=backend

# Build production bundles
npm run build:backend
npm run build:frontend
```

---

## 📁 Repository Structure

```
awms/
├── frontend/             # React 19 Vite client application
├── backend/              # NestJS REST API server & Prisma schema
└── docs/                 # Operational & technical documentation
```

---

## 👥 Authors & Maintainers

- **Ansellma Tita Pakartiwuri Putri**
- GitHub: [@secretceremony](https://github.com/secretceremony)

---

## 🤝 Contributing

This is an internal enterprise application. Public pull requests are not accepted. Maintenance and updates are managed by authorized maintainers.

---

## 💬 Feedback & Support

For questions, issues, and bug reports, please open an issue in the [GitHub Issues](https://github.com/secretceremony/awms/issues) page.
