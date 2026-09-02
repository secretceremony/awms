# 05 - Delivery Order (DO) Guide

This guide describes the complete lifecycle, business logic, numbering structure, and printing specifications for AWMS Delivery Orders.

---

## 1. Delivery Order Lifecycle

```
[ New DO Form ] ──► [ Validation ] ──► [ Save Draft ] ──► [ Issue DO ] ──► [ Outgoing Stock Mutation ] ──► [ Print / PDF ]
```

1. **Draft Creation**: The Logistics Admin initiates a DO, selecting the project, activity, and line items.
2. **Pre-Issue Validation**: Enforces mandatory active project status, project reference number, and stock availability.
3. **Issuance**:
   - Assigns the official sequential DO Number.
   - Generates immutable historical snapshots of client, project, warehouse, and item data.
   - Calls the reusable Outgoing stock mutation engine to atomically transfer inventory from warehouse to project.
4. **Post-Issuance**: Displays the success dialog with direct options to **Print Now** or **Save / Print PDF**.

---

## 2. Business Rules & Validation

### 2.1 Mandatory Project Reference Number
- A Delivery Order **cannot** be created or issued if the target Project lacks a **Reference Number** (PO or Contract number).
- If missing, AWMS blocks progression at Step 1 with a clear prompt:
  > *"This project requires a Reference Number before a Delivery Order can be created. Please update the project details first."*

### 2.2 Client Attn vs. Internal Line-Item PIC
AWMS clearly distinguishes between recipient contact and internal operational personnel:

- **Attn (Client Contact)**: The external representative at the client company receiving the shipment (e.g. `Budi Santoso - Procurement Lead`). Auto-populated from the project's client contact.
- **PIC (Internal Line-Item Person in Charge)**: The internal ALSSA technician, engineer, or field operator responsible for handling, deploying, or testing that specific equipment (e.g. `Ahmad Kurniawan`).
  - PIC is optional per line item.
  - The form provides an **Apply PIC to All Items** helper for rapid assignment.

---

## 3. Concurrency-Safe DO Numbering

Official DO Numbers are generated atomically upon **Issuance** (Draft DOs do not consume sequence numbers):

$$\text{Format: } \mathbf{[000]/ALS-[CITY]/DO-[CLIENTTYPE]/[ROMAN\_MONTH]/[YEAR]}$$

- **`[000]`**: 3-digit zero-padded sequential number resetting annually on January 1st (e.g. `001`, `042`, `150`).
- **`ALS`**: Fixed company identifier (ALSSA).
- **`[CITY]`**: City code of the source warehouse hub (e.g. `BPN`, `JKT`, `SMD`).
- **`DO`**: Document type (Delivery Order).
- **`[CLIENTTYPE]`**: Client classification (`PHM` or `OTHER`).
- **`[ROMAN_MONTH]`**: Current calendar month in uppercase Roman numerals (`I` &ndash; `XII`).
- **`[YEAR]`**: 4-digit Gregorian calendar year (e.g. `2026`).

*Example*: `001/ALS-BPN/DO-PHM/IX/2026`

Sequence allocation is locked using PostgreSQL atomic increment on the `do_sequences` table to eliminate race conditions under concurrent issuance.

---

## 4. Immutable Historical Snapshots

When a Delivery Order is issued, AWMS freezes a complete snapshot of all metadata into `delivery_orders` and `delivery_order_items`:

- `client_company_name`, `client_type`, `attn_name`, `attn_phone`, `attn_email`
- `project_name`, `project_location`, `site_code`, `reference_number`
- `warehouse_name`, `warehouse_city_code`
- Item attributes: `item_name`, `brand`, `model_number`, `unit_name`, `unit_symbol`, `tracking_type`, `serial_number`, `condition_label`

Subsequent edits or deactivations of clients, projects, or items will never alter historical printed DOs.

---

## 5. Print Layout Specifications

- **Page Format**: A4 Landscape (`297mm` &times; `210mm`).
- **Header**: Neutral ALSSA logo placeholder, official company header, document title, and DO reference block.
- **Item Table**: 2-column serial number presentation (up to 10 serials per table row) for compact readability.
- **Multi-page Support**: Automatic table headers and page numbering (`Page X of Y`) in footers.
- **Signatures**: Quad-box signoff section (Prepared By, Warehouse Keeper, Transporter / Courier, Received By).
