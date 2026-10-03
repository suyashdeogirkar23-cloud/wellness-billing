import React from 'react';
import {
  TrendingUp,
  Receipt,
  Users,
  AlertCircle,
  Package,
  Calendar,
  ArrowUpRight,
  PlusCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { DashboardData, StoreSettings, Bill } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface DashboardViewProps {
  data: DashboardData | null;
  settings: StoreSettings;
  onNavigateToNewBill: () => void;
  onNavigateToHistory: () => void;
  onNavigateToInventory: (filterLowStock?: boolean) => void;
  onViewBill: (billId: number) => void;
  onQuickRestock: (medId: number, currentStock: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  settings,
  onNavigateToNewBill,
  onNavigateToHistory,
  onNavigateToInventory,
  onViewBill,
  onQuickRestock,
}) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Quick stat cards
  const stats = [
    {
      title: "Today's Total Sales",
      value: formatCurrency(data.todaySales),
      subtitle: `${data.todayBillsCount} invoices generated today`,
      icon: TrendingUp,
      color: 'teal',
      accentBg: 'bg-teal-50',
      accentText: 'text-teal-700',
    },
    {
      title: "Bills Generated Today",
      value: data.todayBillsCount,
      subtitle: `Paid: ${formatCurrency(data.todayPaid)}`,
      icon: Receipt,
      color: 'sky',
      accentBg: 'bg-sky-50',
      accentText: 'text-sky-700',
      isNumeric: true,
    },
    {
      title: 'Total Active Customers',
      value: data.totalCustomers,
      subtitle: 'Registered patient directory',
      icon: Users,
      color: 'indigo',
      accentBg: 'bg-indigo-50',
      accentText: 'text-indigo-700',
      isNumeric: true,
    },
    {
      title: 'Total Outstanding Dues',
      value: formatCurrency(data.totalOutstanding),
      subtitle: data.totalOutstanding > 0 ? 'Pending client balances' : 'All accounts settled',
      icon: AlertCircle,
      color: data.totalOutstanding > 0 ? 'amber' : 'emerald',
      accentBg: data.totalOutstanding > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      accentText: data.totalOutstanding > 0 ? 'text-amber-800' : 'text-emerald-800',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/20">
              Wellness Pharmacy POS
            </span>
            <span className="text-xs text-teal-200/70">· Terminal Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {settings.store_name || 'Wellness Medical Store'}
          </h2>
          <p className="text-xs text-teal-100/80 max-w-xl">
            Streamlined pharmacy billing, inventory deduction, and automated GST compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToNewBill}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Generate New Bill</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{stat.title}</span>
                <div className={`p-2 rounded-lg ${stat.accentBg} ${stat.accentText}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <div
                  className={`text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums`}
                >
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{stat.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Weekly Activity Chart & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 Cols: Sales Trend for the past 7 days */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Sales Volume</h3>
              <p className="text-[11px] text-slate-400">Daily retail revenue and bill counts</p>
            </div>
            <button
              onClick={onNavigateToHistory}
              className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View Full Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar Visualizer */}
          <div className="mt-6 pt-4">
            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pb-2">
              {data.last7Days.map((day, i) => {
                // Compute height percentage based on maximum sales in the 7 days
                const maxVal = Math.max(...data.last7Days.map((d) => d.sales), 100);
                const heightPercent = Math.max(8, Math.round((day.sales / maxVal) * 100));

                return (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatCurrency(day.sales)}
                    </div>
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          i === 6
                            ? 'bg-teal-600 group-hover:bg-teal-500'
                            : 'bg-teal-800/80 group-hover:bg-teal-700'
                        }`}
                      ></div>
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-semibold text-slate-700 block">
                        {day.dayName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {day.bills} bills
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-teal-600"></span>
              <span>Daily Revenue</span>
            </div>
            <div className="font-mono text-[11px]">
              Total 7-Day Revenue:{' '}
              <strong className="text-slate-900">
                {formatCurrency(data.last7Days.reduce((acc, curr) => acc + curr.sales, 0))}
              </strong>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Low Stock Alerts */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Low Stock Warnings</h3>
            </div>
            <button
              onClick={() => onNavigateToInventory(true)}
              className="text-[11px] text-teal-700 font-semibold hover:underline"
            >
              View All ({data.lowStockCount})
            </button>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 max-h-64">
            {data.lowStockMedicines.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All medicine stocks are at or above threshold levels.
              </div>
            ) : (
              data.lowStockMedicines.slice(0, 5).map((med) => (
                <div
                  key={med.id}
                  className="p-2.5 rounded-lg border border-amber-200/60 bg-amber-50/40 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 truncate">{med.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {med.code} · Threshold: {med.min_stock_alert}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                      {med.stock} {med.unit}
                    </span>
                    <button
                      onClick={() => onQuickRestock(med.id, med.stock)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                      title="Quick Stock Adjustment"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Expiring Medicines Alert Footer */}
          {data.expiringSoon.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{data.expiringSoon.length} items expiring soon</span>
                </div>
                <button
                  onClick={() => onNavigateToInventory()}
                  className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
                >
                  Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Pharmacy Invoices</h3>
            <p className="text-[11px] text-slate-400">Latest customer bills and payment statuses</p>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-xs text-teal-700 font-semibold hover:underline flex items-center gap-1"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-4">Bill No</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4">Phone</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                <th className="py-2.5 px-4 text-right">Paid</th>
                <th className="py-2.5 px-4 text-right">Due</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No bills generated yet. Click &quot;Generate New Bill&quot; to create your first invoice.
                  </td>
                </tr>
              ) : (
                data.recentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {bill.bill_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {formatDateTime(bill.created_at)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {bill.customer_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {bill.customer_phone}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(bill.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 tabular-nums font-medium">
                      {formatCurrency(bill.paid_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                      {bill.balance_due > 0 ? (
                        <span className="text-rose-600">{formatCurrency(bill.balance_due)}</span>
                      ) : (
                        <span className="text-slate-400">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
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
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewBill(bill.id)}
                        className="px-2.5 py-1 text-xs text-teal-700 hover:text-teal-900 font-semibold hover:bg-teal-50 rounded transition-colors"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
