/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { NewBillView } from './components/NewBillView';
import { BillingHistoryView } from './components/BillingHistoryView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import { Bill, Medicine, StoreSettings, DashboardData, Customer } from './types';
import {
  fetchDashboard,
  fetchMedicines,
  fetchSettings,
  fetchBillById,
  adjustMedicineStock,
} from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'Wellness Medical Store',
    tagline: 'Your Trusted Healthcare & Pharmacy Partner',
    address: 'Shop No. 12, Ground Floor, Healthway Complex, MG Road',
    city_state_pin: 'Bangalore, Karnataka - 560001',
    phone: '+91 98765 43210',
    email: 'billing@wellnessmedical.in',
    gstin: '29AAAAA0000A1Z5',
    dl_number: 'KA-BLR-2024-004521 / 004522',
    pharmacist_name: 'R. Sharma, B.Pharm',
    default_tax_rate: '12',
    tax_type: 'cgst_sgst',
    invoice_terms: '1. Medicines once sold cannot be returned without original cash memo.\n2. Keep medicines stored in cool & dry place.\n3. Please consult a registered doctor before consumption.',
    currency_symbol: '₹',
    inventory_tracking_enabled: 'true',
  });

  // Modal Invoice State
  const [activeInvoice, setActiveInvoice] = useState<Bill | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [inventoryLowStockFilter, setInventoryLowStockFilter] = useState(false);

  // 1. Initial Load of settings, dashboard and medicines
  const loadInitialData = useCallback(async () => {
    try {
      const [dash, meds, sett] = await Promise.all([
        fetchDashboard(),
        fetchMedicines(),
        fetchSettings(),
      ]);
      setDashboardData(dash);
      setMedicines(meds.medicines);
      setCategories(meds.categories);
      if (sett && sett.store_name) {
        setSettings(sett);
      }
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh functions
  const handleRefreshAll = () => {
    loadInitialData();
    setHistoryRefreshKey((k) => k + 1);
  };

  const handleRefreshMedicinesOnly = async () => {
    try {
      const meds = await fetchMedicines();
      setMedicines(meds.medicines);
      setCategories(meds.categories);
      const dash = await fetchDashboard();
      setDashboardData(dash);
      setHistoryRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Error refreshing medicines:', err);
    }
  };

  // View Bill Modal
  const handleViewBillById = async (billId: number) => {
    try {
      const fullBill = await fetchBillById(billId);
      setActiveInvoice(fullBill);
    } catch (err) {
      console.error('Failed to fetch bill by ID:', err);
    }
  };

  // When bill is created
  const handleBillCreated = (newBill: Bill, action: 'print' | 'pdf' | 'none') => {
    handleRefreshMedicinesOnly();
    if (action === 'print') {
      setActiveInvoice(newBill);
    }
  };

  // Restock action from dashboard
  const handleQuickRestock = async (medId: number, currentStock: number) => {
    const qtyStr = window.prompt(`Enter quantity to add to stock (Current: ${currentStock}):`, '30');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await adjustMedicineStock(medId, {
        adjustment: qty,
        reason: 'Dashboard Quick Restock',
      });
      handleRefreshMedicinesOnly();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'inventory') setInventoryLowStockFilter(false);
        }}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        lowStockCount={dashboardData?.lowStockCount || 0}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNewBillClick={() => setCurrentTab('new-bill')}
          onRefreshData={handleRefreshAll}
          lowStockCount={dashboardData?.lowStockCount || 0}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              settings={settings}
              onNavigateToNewBill={() => setCurrentTab('new-bill')}
              onNavigateToHistory={() => setCurrentTab('history')}
              onNavigateToInventory={(lowStock?: boolean) => {
                if (lowStock) setInventoryLowStockFilter(true);
                setCurrentTab('inventory');
              }}
              onViewBill={handleViewBillById}
              onQuickRestock={handleQuickRestock}
            />
          )}

          {currentTab === 'new-bill' && (
            <NewBillView
              medicines={medicines}
              settings={settings}
              onBillCreated={handleBillCreated}
              onRefreshMedicines={handleRefreshMedicinesOnly}
            />
          )}

          {currentTab === 'history' && (
            <BillingHistoryView
              onViewInvoice={(bill) => setActiveInvoice(bill)}
              onRefreshTrigger={historyRefreshKey}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              medicines={medicines}
              categories={categories}
              initialLowStockFilter={inventoryLowStockFilter}
              onRefresh={handleRefreshMedicinesOnly}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              onStartBillForCustomer={() => {
                setCurrentTab('new-bill');
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={handleRefreshAll}
            />
          )}
        </main>
      </div>

      {/* Full-screen / Print Invoice Modal */}
      {activeInvoice && (
        <InvoiceModal
          bill={activeInvoice}
          settings={settings}
          onClose={() => setActiveInvoice(null)}
        />
      )}
    </div>
  );
}
