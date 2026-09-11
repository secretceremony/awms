# AWMS — Company IT Handover & Maintenance Guide

This document is prepared specifically for the **PT ALSSA Corporindo** IT and logistics systems team. It provides a practical, direct reference for maintaining, operating, modifying, and safely extending the **Asset Warehouse Management System (AWMS)** after project handover.

---

## 1. System Maintenance Overview

AWMS is designed with standard, mature open-source technologies to minimize operational maintenance overhead:

- **Frontend**: React 19 Single Page Application bundled with Vite. Static build output (`frontend/dist`) can be served via Nginx, Caddy, or any static HTTP web server.
- **Backend**: NestJS 11 Node.js application running in production with PM2 or Docker.
- **Database**: PostgreSQL 15–17 hosted on cloud VPS or local on-premise server.
- **Data Safety**: Database connection pooling, parameterized Prisma ORM queries, foreign key cascade constraints, and automated transaction rollback (`tx`).

### Routine IT Maintenance Checklist
1. **Periodic Database Dumps**: Run scheduled PostgreSQL backups (e.g. `pg_dump -U postgres -d awms -Fc -f awms_weekly.dump`).
2. **Disk Space Monitoring**: Monitor database disk space and server logs (`backend/dist` logs, PM2 error logs).
3. **Session Secret Rotation**: Ensure `JWT_SECRET` in `backend/.env` is kept secure and changed if an administrator account is compromised.
4. **Prisma Schema Drift**: Never edit database schema directly in SQL without recording a corresponding Prisma migration (`npx prisma migrate dev`).

---

## 2. Common Feature Modification Locations

When business logic or operational requirements change, use this cheat-sheet to locate the relevant files:

### 2.1 Inventory Workflow & Stock Mutations
- **Backend Service**: `backend/src/stock-movements/stock-movements.service.ts`
  - `createMovement`: Inbound receiving (`INCOMING`) & project returns (`RETURN`).
  - `createOutgoing`: Dispatching materials to client project sites.
  - `createAdjustment`: Cycle counts and physical discrepancy corrections.
- **Frontend Pages**:
  - Stock Balances: `frontend/src/pages/Inventory/StockList.tsx`
  - Inbound Receiving: `frontend/src/pages/Inventory/Incoming.tsx`
  - Dispatch Operations: `frontend/src/pages/Inventory/Outgoing.tsx`
  - Audit History: `frontend/src/pages/Inventory/MovementHistory.tsx`
- **Domain Modals**:
  - `frontend/src/components/common/AddIncomingModal.tsx`
  - `frontend/src/components/common/AddOutgoingModal.tsx`
  - `frontend/src/components/common/AdjustmentModal.tsx`

### 2.2 Delivery Orders (DO) & Shipping Labels
- **Backend Service**: `backend/src/delivery-orders/delivery-orders.service.ts`
  - DO Numbering generation format: `XXX/ALS-[CITY]/DO-[CLIENT]/[MONTH]/[YEAR]`
  - Document Snapshot serialization: `fullSnapshot` in `issueDeliveryOrder()`
- **Shipping Label Service**: `backend/src/shipping-labels/shipping-labels.service.ts`
- **Frontend Pages & Modals**:
  - Delivery Order Dashboard: `frontend/src/pages/Delivery/Orders.tsx`
  - Official DO Print Page: `frontend/src/pages/Delivery/Print.tsx`
  - Shipping Labels View: `frontend/src/pages/Delivery/Labels.tsx`
  - Modals: `frontend/src/components/common/DeliveryOrderFormModal.tsx`, `frontend/src/components/common/ShippingLabelFormModal.tsx`
- **Print Stylesheets**: `frontend/src/styles/print.css`, `frontend/src/styles/delivery.css`

### 2.3 Reports & Exports
- **Backend Service**: `backend/src/exports/exports.service.ts`
  - Multi-sheet operational monthly report (`generateMonthlyReport`)
  - Full system workbook backup export (`generateWorkbook`)
- **Frontend Controller**: `frontend/src/pages/Reports.tsx`
- **Report Quick Modal**: `frontend/src/components/common/MonthlyReportModal.tsx`
- **Year Calculation Utility**: `frontend/src/utils/datetime.ts` (`getAvailableReportYears`)

### 2.4 Roles, Guards & Permissions
- **Database Role Definition**: `backend/prisma/schema.prisma` (`enum Role { SUPER_ADMIN, ADMIN, READ_ONLY }`)
- **Backend Authorization Guards**:
  - JWT Guard: `backend/src/auth/auth.guard.ts`
  - Role Decorator & Guard: `backend/src/common/guards/roles.guard.ts`, `backend/src/common/decorators/roles.decorator.ts`
- **Frontend Permission Matrix**: `frontend/src/utils/permissions.ts`
  - Defines `ROLE_PERMISSIONS` dictionary and helper checkers (`canManageInventory`, `canViewReports`, etc.).
- **Route Access Protection**: `frontend/src/components/ProtectedRoute.tsx`

### 2.5 Master Data (Clients, Projects, Warehouses, Cities, Units)
- **Backend Controllers/Services**:
  - Clients & Contacts: `backend/src/customers/`
  - Projects: `backend/src/projects/`
  - Warehouses: `backend/src/warehouses/`
  - Cities: `backend/src/cities/`
  - Units: `backend/src/units/`
  - Items & Serials: `backend/src/items/`, `backend/src/item-serials/`
- **Frontend Pages**:
  - `frontend/src/pages/Clients.tsx`
  - `frontend/src/pages/Projects.tsx`
  - `frontend/src/pages/Warehouses.tsx`
  - `frontend/src/pages/Cities.tsx`
  - `frontend/src/pages/Units.tsx`

---

## 3. Guideline: Adding New Features

Follow this standard workflow when adding new capabilities:

```
[1. Update Prisma Schema] ──► [2. Run Migration] ──► [3. Backend DTO & Service]
                                                              │
                                                              ▼
[6. Verify Build & Tests] ◄── [5. Frontend Route/Page] ◄── [4. Controller & Guards]
```

1. **Schema Update**: If adding fields or tables, modify `backend/prisma/schema.prisma`.
2. **Apply Migration**: Run `npx prisma migrate dev --name <descriptive_change_name>` from `/backend`.
3. **Backend DTO**: Create or update Data Transfer Objects with `class-validator` rules to protect against invalid data types.
4. **Service & Transaction**: Implement business logic. If mutating multiple tables (e.g. updating serial status + recording movement), always wrap inside `this.prisma.$transaction(async (tx) => { ... })`.
5. **Controller & Permissions**: Protect endpoints with `@Roles('SUPER_ADMIN', 'ADMIN')` as required.
6. **Frontend Integration**:
   - Add fetch method in `frontend/src/api/`.
   - Build UI using shared components (`frontend/src/components/ui/`).
   - Register route in `frontend/src/App.tsx` and sidebar link in `frontend/src/components/DashboardLayout.tsx`.

---

## 4. Database Modification Workflow

To keep database schemas stable and repeatable across staging and production environments:

### Safe Migration Steps
```bash
cd backend

# Step 1: Verify current migration status
npx prisma migrate status

# Step 2: Create and apply a new migration locally
npx prisma migrate dev --name describe_change

# Step 3: Re-generate Prisma Client types
npx prisma generate
```

### Applying Migrations on Production Server
On the production server, **never** run `prisma migrate dev`. Use `migrate deploy`:
```bash
cd backend
npx prisma migrate deploy
```
This safely executes pending migrations without resetting data or generating development artifacts.

---

## 5. Pre-Deployment Testing Checklist

Always execute this verification checklist before deploying code updates to production:

- [ ] **Backend Test Suite**: Run `npm test --workspace=backend` (all Jest test suites must pass).
- [ ] **Frontend Build**: Run `npm run build:frontend` (Vite + TypeScript compile check with zero type errors).
- [ ] **Full Monorepo Build**: Run `npm run build` from the root directory.
- [ ] **Environment Check**: Confirm `.env` parameters (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`) are valid for the target server.
- [ ] **Transactional Verification**: Test that creating an Outgoing movement decrements warehouse stock and creates an immutable StockMovement record.
- [ ] **Document Printing**: Test browser print dialog on a Delivery Order (A4) and Shipping Label (100x150mm) to verify layout rendering.
- [ ] **Role Isolation**: Verify that logging in with a `READ_ONLY` account disables mutation buttons and hides restricted sidebar tabs.
