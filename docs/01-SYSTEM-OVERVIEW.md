# 01 - System Overview

## 1. Executive Summary

**AWMS (ALSSA Warehouse Management System)** is an industrial-grade warehouse management and outbound logistics execution platform. Designed specifically for technical logistics operators and logistics administrators, AWMS facilitates end-to-end material tracking—from initial opening balances, vendor intake, and site dispatches, to project returns, condition adjustments, delivery order issuance, and package shipping labels.

---

## 2. Core User Roles

AWMS is designed around centralized logistics administration:

- **Logistics Administrator / Warehouse Operator**: Responsible for day-to-day intake (Incoming), dispatching items to project sites (Outgoing), executing physical stocktaking adjustments (Adjustment), issuing official Delivery Orders (DO), and generating package Shipping Labels.
- **System Administrator**: Manages master data (Clients, Warehouses, Projects, Cities, Units of Measurement), configures global inventory thresholds and default shipping details, and inspects the immutable system Audit Logs.

---

## 3. Implemented Functional Modules

1. **Authentication & Session Management**: Secure HttpOnly cookie-based JWT sessions with inactivity handling.
2. **Operations Dashboard**: Real-time KPI summaries, stock health indicators, quick operations, recent inventory movements, and recent delivery orders.
3. **Master Data**:
   - **Clients**: Client company directory (PHM vs OTHER) with contact persons.
   - **Warehouses**: Regional logistics hubs tied to city codes.
   - **Projects**: Active and completed project contracts linked to clients, site codes, and external reference numbers.
   - **Cities & Units**: Configurable city codes and units of measurement.
4. **Inventory Management**:
   - **Item Masters**: Equipment catalog with explicit tracking types (Bulk vs Serialized).
   - **Stock List**: Real-time warehouse and project inventory levels with condition statuses.
   - **Initial Stock**: Rapid multi-item opening balance setup.
5. **Stock Movements & Ledger**:
   - **Incoming**: External vendor/supplier receipts.
   - **Project Return / Recheck**: Unified intake of surplus or recovered equipment from active/completed project sites back into warehouse hubs with condition updates.
   - **Outgoing**: Direct material allocation and dispatch from warehouse hubs to project sites.
   - **Adjustment**: Physical stocktake corrections and batch multi-serial condition modifications.
   - **Movement History**: Immutable audit ledger recording every inventory transaction.
6. **Outbound Logistics & Dispatch**:
   - **Delivery Orders (DO)**: 2-step issuance wizard, sequential yearly numbering (`[000]/ALS-[CITY]/DO-[CLIENTTYPE]/[ROMAN_MONTH]/[YEAR]`), immutable snapshots, and print-ready A4 landscape forms.
   - **Shipping Labels**: Package labels generated from issued delivery orders or standalone shipments with FRAGILE banners, customizable dimensions, and print-ready package styling.
7. **System Settings**: Configurable low-stock thresholds, default sender information, and default label sizes.
8. **Audit Logs**: Immutable trail of administrative actions capturing entity changes, user IDs, and timestamps.
9. **Export**: Marked as **Coming Soon** across inventory and ledger interfaces.

---

## 4. Fundamental Inventory Concepts

### 4.1 Bulk vs. Serialized Tracking

| Dimension | Bulk Tracking | Serialized Tracking |
| :--- | :--- | :--- |
| **Identity** | Quantity count per SKU (e.g. 500 pcs connectors) | Unique serial number per unit (e.g. `SN-RTR-09218`) |
| **Location State** | Stored in `warehouse_stocks` and `project_stocks` tables | Stored on `item_serials` (`currentWarehouseId` or `currentProjectId`) |
| **Mutation Rule** | Atomic decrement from source stock, increment to destination stock | Pointer relocation (`currentWarehouseId` $\leftrightarrow$ `currentProjectId`) |
| **Condition Tracking** | Standard quantity | Per-serial condition (`Standby Good`, `Standby Bad`, `Under Repair`) |

### 4.2 Current State vs. Movement Ledger

AWMS enforces a strict separation between **Current Inventory State** and the **Movement History Ledger**:

- **Current State Tables** (`warehouse_stocks`, `project_stocks`, `item_serials`): Reflect real-time stock balances at this exact moment.
- **Movement Ledger Tables** (`stock_movements`, `stock_movement_items`, `movement_serials`): Immutable historical ledger documenting every receipt, dispatch, return, and adjustment.

Every stock mutation in AWMS writes to the movement ledger inside an atomic database transaction.
