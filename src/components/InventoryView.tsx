import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Layers,
  CheckCircle,
  X,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Medicine } from '../types';
import { formatCurrency, formatExpiry, formatDate } from '../utils/formatters';
import {
  createMedicine,
  updateMedicine,
  adjustMedicineStock,
  deleteMedicine,
} from '../services/api';

interface InventoryViewProps {
  medicines: Medicine[];
  categories: string[];
  initialLowStockFilter?: boolean;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  categories,
  initialLowStockFilter = false,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockFilter);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [restockMedicine, setRestockMedicine] = useState<Medicine | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    generic_name: '',
    category: 'General',
    batch_number: '',
    expiry_date: '',
    mrp: '',
    selling_price: '',
    stock: '',
    min_stock_alert: '15',
    unit: 'Strips',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLowStockOnly(initialLowStockFilter);
  }, [initialLowStockFilter]);

  // Filtered medicines
  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(search.toLowerCase())) ||
      (m.batch_number && m.batch_number.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesLowStock = !lowStockOnly || m.stock <= m.min_stock_alert;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleOpenAddModal = () => {
    setFormData({
      code: '',
      name: '',
      generic_name: '',
      category: 'General',
      batch_number: '',
      expiry_date: '',
      mrp: '',
      selling_price: '',
      stock: '20',
      min_stock_alert: '15',
      unit: 'Strips',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      code: med.code,
      name: med.name,
      generic_name: med.generic_name || '',
      category: med.category,
      batch_number: med.batch_number || '',
      expiry_date: med.expiry_date || '',
      mrp: String(med.mrp),
      selling_price: String(med.selling_price),
      stock: String(med.stock),
      min_stock_alert: String(med.min_stock_alert),
      unit: med.unit,
    });
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.selling_price) {
      setFormError('Medicine name and selling price are required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingMedicine) {
        await updateMedicine(editingMedicine.id, {
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          generic_name: formData.generic_name.trim() || undefined,
          category: formData.category,
          batch_number: formData.batch_number.trim() || undefined,
          expiry_date: formData.expiry_date || undefined,
          mrp: Number(formData.mrp) || Number(formData.selling_price),
          selling_price: Number(formData.selling_price),
          stock: parseInt(formData.stock, 10) || 0,
          min_stock_alert: parseInt(formData.min_stock_alert, 10) || 15,
          unit: formData.unit,
        });
        setEditingMedicine(null);
      } else {
        await createMedicine({
          code: formData.code.trim() || undefined,
          name: formData.name.trim(),
          generic_name: formData.generic_name.trim() || undefined,
          category: formData.category,
          batch_number: formData.batch_number.trim() || undefined,
          expiry_date: formData.expiry_date || undefined,
          mrp: Number(formData.mrp) || Number(formData.selling_price),
          selling_price: Number(formData.selling_price),
          stock: parseInt(formData.stock, 10) || 0,
          min_stock_alert: parseInt(formData.min_stock_alert, 10) || 15,
          unit: formData.unit,
        });
        setIsAddModalOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockMedicine) return;

    try {
      await adjustMedicineStock(restockMedicine.id, {
        adjustment: Number(restockQty),
        reason: 'Restock / Purchase replenishment',
      });
      setRestockMedicine(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        await deleteMedicine(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete medicine');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Medicine Master & Inventory</h2>
          <p className="text-xs text-slate-500">
            Real-time stock levels, batch numbers, MRP, and automated billing deductions
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search medicine name, salt/composition, code, or batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-teal-600 font-medium"
            >
              <option value="All">All Categories ({medicines.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle */}
          <div className="md:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Low Stock Only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Medicine & Generic Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Batch / Expiry</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((med) => {
                  const isLow = med.stock <= med.min_stock_alert;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800 text-[11px]">
                        {med.code}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{med.name}</div>
                        {med.generic_name && (
                          <div className="text-[11px] text-slate-500">{med.generic_name}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {med.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        <div className="text-slate-800">{med.batch_number || '—'}</div>
                        <div className="text-slate-400">{formatExpiry(med.expiry_date)}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400 line-through">
                        {formatCurrency(med.mrp)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(med.selling_price)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              isLow
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {med.stock} {med.unit}
                          </span>
                          {isLow && (
                            <span
                              className="text-[10px] text-amber-700 font-semibold"
                              title={`Below minimum stock of ${med.min_stock_alert}`}
                            >
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setRestockMedicine(med);
                              setRestockQty(50);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                            title="Quick Stock Restock"
                          >
                            + Stock
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(med)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id, med.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {(isAddModalOpen || editingMedicine) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMedicine ? 'Edit Medicine Details' : 'Add New Medicine to Inventory'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingMedicine(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medicine Code / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MED-116"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to auto-generate</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Antibiotic, Antacid, Syrups"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Commercial Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 650mg (Dolo)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Generic Formula / Salt Composition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol IP 650mg"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL-25A01"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Type
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    aria-label="Unit Type"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Strips">Strips</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Tubes">Tubes</option>
                    <option value="Sachets">Sachets</option>
                    <option value="Vials">Vials</option>
                    <option value="Pieces">Pieces</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Min Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingMedicine(null);
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingMedicine ? 'Update Medicine' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Restock Modal */}
      {restockMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Restock Medicine</h3>
              <button onClick={() => setRestockMedicine(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="font-semibold text-slate-900">{restockMedicine.name}</div>
              <div className="text-slate-500 font-mono">Current Stock: {restockMedicine.stock} {restockMedicine.unit}</div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity to Add ({restockMedicine.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-sm focus:outline-teal-600"
                  required
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  New stock will be: {restockMedicine.stock + (Number(restockQty) || 0)} {restockMedicine.unit}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockMedicine(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold shadow-xs"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
