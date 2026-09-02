# 11 - Audit & Archive Guide

This document outlines compliance policies, record retention standards, and document archiving guidelines for AWMS.

---

## 1. Compliance & Retention Principles

AWMS enforces rigorous immutability for all historical logistics and financial transactions:

1. **Issued Delivery Orders are Frozen**: Once issued, a Delivery Order is a legally binding dispatch record. It cannot be modified or deleted.
2. **Movement History is Immutable**: The `stock_movements` ledger functions as a write-only audit trail. Movements cannot be deleted or mutated; corrections are recorded via formal `ADJUSTMENT` transactions.
3. **Audit Logs are Permanent**: Administrative changes (`CREATE`, `UPDATE`, `DELETE`, `ISSUE`, `PRINT`) are recorded in `audit_logs` capturing the user ID, timestamp, and before/after payloads.
4. **Soft Deactivation Over Hard Deletion**: Master data records (Clients, Projects, Warehouses, Item Masters) that have been used in past movements or DOs must be deactivated rather than deleted.

---

## 2. Records Subject to Long-Term Retention

- **Issued Delivery Orders**: Retain for a minimum of 5 years (or project duration + statutory period).
- **Physical Shipping Labels**: Retain digital logs and carrier dispatch receipts.
- **Stock Movement Ledger**: Retain indefinitely as the baseline inventory book.
- **Audit Logs**: Retain indefinitely for internal governance and security compliance.
- **Project Contract & PO Records**: Retain throughout active project lifecycle and 3 years post-completion.

---

## 3. Recommended Document Archival Structure

For organizations maintaining offline PDF/printed archives of generated logistics documents, the following folder hierarchy is recommended:

```
Archive/
  └── 2026/
      ├── Delivery-Orders/
      │   ├── DO_001_ALS-BPN_DO-PHM_IX_2026.pdf
      │   └── DO_002_ALS-BPN_DO-OTHER_IX_2026.pdf
      ├── Shipping-Labels/
      │   ├── LABEL_001_PHM_Handil-Hub_2026-09-02.pdf
      │   └── LABEL_002_BADAK_Bontang_2026-09-02.pdf
      ├── Reports/
      └── Backup-Records/
```

### Standard Naming Convention
- **Delivery Orders**: `DO_[Sequence]_[Company]-[City]_DO-[ClientType]_[Month]_[Year].pdf`
  - *Example*: `DO_001_ALS-BPN_DO-PHM_IX_2026.pdf`
- **Shipping Labels**: `LABEL_[ID]_[Recipient]_[Destination]_[YYYY-MM-DD].pdf`
  - *Example*: `LABEL_042_PHM_Sanga-Sanga_2026-09-02.pdf`
