import React, { useState, useEffect } from 'react';
import { Search, User, Phone, MapPin, Receipt, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { fetchCustomers } from '../services/api';

interface CustomersViewProps {
  onStartBillForCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onStartBillForCustomer }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers(search.trim() || undefined);
      setCustomers(res.customers);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0);
  const totalPurchases = customers.reduce((acc, c) => acc + (c.total_purchases || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Registered Customers</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {customers.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Stored with contact & doctor history</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Cumulative Lifetime Purchases</span>
          <span className="text-2xl font-bold font-mono text-teal-800 mt-1 block">
            {formatCurrency(totalPurchases)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all patient invoices</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Outstanding Balance</span>
          <span className={`text-2xl font-bold font-mono mt-1 block ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {formatCurrency(totalOutstanding)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {totalOutstanding > 0 ? 'Pending collection from patients' : 'Zero credit dues'}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search customer directory by name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Patient / Customer</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Prescribing Doctor</th>
                <th className="py-3 px-4 text-right">Lifetime Sales</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Member since {formatDate(c.created_at)}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {c.phone}
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {c.address || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {c.doctor_name || '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(c.total_purchases)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {c.outstanding_balance > 0 ? (
                        <span className="text-rose-600">{formatCurrency(c.outstanding_balance)}</span>
                      ) : (
                        <span className="text-emerald-700">₹0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onStartBillForCustomer(c)}
                        className="px-2.5 py-1 text-xs bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold rounded transition-colors inline-flex items-center gap-1"
                      >
                        <span>New Bill</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
