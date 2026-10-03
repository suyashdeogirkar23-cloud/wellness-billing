import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  History,
  Pill,
  Users,
  Settings,
  PlusCircle,
  Activity,
  X,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'new-bill' | 'history' | 'inventory' | 'customers' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  lowStockCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  lowStockCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Analytics',
    },
    {
      id: 'new-bill' as NavTab,
      label: 'New Bill (POS)',
      icon: PlusCircle,
      description: 'Create Retail Invoice',
      highlight: true,
    },
    {
      id: 'history' as NavTab,
      label: 'Billing History',
      icon: History,
      description: 'Records & Invoices',
    },
    {
      id: 'inventory' as NavTab,
      label: 'Medicine Inventory',
      icon: Pill,
      description: 'Stock, Batch & Expiry',
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      id: 'customers' as NavTab,
      label: 'Customer Directory',
      icon: Users,
      description: 'Clients & Balances',
    },
    {
      id: 'settings' as NavTab,
      label: 'Store Settings',
      icon: Settings,
      description: 'GST & Store Profile',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight block leading-tight">
                Wellness Medical
              </span>
              <span className="text-[11px] font-medium text-teal-700 uppercase tracking-wider block">
                Pharmacy POS & Stock
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action POS Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onSelectTab('new-bill');
              onCloseMobile();
            }}
            className={`w-full py-2.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
              currentTab === 'new-bill'
                ? 'bg-teal-700 text-white shadow-teal-700/20'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate New Bill</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-teal-600' : 'text-slate-400'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block truncate">{item.label}</span>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className="ml-2 px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-amber-100 text-amber-800 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Store Status Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="font-medium text-slate-800">Pharmacy System Ready</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            SQLite Database & GST Engine Active
          </p>
        </div>
      </aside>
    </>
  );
};
