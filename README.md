# AWMS — ALSSA Warehouse Management System

[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.2-purple?logo=vite)](https://vite.dev)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red?logo=nestjs)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-teal?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue?logo=postgresql)](https://postgresql.org)
[![Status](https://img.shields.io/badge/Status-Work--In--Progress-orange)](#)

AWMS (ALSSA Warehouse Management System) is an enterprise-grade web application built to help Logistics Administrators track inventory, handle incoming/outgoing stock movements, generate Delivery Orders (DO), print shipping labels, and inspect system audit logs.

> [!NOTE]
> This project is currently under active development. Some WMS functional modules are scaffolded and will be progressively completed.

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: NestJS (v11) with Express
- **Database & ORM**: PostgreSQL + Prisma ORM (v7)
- **Styling**: Modern light-theme CSS scoped modules (navy layouts, corporate blue accents)

---

## ✨ Features

- **Authentication**: Secure HttpOnly cookie JWT-based session persistence.
- **Dashboard**: High-level inventory KPIs, low-stock flags, and stats widgets.
- **Unit Management**: Custom unit of measurements (UoM) configurations.
- **Multi-Warehouse Management**: Tracking of warehouse assets and status codes.
- **Mitra / Customer Management**: Administration of delivery consignees.
- **Project Management**: Binding of stocks and delivery requirements to specific corporate projects.
- **Inventory Management**:
  - Support for **Bulk** and **Serialized** tracking types.
  - Tracking of unique serial numbers (`item_serials`) for serialized assets.
- **Initial Stock & Incoming**: Recording initial balances and incoming batches.
- **Ledger movements**: Atomic transactional balance adjustment ledger (`stock_movements`).
- **Delivery Orders (DO)**: Sequential automatic DO number generator.
- **Outgoing & Returns**: Logically managing product issues and returns.
- **Shipping Labels**: Carrier label layouts matching shipments.
- **Activity & Audit Logs**: Detailed user transaction records with `old_values` and `new_values` tracking.
- **Database Backup**: Scripts and documentation for DB dump/restore schedules.

---

## 🔑 Environment Variables

The project uses `.env` files separated by workspace packages. Reference [.env.example](.env.example) for baseline placeholders:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend application port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://mac@localhost:5432/awms?schema=public` |
| `JWT_SECRET` | Secret key for signing session tokens | `awms-jwt-secret-placeholder-key-2026` |
| `FRONTEND_URL` | CORS allowed origin client domain | `http://localhost:5173` |

---

## 📥 Installation

1. Install project dependencies for both workspaces:
   ```bash
   npm install
   ```

2. Copy the `.env` example template to backend:
   ```bash
   cp .env.example backend/.env
   ```
   *(Ensure to edit `backend/.env` with your actual local PostgreSQL database credentials)*

3. Generate the Prisma Client wrapper:
   ```bash
   npx prisma generate --workspace=backend
   ```

---

## 🚀 Running Locally

### 1. Database Migrations & Seeding
Configure your local PostgreSQL server to run on port `5432` with a database named `awms`, then run:
```bash
# In backend workspace
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 2. Start Development Servers
Run the NestJS backend and Vite frontend concurrently from the root directory:
```bash
npm run dev
```
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

### 3. Development Credentials
Use the seeded Logistics Admin credentials to log in:
- **Email**: `admin.logistics@alssa.com`
- **Password**: `securepassword123`

---

## 🧭 Basic Flow Usage

```text
Login with Admin Credentials
   └── Manage Master Data (Warehouses, Items, Projects)
         └── Post Stock Movements (Initial, Incoming, Adjustment)
               └── Create Delivery Orders (Pending / Draft)
                     └── Issue Shipments (Outgoing / Shipped status)
                           └── Print Shipping Labels / Monitor Logs
```

---

## 🧪 Running Tests & Build Checks

To verify project type safety, compiler builds, and linters:

```bash
# Run backend tests
npm run test --workspace=backend

# Run project linter checks
npm run lint

# Build production releases
npm run build
```

---

## 📦 Deployment

- **Deployment Status**: Internal-use corporate tool. No public deployment exists.
- **Production URL**: Not set up.
- **Dockerization**: No Docker configurations are currently integrated.

---

## 📂 Documentation

- **Database Maintenance**: Backup & restore steps are documented in [BACKUP.md](BACKUP.md).

---

## 🎯 Development Roadmap

1. **Unit**: Standardize measurement units.
2. **Warehouse**: Scaffold warehouse status and locations.
3. **Customer**: Consignee details administration.
4. **Project**: Binding inventories to corporate projects.
5. **Inventory / Serial / Initial Stock**: Initializing serialized/bulk items.
6. **Incoming**: Processing product receipts.
7. **History / Adjustment**: Inventory ledger balances audit.
8. **Delivery Order**: Formulating cargo receipts.
9. **Outgoing**: Moving stock out of active inventory.
10. **Return / Recheck**: Logging product returns.
11. **Shipping Label**: Delivery package layouts.
12. **Dashboard**: High-level visual metrics.
13. **Export**: Exporting lists to Excel/PDF.
14. **Settings / Audit Log**: Managing configurations and activity trails.
15. **Final QA**: Production deployment checks.

---

## ⚡ Technical Optimizations (Underway)

- **Atomic Stock Ledger**: Mutates stock levels and registers movement logs inside SQL `$transaction` boundaries to avoid race conditions.
- **Soft Deletes**: Active status checks prevent hard-deleting items linked to historical ledger movements.
- **Server-Side Pagination**: Implemented using skip/take limits for audit log and item search queries.
- **Database Indexing**: Configured index maps on foreign keys (`warehouseId`, `projectId`, `itemId`) for quick query execution.

---

## 🧠 Engineering Focus

Key development priorities:
- **Stock Consistency**: Absolute balance alignment across bulk/serialized tables.
- **Transaction Integrity**: Automatic rollbacks on partial failures.
- **Historical Durability**: Read-only ledger rows with zero hard-deletes.

---

## 👥 Authors

- **Ansellma Tita Pakartiwuri Putri**
- GitHub: [@secretceremony](https://github.com/secretceremony)

---

## 🤝 Contributing

This is an internal-use corporate application. Public pull requests are not accepted. Maintenance and updates are managed by authorized IT maintainers.

---

## 💬 Feedback & Support

For issues, bug reports, and features requests, please open an issue in the [GitHub Issues](https://github.com/secretceremony/awms/issues) page.

---

## ❓ FAQ

**Q: Is AWMS production-ready?**  
A: No, the system is in active development status.

**Q: Is there a public online demo?**  
A: No public online demo is available at this stage.

**Q: What database engine is supported?**  
A: PostgreSQL (accessed via Prisma ORM client).

**Q: Does it support unique barcode tracking?**  
A: Yes, items marked as `SERIALIZED` are tracked with unique individual serial numbers.
