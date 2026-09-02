# 12 - Troubleshooting Guide

This guide provides diagnostics and resolutions for common technical and operational issues in AWMS.

---

## 1. Technical & Environment Issues

### 1.1 Database Connection Failure (`P1001` / `P1003`)
- **Symptom**: Backend fails to start with `PrismaClientKnownRequestError: Can't reach database server at localhost:5432`.
- **Cause**: PostgreSQL service is stopped or `DATABASE_URL` in `backend/.env` is incorrect.
- **Resolution**:
  1. Check PostgreSQL service: `sudo systemctl status postgresql` or `brew services list`.
  2. Verify credentials and database existence: `psql -U awms_user -d awms`.
  3. Ensure `DATABASE_URL` is set in `backend/.env`.

### 1.2 Port Already in Use (`EADDRINUSE: 3000` or `5173`)
- **Symptom**: Server crashes on startup stating port is busy.
- **Resolution**:
  ```bash
  # Identify and terminate process holding port 3000
  lsof -i :3000
  kill -9 <PID>
  ```

### 1.3 CORS / Frontend Cannot Reach API
- **Symptom**: Browser console displays `Cross-Origin Request Blocked`.
- **Resolution**:
  1. Verify `FRONTEND_URL` in `backend/.env` matches your browser URL (e.g. `http://localhost:5173`).
  2. Ensure requests include credentials (`withCredentials: true`) for cookie sessions.

---

## 2. Operational & Business Logic Scenarios

### 2.1 "This project requires a Reference Number before a Delivery Order can be created"
- **Cause**: Delivery Orders require an external Purchase Order or Contract Reference Number for legal and tracking compliance.
- **Resolution**: Navigate to **Master Data &rarr; Projects**, edit the project, enter the **Reference Number**, and re-open the Delivery Order form.

### 2.2 Serial Numbers Not Showing in Outgoing / Delivery Order Picker
- **Cause**: The selected serial numbers are either:
  1. Not located in the selected source warehouse (`currentWarehouseId != warehouse.id`).
  2. Already deployed at a project site (`currentProjectId IS NOT NULL`).
  3. Deactivated or assigned to another pending draft.
- **Resolution**: Check **Inventory &rarr; Stock List** with `Tracking Type = Serialized` to verify the asset's current warehouse allocation and condition.

### 2.3 Insufficient Bulk Stock Error
- **Cause**: Attempting to dispatch more bulk units than currently exist in `warehouse_stocks`.
- **Resolution**: Verify stock levels in the Stock List. If physical stock exists in the warehouse, perform an **Initial Stock** intake or **Adjustment** cycle count first.

### 2.4 Dropdown Lists Empty (No Clients / Warehouses / Units)
- **Cause**: Master records are either not seeded or have been marked as inactive (`isActive = false`).
- **Resolution**: Navigate to Master Data pages and ensure the relevant entries are active. Run `npm run seed` in backend if working in a fresh development environment.
