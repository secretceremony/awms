# AWMS (Asset Warehouse Management System)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-darkred?style=flat-square)](LICENSE)

**AWMS (Asset Warehouse Management System)** is an integrated operational logistics and inventory execution platform developed for **PT ALSSA Corporindo**. The system provides multi-warehouse stock visibility, serialized equipment lifecycle tracking, transactional stock movements, sequential Delivery Order (DO) issuance with immutable document snapshots, and multi-sheet operational Excel reporting.

---

## 📖 Table of Contents

- [System Overview](#-system-overview)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [User Roles & Permissions](#-user-roles--permissions)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Running Instructions](#-running-instructions)
- [Documentation Links](#-documentation-links)
- [Future Improvements](#-future-improvements)
- [Authors & Maintainers](#-authors--maintainers)

---

## 🌐 System Overview

Before AWMS, warehouse receipts, project dispatch allocations, and returns were coordinated using manual spreadsheets. AWMS provides:
- **Centralized Ledger**: Every inventory change is an immutable event (`StockMovement`) linked to an operator, location, date, and project destination.
- **Dual Tracking Modality**: Supports both consumable bulk materials (quantified balances) and high-value serialized equipment (individual serial life-cycle states: `STANDBY_GOOD`, `DEPLOY`, `STANDBY_DEFECTIVE`, `SCRAP`).
- **Official Delivery Orders**: Generates official sequential Delivery Orders (`XXX/ALS-[CITY]/DO-[CLIENT]/[MONTH]/[YEAR]`) with legal document snapshots ensuring historic accuracy regardless of future master data edits.
- **Physical Dispatch Support**: Automated thermal package shipping labels (`100x150mm`) with fragile handling indicators.

---

## ✨ Key Features

- 📊 **Operations Dashboard**: Real-time KPI summaries, stock health monitoring, low-stock threshold indicators, and recent movement activity streams.
- 📦 **Multi-Warehouse Stock Management**: Live balances across regional storage hubs (e.g. Balikpapan Hub, Jakarta Hub, site storage).
- 🔄 **Movement Ledger**: Transactional handling of Inbound Receiving (`INCOMING`), Project Site Dispatches (`OUTGOING`), Demobilization (`RETURN`), and Cycle Counts (`ADJUSTMENT`).
- 🚚 **Delivery Order Engine**: Draft editing, validation, sequential numbering, and print-ready PDF/browser document views.
- 🏷️ **Thermal Shipping Labels**: Standalone and DO-linked shipping label generation with formatted sender/recipient blocks.
- 📑 **Master Data Catalog**: Dedicated standalone management of Clients, Projects, Warehouses, Cities, and Units.
- 📈 **Operational Reports & Exports**: Dynamic monthly inventory movement workbooks (6 sheets) and full system data backup exports (.xlsx).
- 🛡️ **Audit Logs & Security**: Role-based access control, HttpOnly authentication cookies, and sanitized administrative activity logs.

---

## 🏛️ Architecture Overview

AWMS is designed as a decoupled full-stack TypeScript application:

```
[ Frontend (React 19 + Vite) ] 
       │  HTTP / REST (JSON) + HttpOnly JWT Cookie
       ▼
[ Backend (NestJS 11 + Prisma ORM 7) ]
       │  pg Connection Pool
       ▼
[ Database (PostgreSQL 17) ]
```

- **Frontend**: SPA built with React 19 and Vite. Navigation is structured into five core business domains: **Operations**, **Deliveries**, **Master Data**, **Reports**, and **System**.
- **Backend**: NestJS application with modular domain encapsulation, validation pipes, global exception filters, and interactive Prisma database transactions.
- **Database**: PostgreSQL schema with foreign keys, composite unique constraints, and sequence tables.

---

## 👥 User Roles & Permissions

AWMS enforces three distinct operational roles:

| Role | Operational Scope | Access Privileges |
| :--- | :--- | :--- |
| **`SUPER_ADMIN`** | IT Administrators / System Owners | Full system access: User Management, Activity Logs, System Settings, Master Data, Inventory Mutations, Delivery Orders, and Exports. |
| **`ADMIN`** | Warehouse & Logistics Officers | Day-to-day operations: Execute stock movements, issue delivery orders, manage master data items/clients/warehouses, and generate reports. |
| **`READ_ONLY`** | Management / Auditors / Viewers | Inspection only: View dashboards, browse stock lists, movement history, and issued delivery orders. Cannot mutate data. |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Tooling**: Vite 8.2, Oxlint
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Document Rendering**: Pure CSS print styles & `html2pdf.js`

### Backend
- **Framework**: NestJS 11 (Express platform)
- **Language**: TypeScript (Node.js 20+ LTS)
- **Authentication**: JWT (`@nestjs/jwt`), `cookie-parser`, `bcryptjs`
- **Validation**: `class-validator`, `class-transformer`
- **Spreadsheet Engine**: `exceljs`

### Database & Storage
- **Database**: PostgreSQL 15–17
- **ORM & Client**: Prisma ORM 7 (`@prisma/adapter-pg`)

---

## 📁 Project Structure

```
awms/
├── docs/                     # Technical architecture & maintenance guides
│   ├── SYSTEM_DESIGN.md      # Deep-dive system architecture, workflows, and decisions
│   ├── DATABASE_DESIGN.md    # ERD diagram, tables, and relationship rules
│   ├── DEVELOPMENT_GUIDE.md  # Local setup, migration, testing, and debugging
│   ├── HANDOVER_GUIDE.md     # IT maintenance and feature modification guide
│   └── DEPLOYMENT_GUIDE.md   # Production hosting, Nginx proxy, and Docker deployment
├── frontend/                 # React 19 Vite client application
│   ├── Dockerfile            # Multi-stage production Nginx container
│   ├── nginx.conf            # SPA routing & API reverse proxy configuration
│   └── src/                  # Components, pages, and modular styles
├── backend/                  # NestJS REST API server
│   ├── Dockerfile            # Multi-stage production Node.js container
│   ├── prisma/               # Prisma schema and comprehensive seed script
│   └── src/                  # Feature domain modules (stock-movements, delivery-orders, etc.)
├── docker-compose.yml        # Multi-container orchestration (PostgreSQL + API + Frontend)
├── .env.example              # Environment variables template
└── package.json              # Monorepo workspace configuration
```

---

## ⚡ Quick Start (Docker)

To run the entire platform immediately with zero host dependencies:

```bash
# 1. Clone repository & enter directory
git clone https://github.com/secretceremony/awms.git
cd awms

# 2. Prepare environment file
cp .env.example .env

# 3. Build & start all containers
docker compose up -d --build

# 4. Apply database schema and seed initial users
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

- **Web Application**: [http://localhost](http://localhost)
- **API Health**: [http://localhost:3000](http://localhost:3000)

Default Super Admin Login:
- **Email**: `admin.logistics@alssa.com`
- **Password**: `AlssaAdmin2026!`

---

## 🚀 Local Development (Without Docker)

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **npm**: `v10.x` or later
- **PostgreSQL**: `15.x` – `17.x`

### Setup & Running
```bash
# 1. Install dependencies across both workspaces
npm install

# 2. Configure backend environment
cp .env.example backend/.env
# (Configure your local DATABASE_URL in backend/.env)

# 3. Initialize database
cd backend
npx prisma migrate dev --name init
npx prisma generate
npm run seed
cd ..

# 4. Start frontend and backend concurrently
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### Testing & Builds
```bash
# Run backend test suite
npm test --workspace=backend

# Build production bundles
npm run build
```

---

## 📚 Documentation

Comprehensive technical documentation for developers, IT maintainers, and system operators:

| Document | Purpose & Scope | Link |
| :--- | :--- | :---: |
| **System Design** | Architecture, workflows, component layers, and core design rationale | [Read System Design](docs/SYSTEM_DESIGN.md) |
| **Database Design** | Entity Relationship Diagram (ERD), tables, and business invariants | [Read Database Design](docs/DATABASE_DESIGN.md) |
| **Development Guide** | Local workstation setup, test execution, migrations, and debugging | [Read Development Guide](docs/DEVELOPMENT_GUIDE.md) |
| **Handover Guide** | IT routine maintenance, feature modification cheat-sheet, and safety checks | [Read Handover Guide](docs/HANDOVER_GUIDE.md) |
| **Deployment Guide** | Production hosting options: Docker, Nginx reverse proxy, and SSL setup | [Read Deployment Guide](docs/DEPLOYMENT_GUIDE.md) |

---

## 🔮 Future Improvements

1. **Barcode & QR Scanner Integration**: Direct camera scanning for hardware serial barcodes during inbound and dispatch verification.
2. **Automated Low-Stock Email Notifications**: Scheduled dispatch of reorder reminders when bulk materials drop below warning thresholds.
3. **Advanced Role Customization**: Granular capability toggles per user account beyond the three standard role presets.

---

## 👥 Authors & Maintainers

- **Ansellma Tita Pakartiwuri Putri**
- Project Repository: [https://github.com/secretceremony/awms](https://github.com/secretceremony/awms)
- Developed for **PT ALSSA Corporindo** (Internship Handover).

---

## 📄 License

This software and associated documentation files are proprietary and confidential to **PT ALSSA Corporindo**. Unauthorized copying, distribution, or commercial reuse is strictly prohibited.

