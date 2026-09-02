# 10 - Backup & Restore Guide

This guide describes the disaster recovery, backup schedules, and restore verification procedures for the AWMS PostgreSQL database.

---

## 1. Backup Schedule Strategy

| Frequency | Retention Period | Description |
| :--- | :--- | :--- |
| **Hourly (WAL Archiving)** | 7 days | Point-in-time recovery capability. |
| **Daily Dump (Logical Backup)** | 30 days | Compressed `.sql.gz` dump executed during low-traffic windows. |
| **Weekly Snapshot** | 90 days | Stored in off-site encrypted object storage. |
| **Pre-Migration Backup** | Indefinite | Required before executing any Prisma schema migration. |

---

## 2. Performing a Logical Backup

Run `pg_dump` to create an encrypted, timestamped database dump:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/awms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/awms_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Execute compressed PostgreSQL dump
pg_dump -U awms_user -h localhost -d awms -F p | gzip -9 > "${FILENAME}"

echo "Backup completed: ${FILENAME}"
```

---

## 3. Database Restore Procedure

To restore AWMS database from an existing logical dump file:

```bash
# 1. Terminate active backend processes to release database connection locks
pm2 stop awms-backend

# 2. Decompress and restore into PostgreSQL
gunzip -c /var/backups/awms/awms_backup_20260902_120000.sql.gz | psql -U awms_user -h localhost -d awms

# 3. Restart backend service
pm2 restart awms-backend
```

---

## 4. Periodic Restore Verification Drill

At least once per quarter, perform a test restore on an isolated staging database:

1. Restore the production backup file into a temporary database: `awms_drill`.
2. Run database integrity and count verification queries against `users`, `stock_movements`, `delivery_orders`, and `warehouse_stocks`.
3. Verify that all sequence counters in `do_sequences` match the latest issued documents.
