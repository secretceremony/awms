# AWMS

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-darkred?style=flat-square)](LICENSE)

AWMS (ALSSA Warehouse Management System) is an operational logistics and inventory execution platform designed for warehouse administrators to track physical stock, manage serialized assets, coordinate dispatches, and issue delivery documentation.

---

## ✨ Features

- 📊 **Operations Dashboard**: Real-time KPI summaries, stock health tracking, and recent activity feeds.
- 🏢 **Master Data**: Centralized management of clients, storage hubs, project sites, and measurement units.
- 📦 **Inventory & Asset Tracking**: Multi-warehouse stock tracking supporting both bulk consumables and serialized assets.
- 🔄 **Movement Ledger**: Transactional handling of supplier receipts, site dispatches, project returns, and physical cycle counts.
- 🚚 **Outbound Logistics**: Dispatch documentation, automated sequential Delivery Orders (DO), and package shipping labels.
- ⚙️ **System Settings**: Global threshold alerts and default logistics dispatch configurations.
- 🛡️ **Audit Logs**: Immutable administrative activity trails recording operational events.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: NestJS v11 (Express)
- **Database & ORM**: PostgreSQL 17, Prisma ORM v7
- **Styling**: Single global CSS design system, responsive layouts, print-ready document views

---

## 📁 Project Structure

```
awms/
├── frontend/             # React 19 Vite client application
├── backend/              # NestJS REST API server & Prisma schema
└── archive/              # Packaged project documentation archive
```

---

## 🚀 Setup & Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS)
- **PostgreSQL**: `15.x` &ndash; `17.x`

### 2. Installation & Database Migration
```bash
# Clone repository
git clone https://github.com/secretceremony/awms.git
cd awms

# Install dependencies
npm install

# Configure environment & database
cp .env.example backend/.env
# (Configure your local database credentials and SEED_ADMIN_PASSWORD in backend/.env)

cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 3. Running Development Servers
```bash
# Run backend and frontend concurrently
npm run dev
```
- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### 4. Testing & Production Builds
```bash
# Run unit tests
npm run test --workspace=backend

# Build production bundles
npm run build:backend
npm run build:frontend
```

---

## 📦 Documentation Archive

Complete architectural specifications, design system contracts, and rule definitions are packaged in the repository:
* `archive/AWMS-Project-Documentation.zip`

---

## ⏳ Coming Soon

- 📤 **Data Export Engine**: CSV and XLSX tabular exports across Stock List, Movement History, and Delivery Orders.

---

## 👥 Authors & Maintainers

- **Ansellma Tita Pakartiwuri Putri**
- GitHub: [@secretceremony](https://github.com/secretceremony)

---

## 📄 License

This software and associated documentation files are proprietary and confidential to ALSSA. Unauthorized copying, modification, or distribution is strictly prohibited.
