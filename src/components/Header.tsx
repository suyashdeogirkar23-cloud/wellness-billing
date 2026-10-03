import React, { useState, useEffect } from 'react';
import { Menu, Plus, Bell, RefreshCw } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onNewBillClick: () => void;
  onRefreshData: () => void;
  lowStockCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onNewBillClick,
  onRefreshData,
  lowStockCount,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Pharmacy Dashboard',
      subtitle: 'Real-time sales, inventory overview & revenue metrics',
    },
    'new-bill': {
      title: 'Counter Billing (POS)',
      subtitle: 'Issue retail medicine invoices with instant GST & stock deduction',
    },
    history: {
      title: 'Billing History & Ledger',
      subtitle: 'Comprehensive audit trail, invoice search & payment reconciliation',
    },
    inventory: {
      title: 'Medicine Inventory',
      subtitle: 'Live stock management, batch control, MRP & expiry tracking',
    },
    customers: {
      title: 'Customer Directory',
      subtitle: 'Patient records, purchase history & outstanding dues',
    },
    settings: {
      title: 'Store Settings & Tax Rules',
      subtitle: 'Drug license numbers, GST rate configurations & receipt print options',
    },
  };

  const current = titles[currentTab] || { title: 'Wellness Store', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      {/* Zone 1: Mobile toggle & Breadcrumb/Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
            {current.title}
          </h1>
          <span className="hidden sm:inline-block text-xs text-slate-500 mt-0.5">
            {current.subtitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Live Clock & Quick Status */}
      <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2 font-mono tabular-nums text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {lowStockCount > 0 && (
          <div
            title={`${lowStockCount} items below minimum stock threshold`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/70 rounded-md text-xs font-medium"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono tabular-nums font-semibold">{lowStockCount}</span>
            <span className="text-[11px] text-amber-700">Low Stock</span>
          </div>
        )}

        <button
          onClick={onRefreshData}
          title="Refresh Data"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {currentTab !== 'new-bill' && (
          <button
            onClick={onNewBillClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </button>
        )}
      </div>
    </header>
  );
};
