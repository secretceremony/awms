# 03 - Administrator Guide

This guide covers administrative configurations, master data maintenance, system parameters, and governance rules in AWMS.

---

## 1. System Settings Configuration

Navigate to **Settings** in the sidebar to configure global business parameters:

### 1.1 Inventory Settings
- **Global Low Stock Threshold**: Defines the threshold quantity for bulk items across all warehouses.
  - When total warehouse stock is `0` &rarr; flagged as **Out of Stock**.
  - When total warehouse stock is `> 0` and `&le; threshold` &rarr; flagged as **Low Stock**.
  - When total warehouse stock is `> threshold` &rarr; flagged as **Normal**.
  - *Default value*: `5 units`.

### 1.2 Delivery Settings
- **Default Sender Name**: Company name printed on DO headers and Shipping Labels (e.g. `PT ALSSA Corporindo`).
- **Default Sender Address**: Default dispatch hub address (e.g. `Balikpapan Hub, Kalimantan Timur`).
- **Default Sender Phone**: Primary contact telephone number.
- **Default Label Width & Height**: Default thermal/packaging label dimensions in millimeters (`100mm` &times; `150mm`).

### 1.3 Cities & Units Management
- **Cities**: Configure municipal hubs and airport/city codes (`BPN`, `JKT`, `SMD`) used in warehouse codes and DO sequences.
- **Units of Measurement**: Configure standard packaging units (`pcs`, `box`, `set`, `unit`, `meter`, `roll`).

---

## 2. Master Data Lifecycle & Deactivation Governance

### 2.1 Soft Deactivation vs. Hard Deletion Rules
To guarantee historical data integrity, AWMS prevents the hard deletion of any master records referenced in transactional history:

| Entity | Delete Allowed? | Deactivation Behavior |
| :--- | :--- | :--- |
| **Client** | Only if zero linked projects or delivery orders exist. | Deactivated clients cannot be selected for new projects, but historical records remain intact. |
| **Warehouse** | Only if zero linked stock balances, movements, or DOs exist. | Deactivated warehouses cannot receive new stock, but historical stock records remain viewable. |
| **Project** | Only if zero linked stocks, movements, or DOs exist. | Mark status as **COMPLETED**. Completed projects allow returns, but block new outgoings. |
| **Item Master** | Only if zero stock records or movements exist. | Deactivated items are hidden from new transactions, but remain in historical reports. |
| **Unit / City** | Only if no item or warehouse references exist. | Deactivated units/cities are hidden from creation dropdowns. |

---

## 3. Auditing & Compliance Inspection

1. Navigate to **Audit Logs**.
2. Filter logs by:
   - **Date Range**: Filter specific timeframes.
   - **User**: Audit actions performed by a particular operator.
   - **Action Type**: Filter by `CREATE`, `UPDATE`, `DELETE`, `ISSUE`, `PRINT`.
   - **Entity**: Filter by `clients`, `projects`, `items`, `stock_movements`, `delivery_orders`, `shipping_labels`, `system_settings`.
3. Click on any log entry to view the complete before/after payload snapshot.
