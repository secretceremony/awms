# 07 - Database & Data Dictionary

This document outlines the relational data model for AWMS as defined in the Prisma schema.

---

## 1. Entity Relationship Overview

```
[ User ] ─────────┬──► [ StockMovement ] ◄──── [ Warehouse ]
                  ├──► [ DeliveryOrder ] ◄──── [ Project ] ◄─── [ Client ] ◄─── [ ClientContact ]
                  └──► [ AuditLog ]               ▲
                                                  │
                                          [ ShippingLabel ]
```

---

## 2. Table Specifications

### 2.1 `users`
Stores authenticated user accounts.
- `id` (PK, Int): Primary key.
- `email` (String, Unique): User login email.
- `password` (String): Bcrypt hashed password.
- `name` (String): Full display name.
- `role` (Role Enum: `ADMIN`, `USER`): Authorization level.
- `is_active` (Boolean): Active status flag.

### 2.2 `customers` (Prisma Model: `Client`)
Client companies receiving equipment and logistics services.
- `id` (PK, Int): Primary key.
- `name` (String, Unique): Company name.
- `code` (String?, Unique): Short client code.
- `client_type` (ClientType Enum: `PHM`, `OTHER`): Client business classification.
- `email`, `phone`, `address` (String?): Client contact information.
- `is_active` (Boolean): Active status.

### 2.3 `client_contacts`
Authorized representatives of client companies.
- `id` (PK, Int): Primary key.
- `client_id` (FK &rarr; `customers.id`, Int): Parent client reference.
- `name` (String): Contact person full name (Attn).
- `phone`, `email`, `position` (String?): Contact details.
- `is_active` (Boolean): Active status.

### 2.4 `warehouses`
Physical logistics hubs where inventory is stored.
- `id` (PK, Int): Primary key.
- `name` (String, Unique): Warehouse hub name.
- `city` (String): City location.
- `city_code` (String, FK &rarr; `cities.code`): 3-letter city identifier.
- `location` (String?): Detailed street address.
- `is_active` (Boolean): Active status.

### 2.5 `projects`
Contracts or work orders where equipment is deployed.
- `id` (PK, Int): Primary key.
- `client_id` (FK &rarr; `customers.id`, Int): Consignee client.
- `name` (String): Project designation.
- `site_code` (String, Unique): Site identifier code (e.g. `BPN-01`).
- `reference_number` (String?): External Purchase Order / Contract number.
- `location` (String): Physical field / installation site address.
- `client_contact_id` (FK &rarr; `client_contacts.id`?, Int?): Default client contact.
- `status` (ProjectStatus Enum: `ACTIVE`, `COMPLETED`): Project lifecycle state.

### 2.6 `items`
Equipment catalog definitions.
- `id` (PK, Int): Primary key.
- `name` (String, Unique): Item equipment name.
- `brand` (String?): Equipment manufacturer brand.
- `model_number` (String?): Model number.
- `tracking_type` (TrackingType Enum: `BULK`, `SERIALIZED`): Inventory tracking mode.
- `unit_id` (FK &rarr; `units.id`, Int): Unit of measurement.
- `is_active` (Boolean): Active catalog status.

### 2.7 `item_serials`
Individual physical serialized assets.
- `id` (PK, Int): Primary key.
- `item_id` (FK &rarr; `items.id`, Int): Equipment master reference.
- `serial_number` (String, Unique): Physical hardware serial number.
- `current_warehouse_id` (FK &rarr; `warehouses.id`?, Int?): Warehouse location if in storage.
- `current_project_id` (FK &rarr; `projects.id`?, Int?): Project location if deployed.
- `state` (String: `STANDBY_GOOD`, `STANDBY_BAD`, `UNDER_REPAIR`, `DEPLOY`): Operational condition state.
- `condition_label` (String: `Standby Good`, `Standby Bad`, `Under Repair`): Display label.

### 2.8 `warehouse_stocks` & `project_stocks`
Real-time bulk inventory balances.
- `warehouse_stocks`: `[warehouse_id, item_id]` composite unique key, `quantity` (Int).
- `project_stocks`: `[project_id, item_id]` composite unique key, `quantity` (Int).

### 2.9 `stock_movements` & `stock_movement_items`
Immutable transaction ledger for all inventory mutations.
- `stock_movements`: `id`, `movement_number` (Unique), `movement_type` (`INITIAL`, `INCOMING`, `OUTGOING`, `RETURN`, `ADJUSTMENT`), `movement_date`, `source_warehouse_id`, `destination_warehouse_id`, `project_id`, `created_by_id`.
- `stock_movement_items`: `movement_id`, `item_id`, `quantity`.
- `movement_serials`: `movement_item_id`, `item_serial_id`.

### 2.10 `delivery_orders` & `delivery_order_items`
Formal dispatch records and line items.
- `delivery_orders`: `id`, `do_number` (Unique, Nullable on draft), `date`, `activity`, `status` (`DRAFT`, `ISSUED`, `CANCELLED`), `customer_id`, `project_id`, `source_warehouse_id`, `created_by_id`, `issued_by_id`, `issued_at`, frozen snapshots.
- `delivery_order_items`: `delivery_order_id`, `item_id`, `quantity`, `pic`, `remarks`, frozen snapshots.

### 2.11 `shipping_labels`
Logistics package and carton labels.
- `id` (PK, Int): Primary key.
- `delivery_order_id` (FK &rarr; `delivery_orders.id`?, Int?): Optional link to issued DO.
- `source_type` (String: `DO`, `STANDALONE`): Label origin.
- `ship_date` (DateTime): Date of shipment.
- `recipient_name` (String): Consignee company name.
- `attn_name` (String?): Recipient contact name.
- `destination` (String): Destination delivery address.
- `reference_number`, `do_number` (String?): Reference numbers.
- `sender_name`, `sender_address`, `sender_phone` (String?): Sender details.
- `is_fragile` (Boolean): Fragile package flag.
- `handling_note` (String?): Special handling instructions.
- `label_width`, `label_height` (Int): Dimensions in millimeters.

### 2.12 `audit_logs`, `system_settings`, `do_sequences`
- `audit_logs`: Immutable tracking of user operations (`CREATE`, `UPDATE`, `DELETE`, `ISSUE`, `PRINT`) with JSON payload deltas.
- `system_settings`: Key-value storage for application-wide parameters.
- `do_sequences`: Yearly sequence counters for atomic DO numbering.
