import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, Shield, Building, Percent, FileText } from 'lucide-react';
import { StoreSettings } from '../types';
import { saveSettings } from '../services/api';

interface SettingsViewProps {
  settings: StoreSettings;
  onSettingsUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsUpdated }) => {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (key: keyof StoreSettings, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await saveSettings(formData);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      onSettingsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pharmacy & GST Settings</h2>
          <p className="text-xs text-slate-500">
            Configure store licensing, Drug License numbers, default GST rules, and invoice terms
          </p>
        </div>

        {successToast && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Store Information */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Medical Store Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Business Name *
              </label>
              <input
                type="text"
                value={formData.store_name || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Tagline
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Address
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City, State & Pincode
              </label>
              <input
                type="text"
                value={formData.city_state_pin || ''}
                onChange={(e) => handleChange('city_state_pin', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Statutory & Regulatory Licenses */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Statutory Licensing & Pharmacy Registration
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Goods and Services Tax ID)
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-teal-600 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Drug License No. (Form 20B / 21B)
              </label>
              <input
                type="text"
                value={formData.dl_number || ''}
                onChange={(e) => handleChange('dl_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-teal-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Pharmacist Name & Registration Number
              </label>
              <input
                type="text"
                value={formData.pharmacist_name || ''}
                onChange={(e) => handleChange('pharmacist_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Tax Calculation Defaults */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Tax (GST) Rules & Stock Enforcement
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default GST Rate (%)
              </label>
              <select
                value={formData.default_tax_rate || '12'}
                onChange={(e) => handleChange('default_tax_rate', e.target.value)}
                aria-label="Default GST Rate"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-teal-600 font-mono"
              >
                <option value="0">0% (Exempt Medicines)</option>
                <option value="5">5% (Life-saving Drugs & Vaccines)</option>
                <option value="12">12% (Standard Formulations & Antibiotics)</option>
                <option value="18">18% (Supplements, Cosmetics & Diagnostics)</option>
                <option value="28">28% (Luxury / Specific Consumables)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inventory Stock Enforcement
              </label>
              <select
                value={formData.inventory_tracking_enabled || 'true'}
                onChange={(e) => handleChange('inventory_tracking_enabled', e.target.value)}
                aria-label="Inventory Stock Enforcement"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-teal-600"
              >
                <option value="true">Strict (Prevent billing quantities exceeding stock)</option>
                <option value="false">Relaxed (Allow billing regardless of recorded stock)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Invoice Terms & Conditions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Invoice Terms & Legal Disclaimers
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Printed Invoice Terms (Appears on Bottom of Invoices & PDFs)
            </label>
            <textarea
              rows={4}
              value={formData.invoice_terms || ''}
              onChange={(e) => handleChange('invoice_terms', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-teal-600 font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Configurations...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
