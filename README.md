# Wellness Medical Store Billing System

A complete, production-grade pharmacy billing, inventory control, and invoice management system built for **Wellness Medical Store**.

---

## Features

### 1. Counter Billing (POS)
- **Automatic Bill Numbering**: Formatted as `WMS-YYYY-XXXX` with guaranteed sequence uniqueness.
- **Customer Directory & Auto-suggest**: Live phone number lookup with automatic prefill of existing patient records, addresses, and prescribing physicians.
- **Medicine Auto-lookup**: Instant search across brand names, generic compositions, and SKU codes from real inventory.
- **Batch & Expiry Tracking**: Auto-populated batch numbers and expiry dates for pharmaceutical compliance.
- **Live Financial Calculations**: Instant subtotal, itemized line discounts, and balance due using safe integer paise arithmetic.
- **GST Rate Engine**: Configurable GST rates (0%, 5%, 12%, 18%, 28%) with support for Intra-State (CGST + SGST 50-50 split) and Inter-State (IGST) taxation.
- **Stock Guard**: Prevents billing quantities exceeding currently available inventory.

### 2. Professional Invoices & Receipts
- **Pharmacy Letterhead**: Store name, logo Rx emblem, store address, statutory GSTIN, Drug License numbers (DL Form 20B/21B), and Registered Pharmacist name.
- **Printable Invoices**: Clean `@media print` layout engineered for standard A4 sheets and thermal receipts.
- **Instant PDF Generation**: Direct client-side PDF downloads using `jspdf` without third-party dependencies.
- **Indian Currency in Words**: Automatic conversion into Indian English prose (e.g. *"Rupees Six Hundred Forty-Nine Only"*).

### 3. Billing Ledger & History
- Comprehensive searchable audit trail of all generated invoices.
- Filter by date presets (*Today*, *Yesterday*, *Last 7 Days*, *This Month*, or *Custom Range*).
- Status filtering (*Paid in Full*, *Partial Due*, *Unpaid*).
- **Payment Collection**: Record payments against outstanding balances with instant balance reduction.

### 4. Medicine Master & Inventory Control
- Live stock balances with min-stock alert thresholds.
- Add, edit, restock, and delete medicines.
- Sample catalog of common OTC and prescription medicines pre-seeded.

### 5. Analytics Dashboard
- Today's sales volume and invoice count.
- Outstanding customer dues tracker.
- Visual 7-day revenue trend chart.
- Low-stock and expiring medicine alerts.

---

## Technical Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, jsPDF.
- **Backend**: Node.js & Express running in full-stack mode with Vite.
- **Database**: SQLite with persistent disk storage (`data/wellness_store.sqlite`) using `sql.js`.
- **Port**: Runs on port 3000 (`0.0.0.0:3000`).

---

## Quick Start Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

3. **Build and run for production**:
   ```bash
   npm run build
   npm run start
   ```

---

## Pre-loaded Sample Medicines
The SQLite database automatically initializes with sample medicines on first run, including:
- Paracetamol 650mg (Dolo)
- Amoxicillin & Pot. Clavulanate (Augmentin 625)
- Pantoprazole Gastro-Resistant (Pan-40)
- Azithromycin Tablets IP 500mg (Azee-500)
- Cetirizine HCl 10mg (Cetzine)
- Montair-LC, Glycomet 500mg, Telma 40, Ascoril-D, Volini Gel, Electral ORS, and Digital Clinical Thermometers.
