export interface Medicine {
  id: number;
  code: string;
  name: string;
  generic_name?: string;
  category: string;
  batch_number?: string;
  expiry_date?: string;
  mrp: number;
  selling_price: number;
  stock: number;
  min_stock_alert: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  doctor_name?: string;
  total_purchases: number;
  outstanding_balance: number;
  created_at: string;
}

export interface BillItem {
  id?: number;
  bill_id?: number;
  medicine_id?: number;
  medicine_code?: string;
  medicine_name: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  total_price: number;
}

export interface Bill {
  id: number;
  bill_number: string;
  customer_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  doctor_name?: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_type: 'cgst_sgst' | 'igst';
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  payment_mode: 'Cash' | 'UPI' | 'Card' | 'Net Banking';
  payment_status: 'Paid' | 'Partial' | 'Unpaid';
  notes?: string;
  created_at: string;
  total_items?: number;
  items?: BillItem[];
}

export interface StoreSettings {
  store_name: string;
  tagline: string;
  address: string;
  city_state_pin: string;
  phone: string;
  email: string;
  gstin: string;
  dl_number: string;
  pharmacist_name: string;
  default_tax_rate: string;
  tax_type: string;
  invoice_terms: string;
  currency_symbol: string;
  inventory_tracking_enabled: string;
  [key: string]: string;
}

export interface DashboardData {
  todaySales: number;
  todayBillsCount: number;
  todayPaid: number;
  todayBalance: number;
  totalOutstanding: number;
  totalCustomers: number;
  totalMedicines: number;
  totalStockValue: number;
  lowStockCount: number;
  lowStockMedicines: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    stock: number;
    min_stock_alert: number;
    unit: string;
    selling_price: number;
  }>;
  expiringSoon: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    batch_number: string;
    expiry_date: string;
    stock: number;
    unit: string;
  }>;
  recentBills: Array<{
    id: number;
    bill_number: string;
    customer_name: string;
    customer_phone: string;
    grand_total: number;
    paid_amount: number;
    balance_due: number;
    payment_mode: string;
    payment_status: string;
    created_at: string;
  }>;
  last7Days: Array<{
    date: string;
    dayName: string;
    sales: number;
    bills: number;
  }>;
}

export interface BillSummary {
  count: number;
  totalSales: number;
  totalPaid: number;
  totalBalance: number;
  totalDiscount: number;
  totalTax: number;
}
