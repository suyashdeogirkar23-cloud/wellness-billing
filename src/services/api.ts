import { DashboardData, Medicine, Customer, Bill, StoreSettings, BillSummary } from '../types';

const API_BASE = '/api';

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`);
  if (!res.ok) throw new Error('Failed to load dashboard metrics');
  return res.json();
}

export async function fetchMedicines(params?: {
  search?: string;
  category?: string;
  low_stock?: boolean;
}): Promise<{ medicines: Medicine[]; categories: string[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.low_stock) query.set('low_stock', 'true');

  const res = await fetch(`${API_BASE}/medicines?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load medicines inventory');
  return res.json();
}

export async function createMedicine(data: Partial<Medicine>): Promise<Medicine> {
  const res = await fetch(`${API_BASE}/medicines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add medicine');
  }
  return res.json();
}

export async function updateMedicine(id: number, data: Partial<Medicine>): Promise<Medicine> {
  const res = await fetch(`${API_BASE}/medicines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update medicine');
  }
  return res.json();
}

export async function adjustMedicineStock(
  id: number,
  data: { adjustment?: number; new_stock?: number; reason?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/medicines/${id}/stock-adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to adjust stock');
  }
  return res.json();
}

export async function deleteMedicine(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/medicines/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete medicine');
  }
}

export async function fetchCustomers(search?: string): Promise<{ customers: Customer[] }> {
  const query = new URLSearchParams();
  if (search) query.set('search', search);

  const res = await fetch(`${API_BASE}/customers?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load customers');
  return res.json();
}

export async function getNextBillNumber(): Promise<string> {
  const res = await fetch(`${API_BASE}/bills/next-number`);
  if (!res.ok) throw new Error('Failed to generate next bill number');
  const data = await res.json();
  return data.billNumber;
}

export async function fetchBills(params?: {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}): Promise<{ bills: Bill[]; summary: BillSummary }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.status) query.set('status', params.status);

  const res = await fetch(`${API_BASE}/bills?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch billing history');
  return res.json();
}

export async function fetchBillById(id: number): Promise<Bill> {
  const res = await fetch(`${API_BASE}/bills/${id}`);
  if (!res.ok) throw new Error('Failed to fetch bill details');
  return res.json();
}

export async function createBill(billData: any): Promise<Bill> {
  const res = await fetch(`${API_BASE}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save bill');
  }
  return res.json();
}

export async function recordBillPayment(
  id: number,
  data: { additional_payment: number; payment_mode?: string }
): Promise<Bill> {
  const res = await fetch(`${API_BASE}/bills/${id}/payment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record payment');
  }
  return res.json();
}

export async function fetchSettings(): Promise<StoreSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch store settings');
  return res.json();
}

export async function saveSettings(settings: Partial<StoreSettings>): Promise<void> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save store settings');
  }
}
