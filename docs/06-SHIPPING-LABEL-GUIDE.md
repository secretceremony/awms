# 06 - Shipping Label Guide

This document describes the generation, customization, and printing of logistics package Shipping Labels in AWMS.

---

## 1. Shipping Label Sources

AWMS supports two generation pathways:

```
                  ┌───────────────────────────────┐
                  │      Label Source Choice      │
                  └───────┬───────────────┬───────┘
                          │               │
       [ From Issued DO ] │               │ [ Standalone ]
                          ▼               ▼
           ┌──────────────────────┐   ┌──────────────────────┐
           │ Auto-fills:          │   │ Operator enters:     │
           │ • Recipient Company  │   │ • Recipient Company  │
           │ • Attn / PIC         │   │ • Destination Site   │
           │ • Destination Site   │   │ • Optional Reference │
           │ • Reference Number   │   │ • Optional Notes     │
           │ • DO Number          │   │                      │
           └──────────────────────┘   └──────────────────────┘
```

1. **From Issued Delivery Order**: Reads the frozen snapshot from an issued DO. Does not alter the original DO record.
2. **Standalone Shipping Label**: Used for direct parcel shipments, ad-hoc equipment transfers, or supplier consignments that do not have an internal Delivery Order.

---

## 2. Sender Information Configuration

Default sender metadata is managed centrally under **Settings &rarr; Delivery**:

- **Sender Company Name**: `delivery.senderName`
- **Sender Dispatch Address**: `delivery.senderAddress`
- **Sender Phone Number**: `delivery.senderPhone`

When creating a new shipping label, AWMS automatically populates these values from system settings, while permitting temporary operational overrides on a per-label basis.

---

## 3. Package Handling & Fragile Indicators

- **Fragile Toggle**: When set to `YES`, the label displays a bold, high-visibility **`⚠️ FRAGILE / HANDLE WITH CARE`** header in both preview and print.
- **Handling Notes**: Free-text field for package handling instructions (e.g. `KEEP DRY`, `THIS SIDE UP`, `DO NOT STACK`).

---

## 4. Physical Dimensions & Print Output

- **Units**: Dimensions are configured and stored in millimeters (`mm`), defaulting to standard packaging label sizes (`100mm` &times; `150mm`).
- **Print Optimization**:
  - High-contrast, clean black-and-white typography for thermal and laser printers.
  - Suppressed browser headers and footers (no page URLs or timestamps in print margins).
  - Clear hierarchy: Bold Recipient & Destination blocks visible from courier handling distances.
