import { Router, Request, Response } from 'express';
import { getDb, saveDb, queryAll, queryOne } from './db';

export const apiRouter = Router();

// -------------------------------------------------------------
// Helper math: round to 2 decimals using integer paise arithmetic
// -------------------------------------------------------------
function roundPaise(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// -------------------------------------------------------------
// 1. DASHBOARD
// -------------------------------------------------------------
apiRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Today's sales & bill count
    const todayStats = queryOne<{ total_sales: number; bill_count: number; total_paid: number; total_balance: number }>(
      db,
      `SELECT 
        COALESCE(SUM(grand_total), 0) as total_sales,
        COUNT(id) as bill_count,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance_due), 0) as total_balance
       FROM bills 
       WHERE date(created_at) = date(?);`,
      [today]
    );

    // Total outstanding balance across all bills
    const totalOutstanding = queryOne<{ outstanding: number }>(
      db,
      `SELECT COALESCE(SUM(balance_due), 0) as outstanding FROM bills WHERE balance_due > 0;`
    );

    // Total customers count
    const custCount = queryOne<{ count: number }>(
      db,
      `SELECT COUNT(*) as count FROM customers;`
    );

    // Total inventory stats
    const inventoryStats = queryOne<{ total_items: number; total_stock_value: number }>(
      db,
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(stock * selling_price), 0) as total_stock_value
       FROM medicines;`
    );

    // Low stock medicines
    const lowStockMedicines = queryAll(
      db,
      `SELECT id, code, name, category, stock, min_stock_alert, unit, selling_price 
       FROM medicines 
       WHERE stock <= min_stock_alert 
       ORDER BY stock ASC 
       LIMIT 10;`
    );

    // Expiring soon (within 90 days or expired)
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    const expiringSoon = queryAll(
      db,
      `SELECT id, code, name, category, batch_number, expiry_date, stock, unit 
       FROM medicines 
       WHERE expiry_date IS NOT NULL 
         AND expiry_date != '' 
         AND expiry_date <= ? 
       ORDER BY expiry_date ASC 
       LIMIT 10;`,
      [in90Days.toISOString().slice(0, 10)]
    );

    // Recent 6 bills
    const recentBills = queryAll(
      db,
      `SELECT id, bill_number, customer_name, customer_phone, grand_total, paid_amount, balance_due, payment_mode, payment_status, created_at 
       FROM bills 
       ORDER BY id DESC 
       LIMIT 6;`
    );

    // Sales by day for the last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const daySales = queryOne<{ total: number; count: number }>(
        db,
        `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(id) as count FROM bills WHERE date(created_at) = date(?);`,
        [dateStr]
      );
      last7Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: roundPaise(daySales?.total || 0),
        bills: daySales?.count || 0
      });
    }

    res.json({
      todaySales: roundPaise(todayStats?.total_sales || 0),
      todayBillsCount: todayStats?.bill_count || 0,
      todayPaid: roundPaise(todayStats?.total_paid || 0),
      todayBalance: roundPaise(todayStats?.total_balance || 0),
      totalOutstanding: roundPaise(totalOutstanding?.outstanding || 0),
      totalCustomers: custCount?.count || 0,
      totalMedicines: inventoryStats?.total_items || 0,
      totalStockValue: roundPaise(inventoryStats?.total_stock_value || 0),
      lowStockCount: lowStockMedicines.length,
      lowStockMedicines,
      expiringSoon,
      recentBills,
      last7Days
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard data' });
  }
});

// -------------------------------------------------------------
// 2. MEDICINES / INVENTORY
// -------------------------------------------------------------
apiRouter.get('/medicines', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || '').trim();
    const category = (req.query.category as string || '').trim();
    const lowStockOnly = req.query.low_stock === 'true';

    let sql = `SELECT * FROM medicines WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND (name LIKE ? OR code LIKE ? OR generic_name LIKE ? OR batch_number LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (lowStockOnly) {
      sql += ` AND stock <= min_stock_alert`;
    }

    sql += ` ORDER BY name ASC;`;
    const medicines = queryAll(db, sql, params);

    // Get unique categories for filter dropdown
    const categoriesRows = queryAll<{ category: string }>(
      db,
      `SELECT DISTINCT category FROM medicines WHERE category IS NOT NULL AND category != '' ORDER BY category ASC;`
    );
    const categories = categoriesRows.map(r => r.category);

    res.json({ medicines, categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch medicines' });
  }
});

apiRouter.post('/medicines', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      code,
      name,
      generic_name,
      category,
      batch_number,
      expiry_date,
      mrp,
      selling_price,
      stock,
      min_stock_alert,
      unit
    } = req.body;

    if (!name || !selling_price) {
      return res.status(400).json({ error: 'Medicine name and selling price are required' });
    }

    // Auto-generate code if omitted
    let medCode = (code || '').trim();
    if (!medCode) {
      const maxIdRow = queryOne<{ max_id: number }>(db, `SELECT MAX(id) as max_id FROM medicines;`);
      const nextNum = (maxIdRow?.max_id || 0) + 1;
      medCode = `MED-${String(nextNum).padStart(3, '0')}`;
    } else {
      // Check code uniqueness
      const existing = queryOne(db, `SELECT id FROM medicines WHERE code = ?;`, [medCode]);
      if (existing) {
        return res.status(400).json({ error: `Medicine code "${medCode}" is already in use.` });
      }
    }

    const now = new Date().toISOString();
    db.run(
      `INSERT INTO medicines (code, name, generic_name, category, batch_number, expiry_date, mrp, selling_price, stock, min_stock_alert, unit, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        medCode,
        name.trim(),
        (generic_name || '').trim(),
        (category || 'General').trim(),
        (batch_number || '').trim(),
        expiry_date || null,
        Number(mrp) || Number(selling_price),
        Number(selling_price),
        parseInt(stock, 10) || 0,
        parseInt(min_stock_alert, 10) || 10,
        (unit || 'Strips').trim(),
        now,
        now
      ]
    );

    saveDb();
    const inserted = queryOne(db, `SELECT * FROM medicines WHERE code = ?;`, [medCode]);
    res.status(201).json(inserted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create medicine' });
  }
});

apiRouter.put('/medicines/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const existing = queryOne(db, `SELECT * FROM medicines WHERE id = ?;`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const {
      code,
      name,
      generic_name,
      category,
      batch_number,
      expiry_date,
      mrp,
      selling_price,
      stock,
      min_stock_alert,
      unit
    } = req.body;

    // Check code collision with other medicines
    if (code) {
      const codeCheck = queryOne(db, `SELECT id FROM medicines WHERE code = ? AND id != ?;`, [code, id]);
      if (codeCheck) {
        return res.status(400).json({ error: `Medicine code "${code}" is used by another item.` });
      }
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE medicines 
       SET code = ?, name = ?, generic_name = ?, category = ?, batch_number = ?, expiry_date = ?, 
           mrp = ?, selling_price = ?, stock = ?, min_stock_alert = ?, unit = ?, updated_at = ?
       WHERE id = ?;`,
      [
        code || (existing as any).code,
        name || (existing as any).name,
        generic_name !== undefined ? generic_name : (existing as any).generic_name,
        category || (existing as any).category,
        batch_number !== undefined ? batch_number : (existing as any).batch_number,
        expiry_date !== undefined ? expiry_date : (existing as any).expiry_date,
        Number(mrp) || Number(selling_price) || (existing as any).mrp,
        Number(selling_price) || (existing as any).selling_price,
        stock !== undefined ? parseInt(stock, 10) : (existing as any).stock,
        min_stock_alert !== undefined ? parseInt(min_stock_alert, 10) : (existing as any).min_stock_alert,
        unit || (existing as any).unit,
        now,
        id
      ]
    );

    saveDb();
    const updated = queryOne(db, `SELECT * FROM medicines WHERE id = ?;`, [id]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update medicine' });
  }
});

apiRouter.post('/medicines/:id/stock-adjust', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const { adjustment, new_stock, reason } = req.body;

    const existing = queryOne<{ id: number; stock: number; name: string }>(
      db,
      `SELECT id, stock, name FROM medicines WHERE id = ?;`,
      [id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    let targetStock = existing.stock;
    if (new_stock !== undefined) {
      targetStock = Math.max(0, parseInt(new_stock, 10));
    } else if (adjustment !== undefined) {
      targetStock = Math.max(0, existing.stock + parseInt(adjustment, 10));
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE medicines SET stock = ?, updated_at = ? WHERE id = ?;`,
      [targetStock, now, id]
    );

    saveDb();
    res.json({ success: true, id, name: existing.name, previousStock: existing.stock, currentStock: targetStock, reason });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to adjust stock' });
  }
});

apiRouter.delete('/medicines/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    db.run(`DELETE FROM medicines WHERE id = ?;`, [id]);
    saveDb();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete medicine' });
  }
});

// -------------------------------------------------------------
// 3. CUSTOMERS
// -------------------------------------------------------------
apiRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || '').trim();

    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND (name LIKE ? OR phone LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    sql += ` ORDER BY name ASC;`;
    const customers = queryAll(db, sql, params);
    res.json({ customers });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch customers' });
  }
});

// -------------------------------------------------------------
// 4. BILLING & INVOICES
// -------------------------------------------------------------
// Generate next unique bill number
apiRouter.get('/bills/next-number', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const year = new Date().getFullYear();
    const maxRow = queryOne<{ max_id: number }>(db, `SELECT MAX(id) as max_id FROM bills;`);
    const nextSeq = (maxRow?.max_id || 0) + 1;
    const billNumber = `WMS-${year}-${String(nextSeq).padStart(4, '0')}`;
    res.json({ billNumber });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bills with filters and statistics
apiRouter.get('/bills', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || '').trim();
    const startDate = (req.query.startDate as string || '').trim();
    const endDate = (req.query.endDate as string || '').trim();
    const status = (req.query.status as string || '').trim();

    let sql = `
      SELECT b.*, 
        (SELECT COUNT(*) FROM bill_items WHERE bill_id = b.id) as total_items
      FROM bills b 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (b.bill_number LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (startDate) {
      sql += ` AND date(b.created_at) >= date(?)`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND date(b.created_at) <= date(?)`;
      params.push(endDate);
    }

    if (status && status !== 'All') {
      sql += ` AND b.payment_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY b.id DESC;`;
    const bills = queryAll(db, sql, params);

    // Compute period summary totals for the filtered results
    let totalSales = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    for (const b of bills) {
      totalSales += b.grand_total || 0;
      totalPaid += b.paid_amount || 0;
      totalBalance += b.balance_due || 0;
      totalDiscount += b.discount_amount || 0;
      totalTax += b.tax_amount || 0;
    }

    res.json({
      bills,
      summary: {
        count: bills.length,
        totalSales: roundPaise(totalSales),
        totalPaid: roundPaise(totalPaid),
        totalBalance: roundPaise(totalBalance),
        totalDiscount: roundPaise(totalDiscount),
        totalTax: roundPaise(totalTax)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bills' });
  }
});

// Get single bill with items
apiRouter.get('/bills/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);

    const bill = queryOne(db, `SELECT * FROM bills WHERE id = ?;`, [id]);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const items = queryAll(db, `SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC;`, [id]);
    res.json({ ...bill, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bill' });
  }
});

// Create new bill
apiRouter.post('/bills', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const {
      bill_number,
      customer_name,
      customer_phone,
      customer_address,
      doctor_name,
      items,
      subtotal,
      discount_amount,
      tax_rate,
      tax_type,
      paid_amount,
      payment_mode,
      notes,
      billing_date
    } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one medicine item is required' });
    }

    // Check inventory setting
    const trackingSetting = queryOne<{ value: string }>(
      db,
      `SELECT value FROM store_settings WHERE key = 'inventory_tracking_enabled';`
    );
    const trackingEnabled = trackingSetting?.value !== 'false';

    // Verify stock availability if tracking is enabled
    if (trackingEnabled) {
      for (const item of items) {
        if (item.medicine_id) {
          const med = queryOne<{ id: number; name: string; stock: number }>(
            db,
            `SELECT id, name, stock FROM medicines WHERE id = ?;`,
            [item.medicine_id]
          );
          if (med && med.stock < item.quantity) {
            return res.status(400).json({
              error: `Insufficient stock for "${med.name}". Available: ${med.stock} units, Requested: ${item.quantity} units.`
            });
          }
        }
      }
    }

    // Generate bill number if not passed or already exists
    let finalBillNumber = (bill_number || '').trim();
    if (!finalBillNumber) {
      const year = new Date().getFullYear();
      const maxRow = queryOne<{ max_id: number }>(db, `SELECT MAX(id) as max_id FROM bills;`);
      const nextSeq = (maxRow?.max_id || 0) + 1;
      finalBillNumber = `WMS-${year}-${String(nextSeq).padStart(4, '0')}`;
    } else {
      const existing = queryOne(db, `SELECT id FROM bills WHERE bill_number = ?;`, [finalBillNumber]);
      if (existing) {
        const year = new Date().getFullYear();
        const maxRow = queryOne<{ max_id: number }>(db, `SELECT MAX(id) as max_id FROM bills;`);
        const nextSeq = (maxRow?.max_id || 0) + 1;
        finalBillNumber = `WMS-${year}-${String(nextSeq).padStart(4, '0')}`;
      }
    }

    // Recompute & verify financial math accurately
    let calculatedSubtotal = 0;
    let calculatedItemDiscounts = 0;

    const validatedItems = items.map((item: any) => {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = roundPaise(Number(item.unit_price) || 0);
      const discPercent = Math.max(0, Number(item.discount_percent) || 0);

      const rawLineTotal = roundPaise(qty * unitPrice);
      const lineDiscount = roundPaise(rawLineTotal * (discPercent / 100));
      const lineFinalPrice = roundPaise(rawLineTotal - lineDiscount);

      calculatedSubtotal += rawLineTotal;
      calculatedItemDiscounts += lineDiscount;

      return {
        ...item,
        quantity: qty,
        unit_price: unitPrice,
        discount_percent: discPercent,
        discount_amount: lineDiscount,
        total_price: lineFinalPrice
      };
    });

    const billDiscount = roundPaise(Number(discount_amount) || calculatedItemDiscounts);
    const taxableAmount = Math.max(0, roundPaise(calculatedSubtotal - billDiscount));
    const rate = Number(tax_rate) >= 0 ? Number(tax_rate) : 12;
    const taxAmount = roundPaise(taxableAmount * (rate / 100));

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const type = tax_type || 'cgst_sgst';

    if (type === 'igst') {
      igst = taxAmount;
    } else {
      cgst = roundPaise(taxAmount / 2);
      sgst = roundPaise(taxAmount - cgst);
    }

    const grandTotal = roundPaise(taxableAmount + taxAmount);
    const paid = roundPaise(Number(paid_amount) !== undefined ? Number(paid_amount) : grandTotal);
    const balanceDue = roundPaise(Math.max(0, grandTotal - paid));

    let paymentStatus = 'Paid';
    if (balanceDue > 0 && paid > 0) {
      paymentStatus = 'Partial';
    } else if (balanceDue > 0 && paid === 0) {
      paymentStatus = 'Unpaid';
    }

    const now = billing_date ? new Date(billing_date).toISOString() : new Date().toISOString();

    // Upsert Customer
    let customerId: number | null = null;
    const existingCust = queryOne<{ id: number; total_purchases: number; outstanding_balance: number }>(
      db,
      `SELECT id, total_purchases, outstanding_balance FROM customers WHERE phone = ?;`,
      [customer_phone.trim()]
    );

    if (existingCust) {
      customerId = existingCust.id;
      db.run(
        `UPDATE customers 
         SET name = ?, address = COALESCE(?, address), doctor_name = COALESCE(?, doctor_name),
             total_purchases = total_purchases + ?, outstanding_balance = outstanding_balance + ?
         WHERE id = ?;`,
        [customer_name.trim(), customer_address?.trim() || null, doctor_name?.trim() || null, grandTotal, balanceDue, customerId]
      );
    } else {
      db.run(
        `INSERT INTO customers (name, phone, address, doctor_name, total_purchases, outstanding_balance, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [customer_name.trim(), customer_phone.trim(), customer_address?.trim() || null, doctor_name?.trim() || null, grandTotal, balanceDue, now]
      );
      const custRow = queryOne<{ id: number }>(db, `SELECT last_insert_rowid() as id;`);
      customerId = custRow?.id || null;
    }

    // Insert Bill
    db.run(
      `INSERT INTO bills (
        bill_number, customer_id, customer_name, customer_phone, customer_address, doctor_name,
        subtotal, discount_amount, tax_rate, tax_type, tax_amount, cgst_amount, sgst_amount, igst_amount,
        grand_total, paid_amount, balance_due, payment_mode, payment_status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        finalBillNumber,
        customerId,
        customer_name.trim(),
        customer_phone.trim(),
        customer_address?.trim() || null,
        doctor_name?.trim() || null,
        calculatedSubtotal,
        billDiscount,
        rate,
        type,
        taxAmount,
        cgst,
        sgst,
        igst,
        grandTotal,
        paid,
        balanceDue,
        payment_mode || 'Cash',
        paymentStatus,
        notes?.trim() || null,
        now
      ]
    );

    const billIdRow = queryOne<{ id: number }>(db, `SELECT last_insert_rowid() as id;`);
    const billId = billIdRow!.id;

    // Insert Items & Deduct Stock
    for (const item of validatedItems) {
      db.run(
        `INSERT INTO bill_items (
          bill_id, medicine_id, medicine_code, medicine_name, batch_number, expiry_date,
          quantity, unit_price, discount_percent, discount_amount, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          billId,
          item.medicine_id || null,
          item.medicine_code || null,
          item.medicine_name.trim(),
          item.batch_number || null,
          item.expiry_date || null,
          item.quantity,
          item.unit_price,
          item.discount_percent,
          item.discount_amount,
          item.total_price
        ]
      );

      // Deduct stock if linked to medicine
      if (item.medicine_id && trackingEnabled) {
        db.run(
          `UPDATE medicines SET stock = MAX(0, stock - ?), updated_at = ? WHERE id = ?;`,
          [item.quantity, now, item.medicine_id]
        );
      }
    }

    saveDb();

    // Fetch complete bill with items
    const createdBill = queryOne(db, `SELECT * FROM bills WHERE id = ?;`, [billId]);
    const billItems = queryAll(db, `SELECT * FROM bill_items WHERE bill_id = ?;`, [billId]);

    res.status(201).json({ ...createdBill, items: billItems });
  } catch (error: any) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: error.message || 'Failed to create bill' });
  }
});

// Update payment on bill (record payment / clear balance)
apiRouter.put('/bills/:id/payment', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const { additional_payment, payment_mode } = req.body;

    const bill = queryOne<{ id: number; grand_total: number; paid_amount: number; balance_due: number; customer_id: number }>(
      db,
      `SELECT id, grand_total, paid_amount, balance_due, customer_id FROM bills WHERE id = ?;`,
      [id]
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const paymentAmount = roundPaise(Number(additional_payment) || 0);
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    const newPaid = roundPaise(bill.paid_amount + paymentAmount);
    const newBalance = roundPaise(Math.max(0, bill.grand_total - newPaid));
    const newStatus = newBalance === 0 ? 'Paid' : 'Partial';

    db.run(
      `UPDATE bills 
       SET paid_amount = ?, balance_due = ?, payment_status = ?, payment_mode = COALESCE(?, payment_mode)
       WHERE id = ?;`,
      [newPaid, newBalance, newStatus, payment_mode || null, id]
    );

    // Update customer outstanding balance
    if (bill.customer_id) {
      db.run(
        `UPDATE customers 
         SET outstanding_balance = MAX(0, outstanding_balance - ?)
         WHERE id = ?;`,
        [paymentAmount, bill.customer_id]
      );
    }

    saveDb();

    const updated = queryOne(db, `SELECT * FROM bills WHERE id = ?;`, [id]);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update payment' });
  }
});

// -------------------------------------------------------------
// 5. STORE SETTINGS
// -------------------------------------------------------------
apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = queryAll<{ key: string; value: string }>(db, `SELECT key, value FROM store_settings;`);
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

apiRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const newSettings = req.body;
    if (typeof newSettings !== 'object' || !newSettings) {
      return res.status(400).json({ error: 'Invalid settings object' });
    }

    for (const [key, value] of Object.entries(newSettings)) {
      db.run(`INSERT OR REPLACE INTO store_settings (key, value) VALUES (?, ?);`, [key, String(value)]);
    }

    saveDb();
    res.json({ success: true, settings: newSettings });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});
