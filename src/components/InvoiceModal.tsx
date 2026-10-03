import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Bill, StoreSettings } from '../types';
import { formatCurrency, formatDate, formatDateTime, numberToWords } from '../utils/formatters';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface InvoiceModalProps {
  bill: Bill | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bill, settings, onClose }) => {
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateInvoicePDF(bill, settings);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3.5 h-3.5" />
            Paid in Full
          </span>
        );
      case 'Partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Partial Payment
          </span>
        );
      case 'Unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Payment Due
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Invoice Preview</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-xs text-teal-700 font-semibold">{bill.bill_number}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors ml-1"
              aria-label="Close invoice preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print:p-0 print:overflow-visible" ref={invoicePrintRef}>
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-6 sm:p-8 text-slate-800 text-xs sm:text-sm print:border-none print:p-0 print:max-w-none">
            
            {/* Header: Store Identity */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif font-bold text-teal-800">Rx</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {settings.store_name || 'WELLNESS MEDICAL STORE'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{settings.tagline || 'Your Trusted Healthcare & Pharmacy Partner'}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    {settings.address || 'Shop No. 12, Healthway Complex, MG Road'}<br />
                    {settings.city_state_pin || 'Bangalore, Karnataka - 560001'}<br />
                    <span className="text-slate-500">Phone: {settings.phone} · Email: {settings.email}</span>
                  </p>
                </div>

                {/* Statutory License & Tax Identifiers */}
                <div className="text-right text-xs space-y-1 sm:min-w-[200px] bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-none print:p-0">
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">GSTIN:</span>
                    <span className="font-mono font-semibold text-slate-900">{settings.gstin || '29AAAAA0000A1Z5'}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">D.L. No (20B/21B):</span>
                    <span className="font-mono text-slate-800">{settings.dl_number || 'KA-BLR-2024-004521'}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">Pharmacist:</span>
                    <span className="text-slate-800 font-medium">{settings.pharmacist_name || 'R. Sharma, B.Pharm'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="py-2.5 px-3 my-4 bg-teal-50 border border-teal-200/80 rounded-md flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-teal-900">
                Tax Invoice / Retail Cash Memo
              </span>
              <div>{getStatusBadge(bill.payment_status)}</div>
            </div>

            {/* Customer & Invoice Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-200 text-xs">
              <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-md border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer / Patient Info
                </span>
                <div className="font-semibold text-slate-900 text-sm">{bill.customer_name}</div>
                <div className="text-slate-600">
                  <span className="text-slate-400">Phone: </span>
                  <span className="font-mono tabular-nums">{bill.customer_phone}</span>
                </div>
                {bill.customer_address && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Address: </span>
                    {bill.customer_address}
                  </div>
                )}
                {bill.doctor_name && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Prescribing Dr: </span>
                    <span className="font-medium text-slate-800">{bill.doctor_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-md border border-slate-100 print:bg-transparent print:border-none print:p-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Invoice Details
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Number:</span>
                  <span className="font-mono font-bold text-teal-800 text-sm">{bill.bill_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span className="font-mono tabular-nums text-slate-800">{formatDateTime(bill.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-medium text-slate-800">{bill.payment_mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax Type:</span>
                  <span className="font-mono text-slate-700">
                    {bill.tax_type === 'igst' ? `IGST (${bill.tax_rate}%)` : `CGST+SGST (${bill.tax_rate}%)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Medicines Items Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2 px-1 text-center w-8">#</th>
                    <th className="py-2 px-2">Medicine / Item</th>
                    <th className="py-2 px-2 text-center">Batch</th>
                    <th className="py-2 px-2 text-center">Exp Date</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2 text-right">Disc%</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bill.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-1 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-slate-900">{item.medicine_name}</div>
                        {item.medicine_code && (
                          <div className="text-[11px] text-slate-400 font-mono">{item.medicine_code}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                        {item.batch_number || '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600">
                        {item.expiry_date || '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-700">
                        {item.unit_price.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-500">
                        {item.discount_percent > 0 ? `${item.discount_percent}%` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {item.total_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations & Breakdown */}
            <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              {/* Left Column: Words and Payment Breakdown */}
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Amount in Words
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 leading-snug">
                    {numberToWords(bill.grand_total)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1.5 print:bg-white print:border print:p-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Mode:</span>
                    <span className="font-medium text-slate-900">{bill.payment_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      {formatCurrency(bill.paid_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Balance Due:</span>
                    <span className={`font-mono tabular-nums font-semibold ${bill.balance_due > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatCurrency(bill.balance_due)}
                    </span>
                  </div>
                </div>

                {bill.notes && (
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold">Doctor / Order Notes: </span>
                    {bill.notes}
                  </div>
                )}
              </div>

              {/* Right Column: Financial Figures */}
              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(bill.subtotal)}</span>
                </div>

                {bill.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono tabular-nums">-{formatCurrency(bill.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                  <span>Taxable Amount:</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(bill.subtotal - bill.discount_amount)}
                  </span>
                </div>

                {bill.tax_type === 'igst' ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST ({bill.tax_rate}%):</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(bill.igst_amount || bill.tax_amount)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST ({(bill.tax_rate / 2).toFixed(1)}%):</span>
                      <span className="font-mono tabular-nums">{formatCurrency(bill.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST ({(bill.tax_rate / 2).toFixed(1)}%):</span>
                      <span className="font-mono tabular-nums">{formatCurrency(bill.sgst_amount)}</span>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono tabular-nums text-base text-teal-800">
                    {formatCurrency(bill.grand_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms and Signatory Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-[11px] text-slate-500">
              <div className="space-y-1 max-w-sm">
                <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
                <p className="whitespace-pre-line leading-relaxed text-slate-500">
                  {settings.invoice_terms ||
                    '1. Medicines once sold will not be returned without original cash memo.\n2. Keep out of reach of children.\n3. Take medicines strictly as prescribed by your doctor.'}
                </p>
              </div>

              <div className="text-right space-y-8 sm:min-w-[180px]">
                <span className="block text-slate-600 font-medium">For Wellness Medical Store</span>
                <div>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                    Authorized Signatory
                  </div>
                  <span className="text-[10px] text-slate-400 block">(Registered Pharmacist)</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer (Hidden in print) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <div className="flex items-center gap-2">
            <span>Bill Generated: {formatDate(bill.created_at)}</span>
            <span>·</span>
            <span>Items: {bill.items?.length || 0}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
