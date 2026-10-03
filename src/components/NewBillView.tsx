import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Download,
  RotateCcw,
  Search,
  CheckCircle,
  AlertTriangle,
  Receipt,
  User,
  Phone,
  MapPin,
  Stethoscope,
} from 'lucide-react';
import { Medicine, Customer, Bill, StoreSettings } from '../types';
import { roundPaise, formatCurrency } from '../utils/formatters';
import { getNextBillNumber, createBill, fetchCustomers } from '../services/api';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface NewBillViewProps {
  medicines: Medicine[];
  settings: StoreSettings;
  onBillCreated: (newBill: Bill, action: 'print' | 'pdf' | 'none') => void;
  onRefreshMedicines: () => void;
}

interface BillRow {
  id: string; // client temporary key
  medicine_id?: number;
  medicine_code?: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  total_price: number;
  available_stock: number;
}

export const NewBillView: React.FC<NewBillViewProps> = ({
  medicines,
  settings,
  onBillCreated,
  onRefreshMedicines,
}) => {
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [doctorName, setDoctorName] = useState('');

  // Bill metadata
  const [billNumber, setBillNumber] = useState('');
  const [billingDate, setBillingDate] = useState(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });

  // Medicine items rows
  const [items, setItems] = useState<BillRow[]>([
    {
      id: 'row-1',
      medicine_name: '',
      batch_number: '',
      expiry_date: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      total_price: 0,
      available_stock: 999,
    },
  ]);

  // Tax and Payment settings
  const [taxRate, setTaxRate] = useState<number>(() => {
    return Number(settings.default_tax_rate) || 12;
  });
  const [taxType, setTaxType] = useState<'cgst_sgst' | 'igst'>(() => {
    return (settings.tax_type as 'cgst_sgst' | 'igst') || 'cgst_sgst';
  });
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Net Banking'>('Cash');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Auto-calculated Financial Totals
  const [subtotal, setSubtotal] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [sgstAmount, setSgstAmount] = useState(0);
  const [igstAmount, setIgstAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);

  // Autocomplete / UI helpers
  const [activeSearchRow, setActiveSearchRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);

  // 1. Fetch initial next bill number
  useEffect(() => {
    loadBillNumber();
  }, []);

  const loadBillNumber = async () => {
    try {
      const num = await getNextBillNumber();
      setBillNumber(num);
    } catch (err) {
      console.error('Failed to get next bill number:', err);
      const fallback = `WMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setBillNumber(fallback);
    }
  };

  // 2. Real-time Financial Recalculations
  useEffect(() => {
    let rawSubtotal = 0;
    let rawDiscount = 0;

    items.forEach((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const rate = roundPaise(Number(item.unit_price) || 0);
      const disc = Math.max(0, Number(item.discount_percent) || 0);

      const lineGross = roundPaise(qty * rate);
      const lineDisc = roundPaise(lineGross * (disc / 100));
      rawSubtotal += lineGross;
      rawDiscount += lineDisc;
    });

    const cleanSubtotal = roundPaise(rawSubtotal);
    const cleanDiscount = roundPaise(rawDiscount);
    const cleanTaxable = Math.max(0, roundPaise(cleanSubtotal - cleanDiscount));
    const cleanTax = roundPaise(cleanTaxable * (taxRate / 100));

    let cleanCgst = 0;
    let cleanSgst = 0;
    let cleanIgst = 0;

    if (taxType === 'igst') {
      cleanIgst = cleanTax;
    } else {
      cleanCgst = roundPaise(cleanTax / 2);
      cleanSgst = roundPaise(cleanTax - cleanCgst);
    }

    const cleanGrand = roundPaise(cleanTaxable + cleanTax);

    setSubtotal(cleanSubtotal);
    setTotalDiscount(cleanDiscount);
    setTaxableAmount(cleanTaxable);
    setTaxAmount(cleanTax);
    setCgstAmount(cleanCgst);
    setSgstAmount(cleanSgst);
    setIgstAmount(cleanIgst);
    setGrandTotal(cleanGrand);

    // If paid amount was unset or equals previous grand total, auto-update
    if (paidAmount === '' || paidAmount === null) {
      setPaidAmount(cleanGrand);
      setBalanceDue(0);
    } else {
      const currentPaid = Number(paidAmount) || 0;
      setBalanceDue(roundPaise(Math.max(0, cleanGrand - currentPaid)));
    }
  }, [items, taxRate, taxType]);

  // Handle manual paid amount changes
  const handlePaidAmountChange = (valStr: string) => {
    if (valStr === '') {
      setPaidAmount('');
      setBalanceDue(grandTotal);
      return;
    }
    const val = Number(valStr);
    setPaidAmount(val);
    setBalanceDue(roundPaise(Math.max(0, grandTotal - val)));
  };

  // Add new medicine item row
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        medicine_name: '',
        batch_number: '',
        expiry_date: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_price: 0,
        available_stock: 999,
      },
    ]);
  };

  // Remove medicine item row
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      // Clear the single row instead of deleting
      setItems([
        {
          id: `row-${Date.now()}`,
          medicine_name: '',
          batch_number: '',
          expiry_date: '',
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          discount_amount: 0,
          total_price: 0,
          available_stock: 999,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Select medicine from inventory search
  const handleSelectMedicine = (rowId: string, med: Medicine) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const qty = r.quantity || 1;
        const lineTotal = roundPaise(qty * med.selling_price * (1 - (r.discount_percent || 0) / 100));
        return {
          ...r,
          medicine_id: med.id,
          medicine_code: med.code,
          medicine_name: med.name,
          batch_number: med.batch_number || '',
          expiry_date: med.expiry_date || '',
          unit_price: med.selling_price,
          available_stock: med.stock,
          total_price: lineTotal,
        };
      })
    );
    setActiveSearchRow(null);
    setSearchQuery('');
  };

  // Update specific field in row
  const handleRowChange = (rowId: string, field: keyof BillRow, value: any) => {
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };

        const qty = Math.max(1, Number(updated.quantity) || 1);
        const rate = roundPaise(Number(updated.unit_price) || 0);
        const disc = Math.max(0, Number(updated.discount_percent) || 0);

        const gross = roundPaise(qty * rate);
        const discVal = roundPaise(gross * (disc / 100));
        updated.discount_amount = discVal;
        updated.total_price = roundPaise(gross - discVal);

        return updated;
      })
    );
  };

  // Phone lookup for existing customer
  const handlePhoneChange = async (phone: string) => {
    setCustomerPhone(phone);
    if (phone.length >= 4) {
      try {
        const { customers } = await fetchCustomers(phone);
        setCustomerSuggestions(customers);
        // If exact match
        const exact = customers.find((c) => c.phone === phone);
        if (exact) {
          setCustomerName(exact.name);
          if (exact.address) setCustomerAddress(exact.address);
          if (exact.doctor_name) setDoctorName(exact.doctor_name);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    if (cust.address) setCustomerAddress(cust.address);
    if (cust.doctor_name) setDoctorName(cust.doctor_name);
    setCustomerSuggestions([]);
  };

  // Reset entire form
  const handleResetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDoctorName('');
    setItems([
      {
        id: `row-${Date.now()}`,
        medicine_name: '',
        batch_number: '',
        expiry_date: '',
        quantity: 1,
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        total_price: 0,
        available_stock: 999,
      },
    ]);
    setNotes('');
    setPaidAmount('');
    setErrorMessage(null);
    loadBillNumber();
  };

  // Save Bill Submission
  const handleSaveBill = async (action: 'print' | 'pdf' | 'none') => {
    setErrorMessage(null);

    // Validation
    if (!customerName.trim()) {
      setErrorMessage('Please enter Customer Name.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('Please enter Customer Phone Number.');
      return;
    }

    // Filter out completely blank rows
    const validItems = items.filter((item) => item.medicine_name.trim() !== '');
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one medicine item to the bill.');
      return;
    }

    // Stock check validation
    const trackingEnabled = settings.inventory_tracking_enabled !== 'false';
    if (trackingEnabled) {
      for (const item of validItems) {
        if (item.medicine_id && item.available_stock !== undefined && item.quantity > item.available_stock) {
          setErrorMessage(
            `Stock validation failed: Quantity for "${item.medicine_name}" (${item.quantity}) exceeds available stock (${item.available_stock}).`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const finalPaid = paidAmount === '' ? grandTotal : Number(paidAmount);

      const billPayload = {
        bill_number: billNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress || null,
        doctor_name: doctorName || null,
        items: validItems,
        subtotal,
        discount_amount: totalDiscount,
        tax_rate: taxRate,
        tax_type: taxType,
        paid_amount: finalPaid,
        payment_mode: paymentMode,
        notes: notes || null,
        billing_date: new Date(billingDate).toISOString(),
      };

      const created = await createBill(billPayload);

      setSuccessToast(`Bill ${created.bill_number} generated successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);

      // Refresh inventory stock
      onRefreshMedicines();

      if (action === 'pdf') {
        generateInvoicePDF(created, settings);
      }

      onBillCreated(created, action);

      // Reset form for next customer
      handleResetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Retail Invoice No:</span>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="font-mono font-bold text-teal-900 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs focus:bg-white focus:outline-teal-600"
                title="Bill number is auto-generated"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              Wellness Medical Store POS Terminal #01
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-400">Billing Date:</span>
            <input
              type="datetime-local"
              value={billingDate}
              onChange={(e) => setBillingDate(e.target.value)}
              className="bg-transparent font-mono text-xs focus:outline-none"
            />
          </div>

          <button
            onClick={handleResetForm}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Clear all fields"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Form</span>
          </button>
        </div>
      </div>

      {/* Error and Success Alerts */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            Dismiss
          </button>
        </div>
      )}

      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Grid: Left Column (Customer + Medicine Table), Right Column (Financial Calculations & Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Customer Information + Medicine Rows */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Customer Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">Customer & Patient Details</h2>
              </div>
              <span className="text-[11px] text-slate-400">Fields marked * are required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone with quick lookup */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Phone *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. 9845012345"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600 focus:border-teal-600 font-mono"
                    required
                  />
                </div>

                {/* Suggestions drop */}
                {customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="p-1 text-[11px] text-slate-400 font-medium border-b border-slate-100 px-3">
                      Existing Customers Found:
                    </div>
                    {customerSuggestions.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs border-b border-slate-50 last:border-none"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{cust.name}</span>
                          <span className="text-slate-400 font-mono ml-2">({cust.phone})</span>
                        </div>
                        {cust.outstanding_balance > 0 && (
                          <span className="text-[10px] text-rose-600 font-medium">
                            Due: {formatCurrency(cust.outstanding_balance)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Patient Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600 focus:border-teal-600"
                  required
                />
              </div>

              {/* Optional Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery / Customer Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Flat 302, Green Glen Layout"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Doctor Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prescribing Doctor / Hospital (Optional)
                </label>
                <div className="relative">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Dr. Vivek Rao, MD"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Medicine Items Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-teal-700 font-bold text-xs uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded">
                  Bill Items ({items.length})
                </span>
                <span className="text-xs text-slate-500">
                  Select from inventory or enter custom medicine
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine Row</span>
              </button>
            </div>

            {/* Responsive Table of Medicine Rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-2 w-56">Medicine Name</th>
                    <th className="py-2.5 px-2 w-28 text-center">Batch / Exp</th>
                    <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-2 w-24 text-right">Price (₹)</th>
                    <th className="py-2.5 px-2 w-20 text-center">Disc %</th>
                    <th className="py-2.5 px-2 w-28 text-right">Total (₹)</th>
                    <th className="py-2.5 px-1 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, index) => {
                    const isOverStock =
                      settings.inventory_tracking_enabled !== 'false' &&
                      row.medicine_id &&
                      row.available_stock !== undefined &&
                      row.quantity > row.available_stock;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 group">
                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Medicine Name with Search / Autocomplete */}
                        <td className="py-2 px-2 relative">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type to search medicine..."
                              value={row.medicine_name}
                              onFocus={() => {
                                setActiveSearchRow(row.id);
                                setSearchQuery(row.medicine_name);
                              }}
                              onChange={(e) => {
                                handleRowChange(row.id, 'medicine_name', e.target.value);
                                setActiveSearchRow(row.id);
                                setSearchQuery(e.target.value);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:outline-teal-600 font-medium text-slate-900"
                            />
                            {row.medicine_id && (
                              <span className="text-[10px] text-teal-700 font-mono block mt-0.5">
                                Code: {row.medicine_code} · Stock: {row.available_stock}
                              </span>
                            )}
                          </div>

                          {/* Inventory Dropdown Menu */}
                          {activeSearchRow === row.id && (
                            <div className="absolute left-2 right-2 z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                              <div className="p-2 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50">
                                <span>Choose medicine from inventory:</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveSearchRow(null)}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  Close
                                </button>
                              </div>

                              {medicines
                                .filter(
                                  (m) =>
                                    m.name.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                                    (m.generic_name && m.generic_name.toLowerCase().includes((searchQuery || '').toLowerCase())) ||
                                    m.code.toLowerCase().includes((searchQuery || '').toLowerCase())
                                )
                                .slice(0, 8)
                                .map((med) => (
                                  <button
                                    key={med.id}
                                    type="button"
                                    onClick={() => handleSelectMedicine(row.id, med)}
                                    className="w-full px-3 py-2 text-left hover:bg-teal-50/60 border-b border-slate-50 last:border-none flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-900">{med.name}</div>
                                      <div className="text-[11px] text-slate-500">
                                        {med.generic_name || med.category} · Batch: {med.batch_number || 'N/A'} · Exp: {med.expiry_date || 'N/A'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-teal-800">
                                        {formatCurrency(med.selling_price)}
                                      </div>
                                      <div className={`text-[10px] font-mono ${med.stock <= med.min_stock_alert ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                        Stock: {med.stock} {med.unit}
                                      </div>
                                    </div>
                                  </button>
                                ))}

                              {medicines.filter((m) =>
                                m.name.toLowerCase().includes((searchQuery || '').toLowerCase())
                              ).length === 0 && (
                                <div className="p-3 text-center text-xs text-slate-400">
                                  No exact match found in inventory. You can keep typing custom medicine name.
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Batch & Expiry */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="Batch"
                            value={row.batch_number}
                            onChange={(e) => handleRowChange(row.id, 'batch_number', e.target.value)}
                            className="w-full px-2 py-1 text-center border border-slate-200 rounded text-[11px] font-mono focus:outline-teal-600 mb-1"
                          />
                          <input
                            type="text"
                            placeholder="Exp (YYYY-MM)"
                            value={row.expiry_date}
                            onChange={(e) => handleRowChange(row.id, 'expiry_date', e.target.value)}
                            className="w-full px-2 py-1 text-center border border-slate-200 rounded text-[11px] font-mono focus:outline-teal-600"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(row.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className={`w-16 px-2 py-1 text-center border rounded text-xs font-mono font-semibold focus:outline-teal-600 ${
                              isOverStock ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200'
                            }`}
                          />
                          {isOverStock && (
                            <span className="block text-[10px] text-rose-600 font-medium mt-0.5" title="Requested quantity exceeds available stock">
                              Max: {row.available_stock}
                            </span>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-2 px-2 text-right">
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.unit_price || ''}
                              onChange={(e) => handleRowChange(row.id, 'unit_price', e.target.value)}
                              placeholder="0.00"
                              className="w-20 pl-5 pr-2 py-1 text-right border border-slate-200 rounded text-xs font-mono tabular-nums focus:outline-teal-600"
                            />
                          </div>
                        </td>

                        {/* Discount % */}
                        <td className="py-2 px-2 text-center">
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={row.discount_percent || 0}
                              onChange={(e) => handleRowChange(row.id, 'discount_percent', e.target.value)}
                              className="w-14 px-2 py-1 text-center border border-slate-200 rounded text-xs font-mono focus:outline-teal-600"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {row.discount_amount > 0 ? `-₹${row.discount_amount.toFixed(2)}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(row.total_price)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Helper Button below table */}
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1.5 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add another medicine (or press Enter)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Optional Notes & Prescription Details */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Pharmacist / Prescription Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Take 1 tablet twice daily after meals, Course: 5 days"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600"
            />
          </div>
        </div>

        {/* Right Column (4 cols): Billing Summary, Tax Configurations & Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5 sticky top-20">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Billing & GST Summary</h2>
              <p className="text-[11px] text-slate-400">
                Automated Indian GST & Rupee Calculations
              </p>
            </div>

            {/* Tax Settings Selectors */}
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Applicable GST Rate
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setTaxRate(rate)}
                      className={`py-1 text-xs font-semibold rounded transition-colors ${
                        taxRate === rate
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tax Calculation Mode
                </label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTaxType('cgst_sgst')}
                    className={`py-1 px-2 font-medium rounded transition-colors ${
                      taxType === 'cgst_sgst'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    CGST + SGST ({(taxRate / 2).toFixed(1)}% each)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('igst')}
                    className={`py-1 px-2 font-medium rounded transition-colors ${
                      taxType === 'igst'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    IGST ({taxRate}%)
                  </button>
                </div>
              </div>
            </div>

            {/* Calculation Lines */}
            <div className="space-y-2 text-xs border-b border-slate-200 pb-4">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{formatCurrency(totalDiscount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                <span>Taxable Amount:</span>
                <span className="font-mono tabular-nums">{formatCurrency(taxableAmount)}</span>
              </div>

              {taxType === 'igst' ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST ({taxRate}%):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST ({(taxRate / 2).toFixed(1)}%):</span>
                    <span className="font-mono tabular-nums">{formatCurrency(cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST ({(taxRate / 2).toFixed(1)}%):</span>
                    <span className="font-mono tabular-nums">{formatCurrency(sgstAmount)}</span>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                <span className="text-xl font-bold font-mono text-teal-800 tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {(['Cash', 'UPI', 'Card', 'Net Banking'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-1.5 font-medium rounded transition-colors text-center ${
                        paymentMode === mode
                          ? 'bg-teal-700 text-white font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mode === 'Net Banking' ? 'Bank' : mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-teal-600 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(grandTotal);
                      setBalanceDue(0);
                    }}
                    className="text-[10px] text-teal-700 hover:underline mt-0.5 block font-medium"
                  >
                    Set Full Payment
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Balance Due (₹)
                  </label>
                  <div
                    className={`px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border flex items-center justify-between ${
                      balanceDue > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <span>{formatCurrency(balanceDue)}</span>
                    <span className="text-[10px] uppercase font-sans font-bold">
                      {balanceDue > 0 ? 'Due' : 'Paid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveBill('print')}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print Invoice</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveBill('pdf')}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Save & Download PDF</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveBill('none')}
                className="w-full py-2 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>Save Bill Only</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
