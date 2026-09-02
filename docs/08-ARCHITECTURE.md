# 08 - Architecture Guide

This document describes the software architecture, design patterns, and operational boundaries of AWMS.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Frontend Client                      │
│        React 19 + TypeScript + Vite + Context API      │
└───────────────────────────┬────────────────────────────┘
                            │ REST APIs (JSON / Cookie Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Backend Server                      │
│             NestJS v11 (Modular Monolith)              │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────┐  │
│  │ Auth Guard   │  │ Mutation Engine  │  │ Audit    │  │
│  └──────────────┘  └──────────────────┘  └──────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Type-Safe Queries
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Prisma ORM v7                       │
│        Transaction Manager ($transaction boundaries)   │
└───────────────────────────┬────────────────────────────┘
                            │ SQL Connection Pool
                            ▼
┌────────────────────────────────────────────────────────┐
│                   PostgreSQL 17                        │
│            Relational Schema & Constraints             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Backend Modular Structure

The NestJS backend is organized into decoupled feature modules:

- **`AuthModule`**: Handles credential verification, JWT generation, and cookie management.
- **`CustomersModule` (Clients)**: Manages client directories and authorized contact persons.
- **`ProjectsModule`**: Project lifecycle, site codes, and client linkage.
- **`WarehousesModule` & `CitiesModule`**: Storage facility locations and regional routing.
- **`ItemsModule` & `UnitsModule`**: Catalog definition, serial asset queries, and measurement standards.
- **`StockMovementsModule`**: Core inventory mutation engine powering Initial Stock, Incoming, Outgoing, Returns, and Adjustments.
- **`DeliveryOrdersModule`**: DO draft preparation, concurrency-safe sequence allocation, issuance, and snapshot generation.
- **`ShippingLabelsModule`**: Package label generation, DO linkage, and print auditing.
- **`DashboardModule`**: Purpose-built high-performance database aggregation queries.
- **`SettingsModule`**: Global threshold and delivery parameter management.
- **`AuditLogsModule`**: Asynchronous administrative action logging.

---

## 3. Transaction Boundaries & Atomicity

In AWMS, **no stock mutation is permitted to occur in partial isolation**. Every operation that alters inventory balances must execute inside a Prisma interactive transaction (`$transaction`):

```typescript
return this.prisma.$transaction(async (tx) => {
  // 1. Verify availability of bulk and serialized assets
  // 2. Decrement source warehouse stock
  // 3. Increment destination project stock or update serial locations
  // 4. Record stock movement entry and movement item rows
  // 5. Commit or rollback atomically
});
```

If any validation fails (e.g. insufficient available stock, duplicate serial numbers, or inactive facilities), all preliminary database writes are rolled back immediately.
