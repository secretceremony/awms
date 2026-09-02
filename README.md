# AWMS — ALSSA Warehouse Management System

AWMS (ALSSA Warehouse Management System) is an enterprise-grade web application designed for Logistics Administrators and Warehouse Operators to manage material inventory, multi-hub allocations, outbound dispatch workflows, official Delivery Orders (DO), package Shipping Labels, and transactional audit trails.

---

## ✨ Features

- **Authentication & Security**: Secure HttpOnly cookie-based JWT sessions with role-based access control and audit logging.
- **Operations Dashboard**: Real-time KPI summaries, stock health tracking (Normal, Low Stock, Out of Stock, Under Repair, Deployed), quick operations, and recent dispatch ledgers.
- **Master Data Management**:
  - **Clients & Contacts**: Client directory (PHM vs Other) with authorized primary contacts.
  - **Warehouses & Cities**: Regional logistics hubs mapped to city codes (e.g. `BPN`, `JKT`, `SMD`).
  - **Projects**: Active and completed project contracts with site codes and external reference numbers.
  - **Units of Measurement**: Standardized packaging units (e.g. `pcs`, `box`, `set`, `roll`).
- **Inventory & Asset Tracking**:
  - Dual tracking modes: **Bulk** (quantity-based) and **Serialized** (unique serial numbers with conditions: `Standby Good`, `Standby Bad`, `Under Repair`).
  - **Initial Stock**: Rapid opening balance setup with "Save & Add Another" fast-entry.
  - **Stock List**: Real-time multi-warehouse and project site asset visibility with contextual adjustment actions.
- **Stock Movement Engine**:
  - **Incoming**: External vendor intake with receipt references.
  - **Project Return / Recheck**: Unified recovery of deployed bulk and serialized assets from project sites back into warehouse hubs with condition updates.
  - **Outgoing**: 2-step dispatch wizard allocating equipment from warehouse hubs to project sites.
  - **Adjustment**: Physical count adjustments and multi-serial condition modifications in single atomic transactions.
  - **Movement History**: Immutable chronological audit ledger of all stock mutations.
- **Outbound Logistics & Documentation**:
  - **Delivery Orders (DO)**: 2-step issuance wizard, strict mandatory Reference Number validation, concurrency-safe yearly sequence numbering (`[000]/ALS-[CITY]/DO-[CLIENTTYPE]/[ROMAN_MONTH]/[YEAR]`), frozen historical snapshots, and print-ready A4 landscape forms.
  - **Shipping Labels**: Package labels generated from issued Delivery Orders or standalone shipments with FRAGILE banners, customizable millimeter dimensions, and thermal/laser print styling.
- **System Settings**: Configurable low-stock thresholds, default sender information, and default label sizes.
- **Audit Logs**: Comprehensive administrative audit trail tracking user operations with before/after payload deltas.
- **Data Export**: Marked as **Coming Soon** across inventory and ledger tables.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: NestJS v11 (Express)
- **Database & ORM**: PostgreSQL 17, Prisma ORM v7
- **Styling**: Scoped CSS variables, clean corporate theme, print-ready document layouts

---

## 📁 Project Structure

```
awms/
├── frontend/             # React 19 Vite SPA client
│   ├── src/
│   │   ├── components/   # Reusable UI, filters, modals, and wizards
│   │   ├── pages/        # Dashboard, Master Data, Inventory, Delivery, Settings
│   │   └── api/          # Axios HTTP client configuration
├── backend/              # NestJS REST API server
│   ├── src/              # Feature modules (Auth, Clients, Items, Movements, DO, Labels)
│   ├── prisma/           # Prisma schema, migrations, and seed scripts
│   └── test/             # Unit and integration test suites
└── docs/                 # Comprehensive technical and operational guides
```

---

## 🚀 Quick Start & Setup

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **PostgreSQL**: `15.x` &ndash; `17.x`

### 2. Installation
```bash
# Clone repository and install dependencies
git clone https://github.com/secretceremony/awms.git
cd awms
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `backend/.env` and configure your local PostgreSQL database connection:
```bash
cp .env.example backend/.env
```
*(Reference [.env.example](.env.example) for sample parameters. Never commit real credentials to version control).*

### 4. Database Setup & Seeding
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 5. Start Development Servers
```bash
# Run backend and frontend concurrently
npm run dev
```
- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### 6. Production Build & Tests
```bash
# Build both frontend and backend bundles
npm run build:backend
npm run build:frontend

# Run unit tests
npm run test --workspace=backend
```

---

## 📚 Documentation Archive

Detailed operational procedures and architecture specifications are available in the [`docs/`](docs/) directory:

- [01 - System Overview](docs/01-SYSTEM-OVERVIEW.md)
- [02 - User Guide](docs/02-USER-GUIDE.md)
- [03 - Administrator Guide](docs/03-ADMIN-GUIDE.md)
- [04 - Inventory Workflow Guide](docs/04-INVENTORY-WORKFLOW.md)
- [05 - Delivery Order Guide](docs/05-DELIVERY-ORDER-GUIDE.md)
- [06 - Shipping Label Guide](docs/06-SHIPPING-LABEL-GUIDE.md)
- [07 - Database & Data Dictionary](docs/07-DATABASE-AND-DATA-DICTIONARY.md)
- [08 - Architecture Guide](docs/08-ARCHITECTURE.md)
- [09 - Deployment Guide](docs/09-DEPLOYMENT-GUIDE.md)
- [10 - Backup & Restore Guide](docs/10-BACKUP-RESTORE-GUIDE.md)
- [11 - Audit & Archive Guide](docs/11-AUDIT-AND-ARCHIVE-GUIDE.md)
- [12 - Troubleshooting Guide](docs/12-TROUBLESHOOTING.md)
- [13 - Security Guide](docs/13-SECURITY-GUIDE.md)
