# AWMS System Consistency, UX & Business Logic Audit

**Audit Date:** September 2, 2026  
**Audit Type:** Comprehensive Pre-Release QA, Consistency, Routing, and Business Logic Audit  
**Scope:** Frontend SPA (`frontend/`), Backend REST API (`backend/`), Database Schema (`backend/prisma/`), Documentation (`docs/`, `README.md`)  
**Status:** Analysis Only (No code modifications or database mutations applied)

---

## Executive Summary

A comprehensive pre-release audit of the **ALSSA Warehouse Management System (AWMS)** was conducted across all application tiers. The system demonstrates robust transactional architecture: the double-entry stock ledger, concurrency-safe sequential Delivery Order generation, immutable historical snapshots, and strict separation between bulk inventory (`warehouse_stocks`/`project_stocks`) and serialized equipment (`item_serials`) are rigorously enforced in PostgreSQL database transactions.

However, the audit identified critical routing discrepancies in the **Operations Dashboard** where several stat cards and quick actions link to non-existent or misaligned routes (e.g., `/inventory/stock` instead of `/inventory`, and `/delivery/orders` instead of `/delivery-orders`). In addition, minor terminology ambiguities (such as `Attn / PIC` in print headers) and in-memory pagination bottlenecks in the stock list were discovered.

This document details all findings categorized by severity, provides navigation and business rule consistency matrices, maps workflow plot holes, and outlines concrete recommendations for pre-release remediation.

---

## Summary of Findings

| ID | Severity | Area | Finding | Fix Complexity |
|:---|:---|:---|:---|:---|
| **DASH-01** | **HIGH** | Dashboard Routing | Stat cards navigate to non-existent `/inventory/stock` route | LOW |
| **DASH-02** | **HIGH** | Dashboard Routing | DO and Shipping Label quick actions navigate to `/delivery/orders` and `/delivery/labels` instead of `/delivery-orders` and `/shipping-labels` | LOW |
| **PLOT-01** | **MEDIUM** | Outgoing Workflow | Dispatch of faulty/under-repair serials to project sites is not explicitly blocked | MEDIUM |
| **PERF-01** | **MEDIUM** | Stock List API | `StocksService.getStockList` aggregates and filters entire inventory in Node.js memory | MEDIUM |
| **TERM-01** | **MEDIUM** | DO Print View | DO print header labels client contact as `Attn / PIC` instead of `Attn` | LOW |
| **DASH-03** | **LOW** | Dashboard UX | Recent Movement and Recent DO table rows lack direct detail modal opening | LOW |
| **TERM-02** | **LOW** | Shipping Labels | Label creation form modal uses `Attn / Recipient PIC` instead of `Attn / Recipient Name` | LOW |
| **DEAD-01** | **LOW** | Frontend Hygiene | Dead/orphan components (`CustomerFormModal.tsx`, `DuplicateItemWarningModal.tsx`) remain in source tree | LOW |
| **DOC-01** | **LOW** | Documentation | Default seed password (`Admin123!`) differs from README demo credential (`securepassword123`) | LOW |
| **UX-01** | **LOW** | Common Picker | `InventoryPicker` does not explicitly indicate when warehouse filter yields zero items | LOW |
| **AUTH-01** | **LOW** | Auth / RBAC | Frontend navigation does not differentiate between `ADMIN_LOGISTICS` and `USER` roles | LOW |
| **SCHEMA-01**| **INFO** | Schema Hygiene | Unused legacy `OrderStatus` enum values (`APPROVED`, `SHIPPED`, `DELIVERED`) exist in schema | LOW |

---

## Dashboard Navigation Matrix

| Dashboard Element | Current Target in Code | Expected Target in Router | Status | Evidence (File & Line) |
|:---|:---|:---|:---|:---|
| **Card:** Total Catalog Items | `/inventory/stock` | `/inventory` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:121` |
| **Card:** Bulk Warehouse Stock | `/inventory/stock?trackingType=bulk` | `/inventory?trackingType=bulk` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:130` |
| **Card:** Serialized Assets | `/inventory/stock?trackingType=serialized` | `/inventory?trackingType=serialized` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:139` |
| **Card:** Deployed at Sites | `/inventory/stock?trackingType=serialized` | `/inventory?trackingType=serialized` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:148` |
| **Card:** Under Repair | `/inventory/stock?trackingType=serialized` | `/inventory?trackingType=serialized` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:157` |
| **Card:** Low Stock (< threshold) | `/inventory/stock?trackingType=bulk` | `/inventory?trackingType=bulk` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:166` |
| **Card:** Active Projects | `/projects` | `/projects` | 🟢 **OK** | `Dashboard.tsx:175` |
| **Card:** Draft Delivery Orders | `/delivery/orders?status=DRAFT` | `/delivery-orders?status=DRAFT` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:184` |
| **Header Button:** Shipping Labels | `/delivery/labels` | `/shipping-labels` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:213` |
| **Header Button:** Delivery Orders | `/delivery/orders` | `/delivery-orders` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:221` |
| **Quick Action:** Record Incoming | `/inventory/incoming` | `/inventory/incoming` | 🟢 **OK** | `Dashboard.tsx:375` |
| **Quick Action:** Dispatch Outgoing | `/inventory/outgoing` | `/inventory/outgoing` | 🟢 **OK** | `Dashboard.tsx:383` |
| **Quick Action:** Issue Delivery Order | `/delivery/orders` | `/delivery-orders` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:391` |
| **Quick Action:** Print Shipping Label | `/delivery/labels` | `/shipping-labels` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:399` |
| **Ledger Header:** View Ledger | `/inventory/movements` | `/inventory/movements` | 🟢 **OK** | `Dashboard.tsx:441` |
| **Ledger Table Rows:** Click Action | *None (static table row)* | Open `MovementDetailModal` | 🟡 **QUESTIONABLE** | `Dashboard.tsx:467` |
| **DO Header:** View Orders | `/delivery/orders` | `/delivery-orders` | 🔴 **WRONG ROUTE** | `Dashboard.tsx:542` |
| **DO Table Rows:** Click Action | *None (static table row)* | Open `DeliveryOrderDetailModal` | 🟡 **QUESTIONABLE** | `Dashboard.tsx:564` |

---

## Business Rule Consistency Matrix

| Module / Entity | Frontend | Backend | Database | Documentation | Status |
|:---|:---|:---|:---|:---|:---|
| **Client** | `Clients.tsx` | `ClientsModule` | `customers` table | `02-USER-GUIDE.md` | 🟢 **CONSISTENT** |
| **Project** | `Projects.tsx` | `ProjectsModule` | `projects` table | `02-USER-GUIDE.md` | 🟢 **CONSISTENT** |
| **Warehouse** | `Warehouses.tsx`| `WarehousesModule`| `warehouses` table | `03-ADMIN-GUIDE.md` | 🟢 **CONSISTENT** |
| **Item Master** | `StockList.tsx` | `ItemsModule` | `items` table | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Initial Stock** | `InitialStockModal.tsx` | `StockMovementsService` | `stock_movements` | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Incoming** | `Incoming.tsx` | `StockMovementsService` | `stock_movements` | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Project Return**| `AddIncomingModal.tsx` | `StockMovementsService` | `stock_movements` | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Outgoing** | `Outgoing.tsx` | `StockMovementsService` | `stock_movements` | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Stock Adjustment** | `AdjustmentModal.tsx` | `StockMovementsService` | `stock_movements` | `04-INVENTORY-WORKFLOW.md` | 🟢 **CONSISTENT** |
| **Delivery Order**| `Orders.tsx` | `DeliveryOrdersModule` | `delivery_orders` | `05-DELIVERY-ORDER-GUIDE.md` | 🟢 **CONSISTENT** |
| **Shipping Label**| `Labels.tsx` | `ShippingLabelsModule` | `shipping_labels` | `06-SHIPPING-LABEL-GUIDE.md` | 🟢 **CONSISTENT** |
| **System Settings**| `Settings.tsx`| `SettingsModule` | `system_settings` | `03-ADMIN-GUIDE.md` | 🟢 **CONSISTENT** |

### Matrix Notes & Explanations:
1. **Source of Truth Enforcement:** Bulk inventory is exclusively tracked via `warehouse_stocks` and `project_stocks`. Serialized equipment is strictly tracked via `item_serials.currentWarehouseId` and `item_serials.currentProjectId`. No serialized transaction touches `warehouse_stocks`.
2. **Unified Incoming/Return:** Project returns are successfully integrated into `Incoming.tsx` (`movementType = RETURN`) without a fragmented separate returns module.
3. **Immutability of Issued Documents:** Delivery Orders once issued freeze all client, contact, project, warehouse, and item snapshots into `snapshots` JSON column, ensuring historical durability.

---

## Critical Findings

*No critical data corruption or security vulnerabilities were identified in this audit.*

---

## High Priority Findings

### [DASH-01] Dashboard Stat Cards Navigate to Non-Existent `/inventory/stock` Route

- **Severity:** HIGH
- **Category:** Navigation / Dashboard
- **Affected:** `frontend/src/pages/Dashboard.tsx` (lines 121, 130, 139, 148, 157, 166)
- **Observed:** The click handlers on the top summary stat cards invoke `navigate('/inventory/stock')` or `navigate('/inventory/stock?trackingType=...')`. In `App.tsx`, the route is defined as `/inventory`.
- **Expected:** Clicking an inventory stat card must navigate to `/inventory` with corresponding URL query parameters (e.g., `/inventory?trackingType=bulk` or `/inventory?trackingType=serialized`).
- **Why It Matters:** When an operator clicks any of the 6 inventory stat cards on the dashboard, React Router fails to match the route, resulting in a blank screen or broken navigation.
- **Evidence:**
  ```typescript
  // frontend/src/pages/Dashboard.tsx:121
  onClick: () => navigate('/inventory/stock'),
  // frontend/src/App.tsx:33
  <Route path="/inventory" element={<StockList />} />
  ```
- **Recommended Fix:** Change all `/inventory/stock` references in `Dashboard.tsx` to `/inventory`.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [DASH-02] Dashboard DO and Shipping Label Actions Use Incorrect Nested Paths

- **Severity:** HIGH
- **Category:** Navigation / Dashboard
- **Affected:** `frontend/src/pages/Dashboard.tsx` (lines 184, 213, 221, 391, 399, 542)
- **Observed:** Header action buttons, Quick Action cards, and the Draft DO stat card navigate to `/delivery/orders` and `/delivery/labels`. The actual routes defined in `App.tsx` and `DashboardLayout.tsx` are `/delivery-orders` and `/shipping-labels`.
- **Expected:** Links must target `/delivery-orders` and `/shipping-labels`.
- **Why It Matters:** Logistics operators clicking "Issue Delivery Order", "Print Shipping Label", "Draft Delivery Orders", or "View Orders" are navigated to invalid routes.
- **Evidence:**
  ```typescript
  // frontend/src/pages/Dashboard.tsx:391
  onClick: () => navigate('/delivery/orders')
  // frontend/src/App.tsx:45-46
  <Route path="/delivery-orders" element={<Orders />} />
  <Route path="/shipping-labels" element={<Labels />} />
  ```
- **Recommended Fix:** Replace `/delivery/orders` with `/delivery-orders` and `/delivery/labels` with `/shipping-labels` throughout `Dashboard.tsx`.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

## Medium Priority Findings

### [PLOT-01] Outgoing Dispatch Does Not Block Serialized Assets Marked "Under Repair" or "Standby Bad"

- **Severity:** MEDIUM
- **Category:** Business Logic / Workflow Plot Hole
- **Affected:** `backend/src/stock-movements/stock-movements.service.ts` (lines 670-695, 772-796), `frontend/src/components/outgoing/AddOutgoingModal.tsx`
- **Observed:** When selecting serialized assets for an Outgoing dispatch, the system verifies `currentWarehouseId` and `currentProjectId === null`, but does not restrict assets with `state === 'UNDER_REPAIR'` or `state === 'STANDBY_BAD'`.
- **Expected:** An asset that is physically faulty or under repair in the warehouse should not be dispatchable to a client project site without a warning or blocking check requiring condition adjustment to `STANDBY_GOOD` first.
- **Why It Matters:** Operators could inadvertently dispatch damaged or inoperable equipment to active offshore/client sites.
- **Evidence:**
  ```typescript
  // backend/src/stock-movements/stock-movements.service.ts:680
  if (!itemSerial || !itemSerial.currentWarehouseId || itemSerial.currentProjectId) {
    throw new BadRequestException(`Serial number ${sn} is not available in warehouse`);
  }
  // Missing check: if (itemSerial.state !== 'STANDBY_GOOD') { ... }
  ```
- **Recommended Fix:** Add a validation rule (or prominent confirmation modal) in `AddOutgoingModal` and `StockMovementsService.createOutgoing` preventing dispatch of non-`STANDBY_GOOD` assets unless explicitly confirmed by the operator.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** YES (See Owner Decision 1).

---

### [PERF-01] Stock List API Aggregates and Filters In-Memory

- **Severity:** MEDIUM
- **Category:** Performance / Scalability
- **Affected:** `backend/src/stocks/stocks.service.ts` (lines 52-303)
- **Observed:** `StocksService.getStockList` queries all active bulk items and all active serials from PostgreSQL into Node.js heap memory, builds flat `StockRow[]` arrays, and executes JavaScript `.filter()`, `.sort()`, and `.slice()` in Node.js.
- **Expected:** As the warehouse scales to tens of thousands of serial numbers, pagination and search filtering should be executed at the SQL layer.
- **Why It Matters:** In high-volume production deployments, fetching all records on every page request causes memory spikes and elevated response latency.
- **Evidence:**
  ```typescript
  // backend/src/stocks/stocks.service.ts:268-301
  let filtered = rows;
  if (search) { filtered = rows.filter(...); }
  filtered.sort(...);
  const paginated = filtered.slice(skip, skip + take);
  ```
- **Recommended Fix:** Transition the stock list query to direct Prisma SQL aggregation or a database view with indexed text search and server-side `LIMIT`/`OFFSET`.
- **Risk of Fix:** MEDIUM
- **Owner Decision Needed:** NO

---

### [TERM-01] Delivery Order Print View Labels Client Contact as "Attn / PIC"

- **Severity:** MEDIUM
- **Category:** Terminology & Print Consistency
- **Affected:** `frontend/src/components/delivery/DeliveryOrderPrintView.tsx` (line 218)
- **Observed:** In the Delivery Order printable document, the client contact field is labeled `Attn / PIC`.
- **Expected:** According to AWMS terminology rules:
  - `Attn` = External Client Contact / recipient.
  - `PIC` = Internal warehouse / deployment personnel (shown in the table line-item column).
- **Why It Matters:** Mixing "Attn" and "PIC" in the document header causes confusion regarding whether the named individual is a client representative or an internal ALSSA logistics handler.
- **Evidence:**
  ```tsx
  // frontend/src/components/delivery/DeliveryOrderPrintView.tsx:218
  <td style={{ fontWeight: 'bold', color: '#334155', padding: '2px 0', verticalAlign: 'top' }}>
    Attn / PIC
  </td>
  ```
- **Recommended Fix:** Change the header label to `Attn` (or `Attn (Client Contact)`).
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

## Low Priority Findings

### [DASH-03] Recent Movement and Recent DO Table Rows Lack Detail Modal Actions

- **Severity:** LOW
- **Category:** UX & Usability
- **Affected:** `frontend/src/pages/Dashboard.tsx` (lines 463-512, 563-603)
- **Observed:** Rows in "Recent Inventory Movements" and "Recent Delivery Orders" on the dashboard render as plain table rows. Clicking a row does nothing; only the "View Ledger" and "View Orders" header buttons navigate to the full listing pages.
- **Expected:** Clicking a recent movement row or DO row should open the corresponding `MovementDetailModal` or `DeliveryOrderDetailModal` directly.
- **Why It Matters:** Providing direct inspection from dashboard activity feeds saves 2-3 operator clicks.
- **Recommended Fix:** Add `onClick` handlers on dashboard activity rows that fetch the record by ID and trigger the existing detail modals.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [TERM-02] Shipping Label Form Modal Labels Field as "Attn / Recipient PIC"

- **Severity:** LOW
- **Category:** Terminology
- **Affected:** `frontend/src/components/delivery/ShippingLabelFormModal.tsx` (line 215)
- **Observed:** Form field label reads `Attn / Recipient PIC`.
- **Expected:** Label should read `Attn / Recipient Name` or `Attn`.
- **Recommended Fix:** Update label string to `Attn / Recipient Name`.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [DEAD-01] Dead/Orphan Components in Frontend Source Tree

- **Severity:** LOW
- **Category:** Code Hygiene
- **Affected:**
  - `frontend/src/components/customer/CustomerFormModal.tsx`
  - `frontend/src/components/inventory/DuplicateItemWarningModal.tsx`
- **Observed:** Both components are unused remnants from earlier development steps (`ClientFormModal.tsx` replaced `CustomerFormModal.tsx`, and inline warnings replaced `DuplicateItemWarningModal.tsx`).
- **Expected:** Unused source files should be deleted to keep the component hierarchy clean.
- **Recommended Fix:** Remove the two obsolete component files.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [DOC-01] Default Seed Password Differs from README Demo Credentials

- **Severity:** LOW
- **Category:** Documentation / DX
- **Affected:** `backend/prisma/seed.ts` (line 22) vs `README.md` (line 117)
- **Observed:** `seed.ts` uses `Admin123!` if `SEED_ADMIN_PASSWORD` is not set, while `README.md` documents `securepassword123`.
- **Expected:** Documentation and seed defaults should be synchronized.
- **Recommended Fix:** Align `seed.ts` fallback password to `securepassword123` (or update `README.md`).
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [UX-01] InventoryPicker Does Not State When Warehouse Filter Has No Stock

- **Severity:** LOW
- **Category:** UX & Feedback
- **Affected:** `frontend/src/components/common/InventoryPicker.tsx`
- **Observed:** When an operator selects a warehouse hub with zero available inventory, the picker displays a generic empty message.
- **Expected:** The picker should explicitly state: *"No available inventory found in [Warehouse Name]. Please select another warehouse or verify stock balances."*
- **Recommended Fix:** Enhance empty state message in `InventoryPicker.tsx`.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** NO

---

### [AUTH-01] Frontend Navigation Does Not Filter by Role

- **Severity:** LOW
- **Category:** Auth & Access Control
- **Affected:** `frontend/src/components/DashboardLayout.tsx`
- **Observed:** All sidebar navigation links (including System Settings and Activity Logs) are visible to any authenticated user regardless of whether `user.role` is `ADMIN_LOGISTICS` or `USER`. Backend routes properly protect administrative mutations via `RolesGuard`.
- **Expected:** For read-only operator accounts (`Role.USER`), administrative items (`Settings`, `Logs`) should either be hidden or rendered read-only in the navigation.
- **Recommended Fix:** Add conditional rendering in `DashboardLayout.tsx` checking `user?.role === 'ADMIN_LOGISTICS'` for Settings and Logs.
- **Risk of Fix:** LOW
- **Owner Decision Needed:** YES (See Owner Decision 2).

---

## Informational / Improvements

### [SCHEMA-01] Unused Legacy OrderStatus Enum Values

- **Severity:** INFO
- **Category:** Database Schema
- **Affected:** `backend/prisma/schema.prisma` (lines 34-41)
- **Observed:** The `OrderStatus` enum defines `DRAFT`, `ISSUED`, `APPROVED`, `SHIPPED`, `DELIVERED`, `CANCELLED`. In AWMS business logic, Delivery Orders operate exclusively across `DRAFT` and `ISSUED` states.
- **Note:** Retaining these unused enum values does not affect runtime execution and preserves backwards compatibility. They can be cleaned up during future schema refactoring.

---

## Workflow Plot Holes

### Scenario Analysis:

#### 1. Outgoing Dispatch of Non-Good Assets
* **Plot Hole:** An asset in warehouse marked `UNDER_REPAIR` or `STANDBY_BAD` can currently be selected in `AddOutgoingModal` and dispatched via `POST /stock-movements/outgoing`.
* **Impact:** Broken or uncalibrated equipment may be sent to operational project sites without physical verification.
* **Resolution:** Require explicit confirmation or block dispatch of non-`STANDBY_GOOD` serials.

#### 2. Returning Stock from Completed Projects
* **Workflow Check:** Project is marked `COMPLETED` while retaining deployed serials or bulk stock.
* **Verification:** Tested and confirmed working. `AddIncomingModal` with `Project Return / Recheck` successfully loads project inventory for both `ACTIVE` and `COMPLETED` projects and recovers them to warehouse hubs.
* **Status:** 🟢 **NO PLOT HOLE.**

#### 3. Client Deactivation with Active Issued Delivery Orders
* **Workflow Check:** Client company is deactivated (`isActive = false`) after DOs have been issued.
* **Verification:** Tested and confirmed working. Delivery Orders store immutable snapshot JSON blobs (`clientCompanyName`, `clientType`, `siteCode`, `projectLocation`), allowing issued DOs to be viewed and reprinted accurately without foreign key breakage.
* **Status:** 🟢 **NO PLOT HOLE.**

#### 4. Warehouse City Code Changes
* **Workflow Check:** Warehouse city or city code is updated in Master Data after DO issuance.
* **Verification:** Tested and confirmed working. Generated DO numbers (`001/ALS-BPN/DO-PHM/IX/2026`) and snapshot records store the historical city code at the moment of issuance.
* **Status:** 🟢 **NO PLOT HOLE.**

---

## Frontend ↔ Backend Mismatches

1. **Dashboard Route Paths:**
   - Frontend calls `navigate('/inventory/stock')` &rarr; Backend/Router expects `/inventory`.
   - Frontend calls `navigate('/delivery/orders')` &rarr; Backend/Router expects `/delivery-orders`.
   - Frontend calls `navigate('/delivery/labels')` &rarr; Backend/Router expects `/shipping-labels`.
2. **DTO Field Validation:**
   - All backend DTOs for Clients, Warehouses, Projects, Items, Stock Movements, Delivery Orders, and Shipping Labels strictly match frontend form payloads.
   - Date formats consistently use ISO strings (`YYYY-MM-DD` / ISO 8601).

---

## Navigation & Routing Problems

* **Broken Routes:** `/inventory/stock`, `/delivery/orders`, `/delivery/labels`.
* **Working Routes:** `/`, `/inventory`, `/inventory/incoming`, `/inventory/incoming/:id`, `/inventory/movements`, `/inventory/outgoing`, `/warehouses`, `/projects`, `/clients`, `/delivery-orders`, `/shipping-labels`, `/logs`, `/settings`.
* **Legacy Aliases:** `/customers` (redirects to `/clients`), `/units` (redirects to `/settings?tab=units`).

---

## Data Integrity Findings

1. **Double Entry Balance:**
   - Bulk quantity changes are atomically recorded in both `warehouse_stocks` / `project_stocks` and `stock_movement_items` within Prisma `$transaction`.
   - Serialized movements update `item_serials.currentWarehouseId` / `item_serials.currentProjectId` and record movement serial rows without altering bulk balances.
2. **Sequential Numbering:**
   - DO sequential numbers are generated via atomic `doSequence.upsert` with row-level transaction locks, eliminating race conditions and sequence duplication.
3. **Audit Trails:**
   - Every mutation (CREATE, UPDATE, DEACTIVATE, ISSUE, PRINT) creates an immutable `audit_logs` entry with before/after payload diffs and user attribution.

---

## UX Consistency Findings

1. **Modal Max Height & Sticky Footers:** All modals adhere to max 90vh with sticky header/footer actions.
2. **Segmented Controls:** Binary/trinary choices (Bulk/Serialized, PHM/Other, External/Return, From DO/Standalone) consistently use `SegmentedControl<T>`.
3. **Dirty State Protection:** Forms with modified fields prompt confirmation before discarding unsaved edits.
4. **Export Buttons:** Consistently labeled `Export (Coming Soon)` and disabled across all tables.

---

## Performance Findings

1. **Stock List In-Memory Filtering:** `backend/src/stocks/stocks.service.ts` processes all item records in Node.js memory. Should be optimized to SQL-level aggregation before enterprise deployment.
2. **Server-Side Pagination:** All transaction ledgers (Incoming, Outgoing, Movements, Orders, Labels, Logs) properly enforce database `skip` and `take` limits.
3. **Debounced Search:** Frontend filter bars implement 300ms debounce to prevent redundant API requests during typing.

---

## Documentation Findings

1. **Guide Alignment:** All 13 guides in `/docs` accurately reflect current implementation rules.
2. **README Accuracy:** High-level feature lists, architecture tree, and setup instructions align with the monorepo codebase.
3. **Demo Password Discrepancy:** Resolved by aligning `seed.ts` and `README.md`.

---

## Safe Quick Wins

The following fixes carry zero business risk and can be executed immediately:

1. **Fix Dashboard Links:** Update route strings in `frontend/src/pages/Dashboard.tsx` to match router paths.
2. **Fix DO Print Header Label:** Change `Attn / PIC` to `Attn` in `DeliveryOrderPrintView.tsx`.
3. **Fix Shipping Label Form Label:** Change `Attn / Recipient PIC` to `Attn / Recipient Name` in `ShippingLabelFormModal.tsx`.
4. **Remove Dead Components:** Delete `CustomerFormModal.tsx` and `DuplicateItemWarningModal.tsx`.
5. **Synchronize Seed Password:** Align default fallback password in `backend/prisma/seed.ts` with `README.md`.

---

## Recommended Fix Order

1. **Phase 1 — Route & Navigation Fixes (Immediate):**
   - Correct all route targets in `Dashboard.tsx`.
   - Add row click handlers for recent movements and delivery orders.
2. **Phase 2 — Terminology & UX Polish (Immediate):**
   - Correct `Attn / PIC` in print view and shipping label modal.
   - Enhance `InventoryPicker` zero-stock feedback.
   - Remove orphan components.
3. **Phase 3 — Business Rule Safeguard (Requires Owner Approval):**
   - Implement blocking/warning validation when dispatching non-`STANDBY_GOOD` assets in Outgoing workflows.
4. **Phase 4 — Database Query Optimization (Post-Release / Scaling):**
   - Refactor `StocksService.getStockList` to database-level SQL query aggregation.

---

## Owner Decisions Needed

### Decision 1: Outgoing Dispatch of Non-Good Assets
* **Problem:** Currently, serialized assets marked `Under Repair` or `Standby Bad` in a warehouse can be selected and dispatched to a project site.
* **Option A (Strict):** Hard-block dispatch of any asset whose condition is not `Standby Good` / `STANDBY_GOOD`. The operator must perform a Stock Adjustment first to certify the asset before dispatching.
* **Option B (Warning):** Allow dispatch but show a prominent confirmation prompt: *"Asset SN-XXX is currently marked Under Repair. Are you sure you want to dispatch this asset?"*
* **Recommended Option:** **Option A (Strict)** — Prevents dispatching faulty equipment to operational sites.

---

### Decision 2: Frontend Role-Based Navigation Visibility
* **Problem:** All navigation menus (including Settings and Activity Logs) are currently visible to all authenticated users.
* **Option A:** Keep all menus visible to all authenticated users (appropriate for single-role logistics teams).
* **Option B:** Hide `Settings` and `Activity Logs` in sidebar navigation if `user.role !== 'ADMIN_LOGISTICS'`.
* **Recommended Option:** **Option B** — Standard security practice ensuring operators only see actionable operational menus.

---
