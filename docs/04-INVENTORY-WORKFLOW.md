# 04 - Inventory Workflow Guide

This document defines the technical and operational inventory movement lifecycle within AWMS.

---

## 1. Inventory Movement Types

```
                         ┌─────────────────────────┐
                         │    Vendor / External    │
                         └───────────┬─────────────┘
                                     │
                          INCOMING   │   INITIAL (Opening)
                                     ▼
                         ┌─────────────────────────┐
                         │     Warehouse Hub       │◄────────────┐
                         │ (warehouse_stocks /     │             │
                         │  item_serials in WH)    │             │
                         └───────────┬─────────────┘             │
                                     │                           │
                            OUTGOING │                           │ RETURN
                           (via DO)  │                           │ (via Incoming UI)
                                     ▼                           │
                         ┌─────────────────────────┐             │
                         │      Project Site       │─────────────┘
                         │ (project_stocks /       │
                         │  item_serials in Proj)  │
                         └─────────────────────────┘
```

---

## 2. Detailed Movement Specifications

### 2.1 INITIAL (Opening Balances)
- **Source**: External / Opening Balance.
- **Destination**: Specific Warehouse Hub.
- **Database Effects**:
  - Bulk: Creates or increments `warehouse_stocks.quantity`.
  - Serialized: Creates `item_serials` with `currentWarehouseId = destWarehouseId`, `currentProjectId = null`, and `state = STANDBY_GOOD` (or specified condition).
  - Movement Record: Creates `stock_movements` with `movementType = 'INITIAL'`.

### 2.2 INCOMING (External Vendor Intake)
- **Source**: External Supplier / Vendor (with external Reference Number).
- **Destination**: Specific Warehouse Hub.
- **Database Effects**:
  - Bulk: Increments `warehouse_stocks.quantity`.
  - Serialized: Creates new `item_serials` in the designated warehouse hub.
  - Movement Record: Creates `stock_movements` with `movementType = 'INCOMING'`.

### 2.3 OUTGOING (Warehouse to Project Dispatch)
- **Source**: Source Warehouse Hub.
- **Destination**: Active Project Site.
- **Prerequisites**: Target project must be `ACTIVE`; selected stock must be available in the source warehouse.
- **Database Effects**:
  - Bulk: Decrements `warehouse_stocks.quantity` and increments `project_stocks.quantity`.
  - Serialized: Relocates `item_serials` (`currentWarehouseId = null`, `currentProjectId = project.id`, `state = 'DEPLOY'`).
  - Movement Record: Creates `stock_movements` with `movementType = 'OUTGOING'` (optionally linked to `deliveryOrderId`).

### 2.4 RETURN (Project to Warehouse Recovery)
- **Source**: Active or Completed Project Site.
- **Destination**: Destination Warehouse Hub.
- **User Interface**: Managed directly inside **Inventory &rarr; Incoming** by selecting `[ Project Return / Recheck ]`.
- **Database Effects**:
  - Bulk: Decrements `project_stocks.quantity` and increments `warehouse_stocks.quantity`.
  - Serialized: Relocates `item_serials` (`currentProjectId = null`, `currentWarehouseId = destWarehouseId`), updates condition (`Standby Good`, `Standby Bad`, `Under Repair`) and state (`STANDBY_GOOD`, `STANDBY_BAD`, `UNDER_REPAIR`).
  - Movement Record: Creates `stock_movements` with `movementType = 'RETURN'`.

### 2.5 ADJUSTMENT (Stocktaking & Condition Correction)
- **Source / Destination**: Target Warehouse Hub.
- **Database Effects**:
  - Bulk: Mutates `warehouse_stocks.quantity` by delta (+/-).
  - Serialized: Updates individual serial conditions and states in place without shifting physical quantities.
  - Movement Record: Creates `stock_movements` with `movementType = 'ADJUSTMENT'`.

---

## 3. Database Sources of Truth

| Category | Source of Truth | Verification Query / Logic |
| :--- | :--- | :--- |
| **Bulk Stock (Warehouse)** | `warehouse_stocks` table | `SELECT SUM(quantity) FROM warehouse_stocks WHERE item_id = X AND warehouse_id = Y` |
| **Bulk Stock (Project)** | `project_stocks` table | `SELECT SUM(quantity) FROM project_stocks WHERE item_id = X AND project_id = Y` |
| **Serialized Stock (Warehouse)** | `item_serials` table | `SELECT COUNT(*) FROM item_serials WHERE item_id = X AND current_warehouse_id = Y` |
| **Serialized Stock (Project)** | `item_serials` table | `SELECT COUNT(*) FROM item_serials WHERE item_id = X AND current_project_id = Y` |

---

## 4. Transactional Atomicity Rule

All stock mutations execute inside Prisma `$transaction` blocks. If any step fails (e.g. insufficient available stock, duplicate serial number, inactive warehouse, missing project reference), the entire operation rolls back automatically to protect ledger consistency.
