# 02 - User Guide

This guide provides step-by-step operational instructions for Logistics Administrators operating AWMS.

---

## 1. Authentication & Sign In

1. Open the AWMS web application in your browser (`http://localhost:5173` or your production domain).
2. Enter your **Email Address** and **Password**.
3. Click **Sign In**.
4. You will be directed to the **Operations Dashboard**.

---

## 2. Master Data Setup

### 2.1 Creating a Client & Primary Contact
1. Navigate to **Master Data &rarr; Clients**.
2. Click **+ Add Client**.
3. Select the **Client Type** using the toggle: `[ PHM ]` or `[ Other ]`.
4. Fill in the mandatory **Company Name** (e.g. `PT Pertamina Hulu Mahakam`).
5. Optionally fill in **Company Code**, **Phone**, **Email**, and **Office Address**.
6. (Optional) In the **Primary Contact** section, enter the contact person's **Full Name**, **Phone Number**, and **Email**.
7. Click **Save Client**.

### 2.2 Creating a Project
1. Navigate to **Master Data &rarr; Projects**.
2. Click **+ Add Project**.
3. Select the **Client** from the dropdown. If the client has exactly one active contact, it will be automatically selected.
4. Enter the **Project Name** and mandatory **Site Code** (e.g. `BPN-01`, `SNG-FIELD`).
5. (Optional) Enter the **Reference Number** (PO / Contract number). Note: Reference Number is optional on creation, but mandatory before issuing a Delivery Order.
6. The **Start Date** defaults to today. Enter the project **Location / Site Address**.
7. Click **Save Project**.

---

## 3. Item Master Catalog Setup

1. Navigate to **Inventory &rarr; Stock List**.
2. Click **+ Create Item Master**.
3. Enter the **Item Name** (e.g. `Cisco Industrial Switch IE-4000`), **Brand**, and **Model Number**.
4. Explicitly select the **Tracking Type** using the toggle: `[ Bulk ]` or `[ Serialized ]`.
5. Select the **Unit of Measurement** (e.g. `pcs`, `box`, `roll`). AWMS will remember your selected unit for future entries.
6. Click **Save Item**.

---

## 4. Opening Balances (Initial Stock)

1. Navigate to **Inventory &rarr; Stock List**.
2. Click **Initial Stock**.
3. Select the **Target Warehouse** and verify the **Transaction Date** (defaults to today).
4. Select the **Item**:
   - **For Bulk Items**: Enter the initial physical count quantity.
   - **For Serialized Items**: Type or paste serial numbers (one per line). Select the initial condition (`Standby Good`, `Standby Bad`, `Under Repair`).
5. Enter optional **Notes**.
6. Click **Save Initial Stock** or click **Save & Add Another** to immediately enter the next item while keeping the selected warehouse and date.

---

## 5. Warehouse Intake (Regular Incoming)

1. Navigate to **Inventory &rarr; Incoming**.
2. Click **+ Record Incoming**.
3. In **Incoming Source**, ensure `[ External Incoming ]` is selected.
4. Select the **Destination Warehouse Hub**.
5. Enter the external **Vendor / Reference No** (e.g. Supplier invoice or waybill number).
6. In **Item Entries**, add line items (Bulk quantity or Serial numbers with condition labels).
7. Click **Save Incoming** or click **Save & Add Another** for rapid multi-batch intake.

---

## 6. Recovering Site Assets (Project Return / Recheck)

1. Navigate to **Inventory &rarr; Incoming**.
2. Click **+ Record Incoming**.
3. In **Incoming Source**, switch to `[ Project Return / Recheck ]`.
4. Select the **Source Project** (supports both ACTIVE and COMPLETED projects) and the receiving **Destination Warehouse Hub**.
5. The modal will load all assets currently deployed at that project:
   - **Bulk Assets**: Enter the quantity to return.
   - **Serialized Assets**: Check the serial numbers being returned (use **Select All** / **Deselect All** if returning whole batches). Verify or update each serial's returned condition (`Standby Good`, `Standby Bad`, `Under Repair`).
6. Enter mandatory **Return Reason / Notes**.
7. Click **Process Return**. The returned inventory immediately reflects in warehouse stock.

---

## 7. Direct Warehouse Dispatch (Outgoing)

1. Navigate to **Inventory &rarr; Outgoing**.
2. Click **+ Record Outgoing**.
3. **Step 1 — Destination**: Select the destination **Active Project**, verify **Movement Date**, and enter the **Dispatch Reason / Notes**.
4. Click **Next: Select Inventory &rarr;**.
5. **Step 2 — Inventory Selection**: Use the **Inventory Picker** to search and add bulk stocks and serialized assets from a single source warehouse.
6. Click **Confirm & Dispatch Outgoing**.

---

## 8. Delivery Order Issuance & Printing

1. Navigate to **Delivery &rarr; Delivery Orders**.
2. Click **+ Create Delivery Order**.
3. **Step 1 — Delivery Information**:
   - Select the target **Active Project**.
   - *Validation Rule*: If the selected project does not have a **Reference Number**, AWMS will block progression and prompt you to enter the Reference Number in the project settings.
   - Verify **DO Date** and enter the **Activity** (free-text description of work, e.g. `Deployment of Microwave Links`).
4. Click **Next: Select Items &rarr;**.
5. **Step 2 — Items & PIC**:
   - Add items from the source warehouse using the inventory picker.
   - Enter the internal field **PIC** (e.g. `Ahmad Kurniawan`) or use **Apply PIC to All Items**.
   - Review item remarks and quantities.
6. Click **Save as Draft**.
7. In the Delivery Order list, click on the draft DO to view details, then click **Issue Delivery Order**.
8. In the post-issue dialog:
   - Click **Print Now** to open the print-ready A4 landscape document.
   - Click **Save / Print PDF** to generate an electronic copy.

---

## 9. Generating & Printing Shipping Labels

1. Navigate to **Delivery &rarr; Shipping Labels**.
2. Click **+ Generate Shipping Label**.
3. Choose **Label Source**:
   - `[ From Issued Delivery Order ]`: Select an issued DO to auto-fill recipient, project site, reference number, and DO number.
   - `[ Standalone Package Label ]`: Manually enter Recipient Company and Site Destination.
4. Verify the **Ship Date** (defaults to today).
5. If the package contains sensitive equipment, toggle **Fragile Package?** to `YES` and enter **Handling Notes** (e.g. `KEEP DRY, THIS SIDE UP`).
6. Verify or adjust the label dimensions (defaults to 100mm &times; 150mm).
7. Click **Generate Shipping Label**.
8. In the detail modal, click **Print Shipping Label** for a high-contrast, package-ready printout.

---

## 10. Physical Stock Adjustments

1. Navigate to **Inventory &rarr; Stock List** (or **Movement History**).
2. Click the **Adjust** (sliders icon) button on any item row.
3. The modal opens with pre-filled, locked Item and Warehouse context:
   - **For Bulk Items**: Enter the count difference (+/- quantity).
   - **For Serialized Items**: Select one or multiple serial numbers in the warehouse and assign each individual unit its updated condition (`Standby Good`, `Standby Bad`, `Under Repair`).
4. Enter the mandatory **Reason for Adjustment** (e.g. `Quarterly warehouse cycle count`).
5. Click **Submit Adjustment**. All changes execute in one atomic transaction.
