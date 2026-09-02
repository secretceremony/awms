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

AWMS (ALSSA Warehouse Management System) is an enterprise-grade web application built for Logistics Administrators and Warehouse Operators to manage technical equipment inventories, multi-hub allocations, outbound dispatches, Delivery Orders (DO), package Shipping Labels, and end-to-end transactional audit trails.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: NestJS v11 (Express-based modular monolith)
- **Database & ORM**: PostgreSQL 17 + Prisma ORM v7 (with `@prisma/adapter-pg` driver)
- **Styling**: Scoped corporate CSS variables (navy layouts, royal blue accents, print-optimized document layouts)

---

## ✨ Features

- 🔐 **Authentication & Session**: Secure HttpOnly cookie-based JWT sessions with role-based access control (`ADMIN` / `USER`).
- 📊 **Operations Dashboard**: Real-time KPI summaries, stock health indicators (Normal, Low Stock, Out of Stock, Under Repair, Deployed), quick operations, and recent dispatch/movement feeds.
- 🏢 **Master Data Management**:
  - **Clients**: Client company directory (`PHM` vs `OTHER`) with authorized contact persons.
  - **Warehouses & Cities**: Regional logistics storage hubs mapped to city codes (`BPN`, `JKT`, `SMD`).
  - **Projects**: Active and completed project sites linked to clients, site codes, and external reference numbers.
  - **Units of Measurement**: Standardized packaging units (`pcs`, `box`, `set`, `roll`, `meter`).
- 📦 **Inventory & Asset Tracking**:
  - Dual tracking modes: **Bulk** (quantity-based) and **Serialized** (unique serial numbers with conditions: `Standby Good`, `Standby Bad`, `Under Repair`).
  - **Initial Stock**: Rapid opening balance setup with "Save & Add Another" fast-entry workflow.
  - **Stock List**: Real-time warehouse and site inventory visibility with contextual adjustment actions.
- 🔄 **Stock Movement Engine**:
  - **Incoming**: External vendor/supplier receipts with waybill references.
  - **Project Return / Recheck**: Unified recovery of deployed bulk and serialized assets from project sites back into warehouse hubs with condition updates.
  - **Outgoing**: 2-step dispatch wizard allocating equipment from warehouse hubs to project sites.
  - **Adjustment**: Physical cycle count corrections and multi-serial condition adjustments in single atomic transactions.
  - **Movement History**: Immutable chronological audit ledger of all stock transactions.
- 🚚 **Outbound Logistics & Documentation**:
  - **Delivery Orders (DO)**: 2-step issuance wizard, mandatory Reference Number validation, concurrency-safe yearly sequence numbering (`[000]/ALS-[CITY]/DO-[CLIENTTYPE]/[ROMAN_MONTH]/[YEAR]`), frozen historical snapshots, and print-ready A4 landscape forms.
  - **Shipping Labels**: Package labels generated from issued Delivery Orders or standalone shipments with FRAGILE banners, customizable millimeter dimensions, and thermal/laser print styling.
- ⚙️ **System Settings**: Configurable global low-stock thresholds, default sender information, and default label sizes.
- 🛡️ **Audit Logs**: Immutable administrative audit trail tracking user operations with before/after payload deltas.
- 📤 **Data Export**: Marked as **Coming Soon** across inventory and ledger views.

---

## 🧭 Basic Workflow

```text
Login (Logistics Admin)
   │
   ├── Master Data Setup (Clients, Warehouses, Projects, Units)
   │     │
   │     └── Inventory Catalog Setup (Bulk & Serialized Items)
   │           │
   │           ├── Initial Stock / Incoming (Supplier Receipts)
   │           │     │
   │           │     └── Outgoing / Delivery Orders (Site Dispatch & DO Issue)
   │           │           │
   │           │           ├── Shipping Labels (Package Printing)
   │           │           │
   │           │           └── Project Returns (Recovering Site Assets to Warehouse)
   │           │
   │           └── Stock Adjustments & Physical Inventory Audits
   │
   └── Inspection & Governance (Operations Dashboard & Audit Logs)
```

---

## 🔑 Environment Variables

The project uses `.env` configuration files. Reference [.env.example](.env.example) for default templates:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `3000` |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/awms?schema=public` |
| `JWT_SECRET` | Secret key for signing session tokens | `awms-jwt-secret-placeholder-key-2026` |
| `JWT_EXPIRATION` | Session token lifetime | `8h` |
| `FRONTEND_URL` | Allowed client origin for CORS | `http://localhost:5173` |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **PostgreSQL**: `15.x` &ndash; `17.x`

### 2. Installation
```bash
# Clone repository
git clone https://github.com/secretceremony/awms.git
cd awms

# Install all monorepo dependencies
npm install
```

### 3. Database Migration & Seed
```bash
# Copy environment configuration
cp .env.example backend/.env

# Run Prisma migrations & seed demo dataset
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 4. Start Development Servers
```bash
# Run backend and frontend concurrently
npm run dev
```
- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### 5. Demo Credentials
Log in with the seeded Logistics Administrator account:
- **Email**: `admin.logistics@alssa.com`
- **Password**: `securepassword123`

---

## 🧪 Testing & Production Builds

```bash
# Run backend unit test suite
npm run test --workspace=backend

# Build production bundles
npm run build:backend
npm run build:frontend
```

---

## 📁 Repository Structure

```
awms/
├── frontend/             # React 19 + TypeScript + Vite SPA client
│   ├── src/
│   │   ├── components/   # Reusable UI, filters, modals, wizards, and print views
│   │   ├── pages/        # Dashboard, Master Data, Inventory, Delivery, Settings
│   │   └── api/          # Axios HTTP client configuration
├── backend/              # NestJS v11 REST API server
│   ├── src/              # Feature modules (Auth, Clients, Items, Movements, DO, Labels)
│   ├── prisma/           # Prisma schema, migrations, and seed scripts
│   └── test/             # Unit and integration test suites
└── docs/                 # Comprehensive technical & operational guides
```

---

## 📚 Documentation Archive

Detailed architecture, security, deployment, and operational guides are available in the [`docs/`](docs/) directory:

- 📖 [01 - System Overview](docs/01-SYSTEM-OVERVIEW.md)
- 👤 [02 - User Guide](docs/02-USER-GUIDE.md)
- 🛠️ [03 - Administrator Guide](docs/03-ADMIN-GUIDE.md)
- 📦 [04 - Inventory Workflow Guide](docs/04-INVENTORY-WORKFLOW.md)
- 🚚 [05 - Delivery Order Guide](docs/05-DELIVERY-ORDER-GUIDE.md)
- 🏷️ [06 - Shipping Label Guide](docs/06-SHIPPING-LABEL-GUIDE.md)
- 🗄️ [07 - Database & Data Dictionary](docs/07-DATABASE-AND-DATA-DICTIONARY.md)
- 🏗️ [08 - Architecture Guide](docs/08-ARCHITECTURE.md)
- 🚀 [09 - Deployment Guide](docs/09-DEPLOYMENT-GUIDE.md)
- 💾 [10 - Backup & Restore Guide](docs/10-BACKUP-RESTORE-GUIDE.md)
- 📜 [11 - Audit & Archive Guide](docs/11-AUDIT-AND-ARCHIVE-GUIDE.md)
- 🔧 [12 - Troubleshooting Guide](docs/12-TROUBLESHOOTING.md)
- 🔒 [13 - Security Guide](docs/13-SECURITY-GUIDE.md)

---

## ⚡ Technical Highlights

- **Atomic Stock Mutations**: All inventory transactions execute inside SQL `$transaction` boundaries to eliminate race conditions.
- **Strict Data Governance**: Master data referenced in historical transactions uses soft deactivation instead of destructive deletion.
- **Frozen Document Snapshots**: Issued Delivery Orders store immutable historical snapshots ensuring printed records remain 100% accurate over time.
- **Server-Side Pagination & Debounced Search**: Fast, responsive filtering across large inventory sets.

---

## 👥 Authors & Maintainers

- **Ansellma Tita Pakartiwuri Putri**
- GitHub: [@secretceremony](https://github.com/secretceremony)

---

## 🤝 Contributing

This is an internal-use enterprise application. Public pull requests are not accepted. Maintenance and updates are managed by authorized IT maintainers.

---

## 💬 Feedback & Support

For issues, bug reports, and feature requests, please open an issue in the [GitHub Issues](https://github.com/secretceremony/awms/issues) page.

---

## ❓ FAQ

**Q: Is AWMS production-ready?**  
A: Yes, the core inventory engine, Delivery Order lifecycle, Shipping Labels, and Dashboard are fully implemented and tested.

**Q: What database engine is supported?**  
A: PostgreSQL 15+ (accessed via Prisma ORM v7 with `@prisma/adapter-pg`).

**Q: How does AWMS track serialized equipment vs. bulk consumables?**  
A: Bulk consumables are tracked by total physical counts in `warehouse_stocks`, while serialized equipment is tracked individually in `item_serials` with distinct conditions (`Standby Good`, `Standby Bad`, `Under Repair`).

**Q: Can a Delivery Order be edited after issuance?**  
A: No. Once issued, a Delivery Order is a legally binding document and cannot be edited. Corrections are handled through Project Returns or Adjustments.
