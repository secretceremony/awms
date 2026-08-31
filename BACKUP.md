# AWMS Database Backup & Restore Guide

This guide details the standard operational procedures for securing, backing up, and restoring the AWMS PostgreSQL database.

---

## 1. Backup Strategy (Recommended)

- **Frequency**: Weekly (e.g., every Sunday at 02:00 AM local time).
- **Format**: Custom archive format (`-Fc`) using `pg_dump`. This format is compressed and allows selective restores or re-ordering of data insertions.
- **Retention**: Keep the last 4 weekly backups.

---

## 2. Backup Procedure

To perform a manual backup of the database, run the following command:

```bash
# Variables
BACKUP_DIR="/Users/mac/.gemini/antigravity/backups"
DB_NAME="awms"
DB_USER="mac"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run pg_dump
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -Fc -f "$BACKUP_FILE"
```

### Automation via Cron (Scheduled Backups)
To schedule a weekly backup every Sunday at 2 AM, add the following cron expression using `crontab -e`:

```cron
0 2 * * 0 pg_dump -h localhost -U mac -d awms -Fc -f /Users/mac/.gemini/antigravity/backups/awms_weekly_$(date +\%F).dump
```

---

## 3. Restore Procedure

To restore the database from a backup file, perform the following steps:

> [!WARNING]
> Restoring a database will overwrite the existing tables. Ensure you take a snapshot of the current state before restoring!

### Step 3.1: Terminate Active Connections
Terminate any active connections to the database to prevent table locks:
```sql
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'awms'
  AND pid <> pg_backend_pid();
```

### Step 3.2: Recreate Database (Clean Slate)
```bash
dropdb -h localhost -U mac awms
createdb -h localhost -U mac awms
```

### Step 3.3: Execute pg_restore
Restore schema and records using `pg_restore`:
```bash
pg_restore -h localhost -U mac -d awms --no-owner --role=mac -v "/Users/mac/.gemini/antigravity/backups/awms_backup_YYYYMMDDHHMMSS.dump"
```
