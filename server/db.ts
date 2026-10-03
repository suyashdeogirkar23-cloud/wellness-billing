import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'wellness_store.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  initSchema(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      mrp REAL NOT NULL,
      selling_price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 15,
      unit TEXT DEFAULT 'Strips',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      doctor_name TEXT,
      total_purchases REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT,
      doctor_name TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 12,
      tax_type TEXT NOT NULL DEFAULT 'cgst_sgst',
      tax_amount REAL NOT NULL DEFAULT 0,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL,
      paid_amount REAL NOT NULL,
      balance_due REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      medicine_id INTEGER,
      medicine_code TEXT,
      medicine_name TEXT NOT NULL,
      batch_number TEXT,
      expiry_date TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL,
      FOREIGN KEY(bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default store settings if not present
  const checkSettings = db.exec("SELECT COUNT(*) as count FROM store_settings;");
  const count = checkSettings[0]?.values[0]?.[0] as number;
  if (!count || count === 0) {
    const defaultSettings: Record<string, string> = {
      store_name: "Wellness Medical Store",
      tagline: "Your Trusted Healthcare & Pharmacy Partner",
      address: "Shop No. 12, Ground Floor, Healthway Complex, MG Road",
      city_state_pin: "Bangalore, Karnataka - 560001",
      phone: "+91 98765 43210 / 080-25489012",
      email: "billing@wellnessmedical.in",
      gstin: "29AAAAA0000A1Z5",
      dl_number: "KA-BLR-2024-004521 / 004522",
      pharmacist_name: "R. Sharma, B.Pharm (Reg. #KA-84920)",
      default_tax_rate: "12",
      tax_type: "cgst_sgst",
      invoice_terms: "1. Medicines once sold cannot be returned without original cash memo.\n2. Keep medicines stored in cool & dry place.\n3. Please consult a registered medical practitioner before consumption.",
      currency_symbol: "₹",
      inventory_tracking_enabled: "true"
    };

    for (const [k, v] of Object.entries(defaultSettings)) {
      db.run("INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);", [k, v]);
    }
  }

  // Seed sample medicines if table is empty
  const checkMedicines = db.exec("SELECT COUNT(*) as count FROM medicines;");
  const medCount = checkMedicines[0]?.values[0]?.[0] as number;
  if (!medCount || medCount === 0) {
    const now = new Date().toISOString();
    const sampleMedicines = [
      { code: 'MED-101', name: 'Paracetamol 650mg (Dolo)', generic_name: 'Paracetamol', category: 'Analgesic / Antipyretic', batch: 'DL-24B01', exp: '2027-08-31', mrp: 35.0, price: 30.5, stock: 120, min: 20, unit: 'Strips' },
      { code: 'MED-102', name: 'Amoxicillin & Pot. Clavulanate (Augmentin 625)', generic_name: 'Amoxicillin + Clavulanic Acid', category: 'Antibiotic', batch: 'AG-24H12', exp: '2026-11-30', mrp: 210.0, price: 185.0, stock: 45, min: 15, unit: 'Strips' },
      { code: 'MED-103', name: 'Pantoprazole Gastro-Resistant (Pan-40)', generic_name: 'Pantoprazole 40mg', category: 'Antacid / PPI', batch: 'PN-24K09', exp: '2027-04-30', mrp: 165.0, price: 145.0, stock: 80, min: 20, unit: 'Strips' },
      { code: 'MED-104', name: 'Azithromycin Tablets IP 500mg (Azee-500)', generic_name: 'Azithromycin', category: 'Antibiotic', batch: 'AZ-24C03', exp: '2026-12-31', mrp: 130.0, price: 115.0, stock: 8, min: 15, unit: 'Strips' }, // low stock
      { code: 'MED-105', name: 'Cetirizine Hydrochloride 10mg (Cetzine)', generic_name: 'Cetirizine HCl', category: 'Antiallergic', batch: 'CT-24M05', exp: '2028-01-31', mrp: 42.0, price: 38.0, stock: 150, min: 25, unit: 'Strips' },
      { code: 'MED-106', name: 'Montelukast & Levocetirizine (Montair-LC)', generic_name: 'Montelukast + Levocetirizine', category: 'Respiratory / Antiallergic', batch: 'ML-24A08', exp: '2027-09-30', mrp: 220.0, price: 195.0, stock: 65, min: 20, unit: 'Strips' },
      { code: 'MED-107', name: 'Metformin Sustained Release 500mg (Glycomet)', generic_name: 'Metformin HCl', category: 'Antidiabetic', batch: 'GL-24E02', exp: '2027-06-30', mrp: 55.0, price: 48.0, stock: 95, min: 30, unit: 'Strips' },
      { code: 'MED-108', name: 'Telmisartan Tablets IP 40mg (Telma 40)', generic_name: 'Telmisartan', category: 'Antihypertensive', batch: 'TL-24D11', exp: '2027-07-31', mrp: 180.0, price: 155.0, stock: 12, min: 20, unit: 'Strips' }, // low stock
      { code: 'MED-109', name: 'Cough Relief Syrup 100ml (Ascoril-D)', generic_name: 'Dextromethorphan + Chlorpheniramine', category: 'Cough Syrup', batch: 'AS-24F04', exp: '2026-10-31', mrp: 125.0, price: 110.0, stock: 40, min: 15, unit: 'Bottles' },
      { code: 'MED-110', name: 'Vitamin C & Zinc Chewable (Limcee 500mg)', generic_name: 'Ascorbic Acid + Zinc', category: 'Supplements / Vitamins', batch: 'LM-24G07', exp: '2027-12-31', mrp: 30.0, price: 26.0, stock: 200, min: 30, unit: 'Strips' },
      { code: 'MED-111', name: 'Diclofenac Gel 30g (Volini)', generic_name: 'Diclofenac Diethylamine', category: 'Topical Analgesic', batch: 'VL-24J10', exp: '2026-08-31', mrp: 145.0, price: 130.0, stock: 5, min: 10, unit: 'Tubes' }, // low stock & expiring soon
      { code: 'MED-112', name: 'Oral Rehydration Salts IP (Electral ORS 21.8g)', generic_name: 'Oral Electrolytes', category: 'Hydration / Electrolytes', batch: 'EL-24L06', exp: '2028-02-28', mrp: 22.0, price: 19.5, stock: 180, min: 40, unit: 'Sachets' },
      { code: 'MED-113', name: 'Atorvastatin Tablets IP 10mg (Atorva 10)', generic_name: 'Atorvastatin', category: 'Cardiovascular / Statins', batch: 'AT-24N01', exp: '2027-05-31', mrp: 115.0, price: 98.0, stock: 70, min: 20, unit: 'Strips' },
      { code: 'MED-114', name: 'Digital Clinical Thermometer', generic_name: 'Medical Device', category: 'Diagnostic & Devices', batch: 'DT-2024', exp: '2030-12-31', mrp: 250.0, price: 210.0, stock: 25, min: 5, unit: 'Pieces' },
      { code: 'MED-115', name: 'Omeprazole Capsules IP 20mg (Omez)', generic_name: 'Omeprazole', category: 'Antacid / Gastro', batch: 'OM-24P03', exp: '2027-03-31', mrp: 70.0, price: 60.0, stock: 110, min: 20, unit: 'Strips' }
    ];

    for (const med of sampleMedicines) {
      db.run(`
        INSERT INTO medicines (code, name, generic_name, category, batch_number, expiry_date, mrp, selling_price, stock, min_stock_alert, unit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [med.code, med.name, med.generic_name, med.category, med.batch, med.exp, med.mrp, med.price, med.stock, med.min, med.unit, now, now]);
    }
  }

  // Seed sample customers & past bills if no bills exist yet
  const checkBills = db.exec("SELECT COUNT(*) as count FROM bills;");
  const billCount = checkBills[0]?.values[0]?.[0] as number;
  if (!billCount || billCount === 0) {
    const today = new Date();
    const formatDate = (daysAgo: number, hoursAgo = 0) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(d.getHours() - hoursAgo);
      return d.toISOString();
    };

    // Sample customers
    const sampleCusts = [
      { name: 'Rajesh Kumar', phone: '9845012345', address: 'Flat 302, Green Glen Layout, Bellandur', doctor: 'Dr. Vivek Rao, MD', purchases: 1245.0, balance: 0 },
      { name: 'Priya Sharma', phone: '9731298765', address: '14, 5th Cross, Indiranagar', doctor: 'Dr. Sunita Sen, MBBS', purchases: 640.0, balance: 140.0 },
      { name: 'Amitabh Deshmukh', phone: '9900881122', address: '204, Prestige Palms, Whitefield', doctor: 'Dr. K. N. Murthy', purchases: 2450.0, balance: 0 },
      { name: 'Sneha Patel', phone: '9123456780', address: 'B-12, Palm Meadows, Koramangala', doctor: 'Dr. Ramesh Kumar', purchases: 490.0, balance: 0 }
    ];

    for (const c of sampleCusts) {
      db.run(`
        INSERT INTO customers (name, phone, address, doctor_name, total_purchases, outstanding_balance, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `, [c.name, c.phone, c.address, c.doctor, c.purchases, c.balance, formatDate(3)]);
    }

    // Bill 1: Today
    const b1Date = formatDate(0, 2);
    db.run(`
      INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, customer_address, doctor_name, subtotal, discount_amount, tax_rate, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, balance_due, payment_mode, payment_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, ['WMS-2026-0001', 1, 'Rajesh Kumar', '9845012345', 'Flat 302, Green Glen Layout, Bellandur', 'Dr. Vivek Rao, MD', 610.0, 30.5, 12, 'cgst_sgst', 69.54, 34.77, 34.77, 0, 649.04, 649.04, 0, 'UPI', 'Paid', 'Regular monthly prescription refill', b1Date]);

    const b1Id = db.exec("SELECT last_insert_rowid() as id;")[0].values[0][0] as number;
    db.run(`
      INSERT INTO bill_items (bill_id, medicine_id, medicine_code, medicine_name, batch_number, expiry_date, quantity, unit_price, discount_percent, discount_amount, total_price)
      VALUES 
      (?, 1, 'MED-101', 'Paracetamol 650mg (Dolo)', 'DL-24B01', '2027-08-31', 2, 30.5, 5, 3.05, 57.95),
      (?, 3, 'MED-103', 'Pantoprazole Gastro-Resistant (Pan-40)', 'PN-24K09', '2027-04-30', 2, 145.0, 5, 14.5, 275.5),
      (?, 7, 'MED-107', 'Metformin Sustained Release 500mg (Glycomet)', 'GL-24E02', '2027-06-30', 4, 48.0, 6.75, 12.96, 179.04);
    `, [b1Id, b1Id, b1Id]);

    // Bill 2: Today with balance
    const b2Date = formatDate(0, 1);
    db.run(`
      INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, customer_address, doctor_name, subtotal, discount_amount, tax_rate, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, balance_due, payment_mode, payment_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, ['WMS-2026-0002', 2, 'Priya Sharma', '9731298765', '14, 5th Cross, Indiranagar', 'Dr. Sunita Sen, MBBS', 570.0, 0, 12, 'cgst_sgst', 68.4, 34.2, 34.2, 0, 638.4, 500.0, 138.4, 'Cash', 'Partial', 'Balance to be cleared tomorrow', b2Date]);

    const b2Id = db.exec("SELECT last_insert_rowid() as id;")[0].values[0][0] as number;
    db.run(`
      INSERT INTO bill_items (bill_id, medicine_id, medicine_code, medicine_name, batch_number, expiry_date, quantity, unit_price, discount_percent, discount_amount, total_price)
      VALUES 
      (?, 2, 'MED-102', 'Amoxicillin & Pot. Clavulanate (Augmentin 625)', 'AG-24H12', '2026-11-30', 2, 185.0, 0, 0, 370.0),
      (?, 6, 'MED-106', 'Montelukast & Levocetirizine (Montair-LC)', 'ML-24A08', '2027-09-30', 1, 195.0, 0, 0, 195.0);
    `, [b2Id, b2Id]);

    // Bill 3: Yesterday
    const b3Date = formatDate(1, 4);
    db.run(`
      INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, customer_address, doctor_name, subtotal, discount_amount, tax_rate, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount, grand_total, paid_amount, balance_due, payment_mode, payment_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, ['WMS-2026-0003', 3, 'Amitabh Deshmukh', '9900881122', '204, Prestige Palms, Whitefield', 'Dr. K. N. Murthy', 1315.0, 65.75, 12, 'cgst_sgst', 149.91, 74.95, 74.96, 0, 1399.16, 1399.16, 0, 'Card', 'Paid', 'Cardiac & diabetic medications', b3Date]);

    const b3Id = db.exec("SELECT last_insert_rowid() as id;")[0].values[0][0] as number;
    db.run(`
      INSERT INTO bill_items (bill_id, medicine_id, medicine_code, medicine_name, batch_number, expiry_date, quantity, unit_price, discount_percent, discount_amount, total_price)
      VALUES 
      (?, 8, 'MED-108', 'Telmisartan Tablets IP 40mg (Telma 40)', 'TL-24D11', '2027-07-31', 4, 155.0, 5, 31.0, 589.0),
      (?, 13, 'MED-113', 'Atorvastatin Tablets IP 10mg (Atorva 10)', 'AT-24N01', '2027-05-31', 4, 98.0, 5, 19.6, 372.4),
      (?, 14, 'MED-114', 'Digital Clinical Thermometer', 'DT-2024', '2030-12-31', 1, 210.0, 5, 10.5, 199.5);
    `, [b3Id, b3Id, b3Id]);
  }
}

/**
 * Helper to run query and return array of objects
 */
export function queryAll<T = Record<string, any>>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = Record<string, any>>(db: Database, sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(db, sql, params);
  return results.length > 0 ? results[0] : null;
}
