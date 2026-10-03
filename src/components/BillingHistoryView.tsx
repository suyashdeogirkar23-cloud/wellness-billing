import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Printer,
  Eye,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpDown,
} from 'lucide-react';
import { Bill, BillSummary } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { fetchBills, recordBillPayment } from '../services/api';

interface BillingHistoryViewProps {
  onViewInvoice: (bill: Bill) => void;
  onRefreshTrigger: number;
}

export const BillingHistoryView: React.FC<BillingHistoryViewProps> = ({
  onViewInvoice,
  onRefreshTrigger,
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<BillSummary>({
    count: 0,
    totalSales: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalDiscount: 0,
    totalTax: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Record payment modal
  const [activePaymentBill, setActivePaymentBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load bills whenever filters or external trigger change
  useEffect(() => {
    loadBills();
  }, [search, dateFilter, customStartDate, customEndDate, statusFilter, onRefreshTrigger]);

  const loadBills = async () => {
    setLoading(true);
    try {
      let start = '';
      let end = '';
      const today = new Date();
      const formatDateStr = (d: Date) => d.toISOString().slice(0, 10);

      if (dateFilter === 'today') {
        start = formatDateStr(today);
        end = formatDateStr(today);
      } else if (dateFilter === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        start = formatDateStr(y);
        end = formatDateStr(y);
      } else if (dateFilter === 'last7') {
        const past7 = new Date(today);
        past7.setDate(past7.getDate() - 6);
        start = formatDateStr(past7);
        end = formatDateStr(today);
      } else if (dateFilter === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        start = formatDateStr(firstDay);
        end = formatDateStr(today);
      } else if (dateFilter === 'custom') {
        start = customStartDate;
        end = customEndDate;
      }

      const res = await fetchBills({
        search: search.trim() || undefined,
        startDate: start || undefined,
        endDate: end || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });

      setBills(res.bills);
      setSummary(res.summary);
    } catch (err) {
      console.error('Error loading bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordPayment = (bill: Bill) => {
    setActivePaymentBill(bill);
    setPaymentAmount(bill.balance_due);
    setPaymentMode('Cash');
    setPaymentError(null);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentBill) return;

    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }

    if (amt > activePaymentBill.balance_due) {
      setPaymentError(`Payment amount cannot exceed the balance due of ${formatCurrency(activePaymentBill.balance_due)}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await recordBillPayment(activePaymentBill.id, {
        additional_payment: amt,
        payment_mode: paymentMode,
      });
      setActivePaymentBill(null);
      loadBills();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to update payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Metrics Banner for the Filtered Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Total Bills</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {summary.count}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Filtered Sales</span>
          <span className="text-xl font-bold font-mono text-teal-800 tabular-nums">
            {formatCurrency(summary.totalSales)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Collected Paid</span>
          <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
            {formatCurrency(summary.totalPaid)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Outstanding Due</span>
          <span
            className={`text-xl font-bold font-mono tabular-nums ${
              summary.totalBalance > 0 ? 'text-rose-600' : 'text-slate-700'
            }`}
          >
            {formatCurrency(summary.totalBalance)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Total Discounts</span>
          <span className="text-xl font-bold font-mono text-slate-700 tabular-nums">
            {formatCurrency(summary.totalDiscount)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 block">Total GST Collected</span>
          <span className="text-xl font-bold font-mono text-slate-700 tabular-nums">
            {formatCurrency(summary.totalTax)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Input (5 cols) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Customer Name, Phone, or Bill No (e.g. WMS-2026-0001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600"
            />
          </div>

          {/* Quick Date Filters (5 cols) */}
          <div className="md:col-span-5 flex flex-wrap items-center gap-1 text-xs">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Date' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  dateFilter === d.id
                    ? 'bg-teal-700 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Status Filter (2 cols) */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by payment status"
              className="w-full py-2 px-2.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-teal-600 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid in Full</option>
              <option value="Partial">Partial Due</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers row (if custom selected) */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded font-mono text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bills Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax (GST)</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading billing history...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No matching invoices found for the current search/date filters.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Bill Number */}
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {bill.bill_number}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {formatDateTime(bill.created_at)}
                    </td>

                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{bill.customer_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {bill.customer_phone}
                        {bill.doctor_name && <span className="ml-1 text-slate-400">· {bill.doctor_name}</span>}
                      </div>
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-600">
                      {bill.total_items || 1}
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatCurrency(bill.subtotal)}
                    </td>

                    {/* Tax */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 text-[11px]">
                      {formatCurrency(bill.tax_amount)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(bill.grand_total)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {bill.balance_due > 0 ? (
                        <span className="text-rose-600">{formatCurrency(bill.balance_due)}</span>
                      ) : (
                        <span className="text-emerald-700">₹0.00</span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            bill.payment_status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bill.payment_status === 'Partial'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {bill.payment_status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {bill.payment_mode}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewInvoice(bill)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {bill.balance_due > 0 && (
                          <button
                            onClick={() => handleOpenRecordPayment(bill)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="Collect outstanding balance"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {activePaymentBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Balance Payment</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {activePaymentBill.bill_number} · {activePaymentBill.customer_name}
                </span>
              </div>
              <button
                onClick={() => setActivePaymentBill(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Grand Total:</span>
                  <span className="font-mono font-medium">{formatCurrency(activePaymentBill.grand_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-mono font-medium text-emerald-700">
                    {formatCurrency(activePaymentBill.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Current Outstanding Due:</span>
                  <span className="font-mono text-rose-600">{formatCurrency(activePaymentBill.balance_due)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={activePaymentBill.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm focus:outline-teal-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {['Cash', 'UPI', 'Card', 'Net Banking'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-1.5 rounded transition-colors text-center font-medium ${
                        paymentMode === mode
                          ? 'bg-teal-700 text-white font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivePaymentBill(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
