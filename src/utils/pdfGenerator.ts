import { jsPDF } from 'jspdf';
import { Bill, StoreSettings } from '../types';
import { formatCurrency, formatDate, formatDateTime, numberToWords } from './formatters';

export function generateInvoicePDF(bill: Bill, settings: StoreSettings): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  // Colors
  const primaryColor = [15, 118, 110]; // #0f766e Teal
  const darkTextColor = [15, 23, 42]; // #0f172a Slate 900
  const mutedTextColor = [100, 116, 139]; // #64748b Slate 500
  const borderColor = [226, 232, 240]; // #e2e8f0 Slate 200

  // 1. Header Box / Background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 34, 2, 2, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 34, 2, 2, 'D');

  // Store Brand Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.store_name || 'WELLNESS MEDICAL STORE', margin + 6, y + 8);

  // Store Tagline & Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(settings.tagline || 'Your Trusted Healthcare & Pharmacy Partner', margin + 6, y + 13);
  doc.text(settings.address || '', margin + 6, y + 18);
  doc.text(settings.city_state_pin || '', margin + 6, y + 23);
  doc.text(`Phone: ${settings.phone || ''}  |  Email: ${settings.email || ''}`, margin + 6, y + 28);

  // Right-aligned Store Licenses & GST
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('GSTIN:', pageWidth - margin - 55, y + 8);
  doc.text('D.L. No:', pageWidth - margin - 55, y + 14);
  doc.text('Pharmacist:', pageWidth - margin - 55, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.gstin || '29AAAAA0000A1Z5', pageWidth - margin - 38, y + 8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(settings.dl_number || 'KA-BLR-2024-004521', pageWidth - margin - 38, y + 14);
  doc.text(settings.pharmacist_name || 'Registered Pharmacist', pageWidth - margin - 38, y + 20);

  y += 39;

  // 2. Invoice Title Banner
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('RETAIL TAX INVOICE / CASH MEMO', margin + 6, y + 5);

  const statusLabel = bill.payment_status.toUpperCase();
  doc.setFontSize(9);
  doc.text(`STATUS: ${statusLabel}`, pageWidth - margin - 36, y + 5);

  y += 11;

  // 3. Bill & Customer Metadata Grid (Two-column layout)
  const metaHeight = 26;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, (pageWidth - 2 * margin) / 2, metaHeight, 'D');
  doc.rect(margin + (pageWidth - 2 * margin) / 2, y, (pageWidth - 2 * margin) / 2, metaHeight, 'D');

  // Customer Details (Left Box)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('PATIENT / CUSTOMER DETAILS', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Name:', margin + 4, y + 10);
  doc.text('Phone:', margin + 4, y + 15);
  doc.text('Address:', margin + 4, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(bill.customer_name || 'Walk-in Customer', margin + 20, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.customer_phone || '—', margin + 20, y + 15);
  const truncatedAddress = (bill.customer_address || '—').slice(0, 45);
  doc.text(truncatedAddress, margin + 20, y + 20);

  // Bill Metadata (Right Box)
  const rightX = margin + (pageWidth - 2 * margin) / 2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('INVOICE SPECIFICATIONS', rightX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Invoice No:', rightX, y + 10);
  doc.text('Date & Time:', rightX, y + 15);
  doc.text('Doctor / Rx:', rightX, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(bill.bill_number, rightX + 22, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(formatDateTime(bill.created_at), rightX + 22, y + 15);
  doc.text(bill.doctor_name || 'Self-Prescribed / OTC', rightX + 22, y + 20);

  y += metaHeight + 6;

  // 4. Medicines Items Table
  const colX = {
    sr: margin + 2,
    item: margin + 10,
    batch: margin + 74,
    exp: margin + 98,
    qty: margin + 118,
    rate: margin + 134,
    disc: margin + 152,
    amount: pageWidth - margin - 4,
  };

  // Table Header
  const tableHeaderHeight = 7;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - 2 * margin, tableHeaderHeight, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, y + tableHeaderHeight, pageWidth - margin, y + tableHeaderHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  doc.text('#', colX.sr, y + 5);
  doc.text('Medicine / Product Name', colX.item, y + 5);
  doc.text('Batch', colX.batch, y + 5);
  doc.text('Exp Date', colX.exp, y + 5);
  doc.text('Qty', colX.qty, y + 5);
  doc.text('Rate', colX.rate, y + 5);
  doc.text('Disc %', colX.disc, y + 5);
  doc.text('Total (Rs)', colX.amount, y + 5, { align: 'right' });

  y += tableHeaderHeight;

  // Table Body Rows
  const items = bill.items || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  items.forEach((item, index) => {
    const rowHeight = 7;
    // Alternate row stripe
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');
    }

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(String(index + 1), colX.sr, y + 4.8);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    const cleanItemName = item.medicine_name.length > 38 ? item.medicine_name.slice(0, 36) + '...' : item.medicine_name;
    doc.text(cleanItemName, colX.item, y + 4.8);

    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(item.batch_number || '—', colX.batch, y + 4.8);
    doc.text(item.expiry_date || '—', colX.exp, y + 4.8);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(String(item.quantity), colX.qty + 2, y + 4.8);
    doc.text(item.unit_price.toFixed(2), colX.rate, y + 4.8);

    const discStr = item.discount_percent > 0 ? `${item.discount_percent}%` : '—';
    doc.text(discStr, colX.disc, y + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.text(item.total_price.toFixed(2), colX.amount, y + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  y += 4;

  // 5. Total Calculations & Tax Breakdown Box (Bottom Right)
  const calcBoxWidth = 85;
  const calcBoxX = pageWidth - margin - calcBoxWidth;
  const startCalcY = y;

  // Left Note / Words Area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Amount in Words:', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  const words = numberToWords(bill.grand_total);
  const splitWords = doc.splitTextToSize(words, calcBoxX - margin - 8);
  doc.text(splitWords, margin, y + 9);

  // Payment method & balance note
  const noteY = y + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`Payment Mode: ${bill.payment_mode}`, margin, noteY);
  doc.text(`Paid: ${formatCurrency(bill.paid_amount)}`, margin + 45, noteY);
  if (bill.balance_due > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Balance Due: ${formatCurrency(bill.balance_due)}`, margin + 85, noteY);
  }

  // Right Calculations Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(calcBoxX, startCalcY, calcBoxWidth, 42, 2, 2, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(calcBoxX, startCalcY, calcBoxWidth, 42, 2, 2, 'D');

  let rowY = startCalcY + 6;
  const labelX = calcBoxX + 4;
  const valX = pageWidth - margin - 4;

  const renderCalcRow = (label: string, value: string, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9.5 : 8);
    doc.setTextColor(isBold ? darkTextColor[0] : mutedTextColor[0], isBold ? darkTextColor[1] : mutedTextColor[1], isBold ? darkTextColor[2] : mutedTextColor[2]);
    doc.text(label, labelX, rowY);
    doc.text(value, valX, rowY, { align: 'right' });
    rowY += 5.5;
  };

  renderCalcRow('Subtotal:', formatCurrency(bill.subtotal));
  if (bill.discount_amount > 0) {
    renderCalcRow('Discount:', `-${formatCurrency(bill.discount_amount)}`);
  }

  if (bill.tax_type === 'igst') {
    renderCalcRow(`IGST (${bill.tax_rate}%):`, formatCurrency(bill.igst_amount || bill.tax_amount));
  } else {
    const halfRate = (bill.tax_rate / 2).toFixed(1);
    renderCalcRow(`CGST (${halfRate}%):`, formatCurrency(bill.cgst_amount));
    renderCalcRow(`SGST (${halfRate}%):`, formatCurrency(bill.sgst_amount));
  }

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(calcBoxX + 2, rowY - 1, pageWidth - margin - 2, rowY - 1);
  rowY += 1.5;

  // Grand Total highlight
  doc.setFillColor(15, 118, 110);
  doc.roundedRect(calcBoxX + 2, rowY - 3, calcBoxWidth - 4, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Grand Total:', labelX + 2, rowY + 2.5);
  doc.text(formatCurrency(bill.grand_total), valX - 2, rowY + 2.5, { align: 'right' });

  y = Math.max(y + 44, startCalcY + 46);

  // 6. Terms & Conditions and Signature Section
  y = pageHeight - 34;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Terms & Conditions:', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  const termsText = settings.invoice_terms || '1. Medicines once sold will not be returned without original cash memo.\n2. Please consult doctor before taking medicines.';
  const termsLines = termsText.split('\n');
  termsLines.slice(0, 3).forEach((line, i) => {
    doc.text(line, margin, y + 8 + i * 3.5);
  });

  // Pharmacist Signature Block
  const sigX = pageWidth - margin - 45;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('For Wellness Medical Store', sigX, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Authorized Signatory', sigX, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('(Registered Pharmacist)', sigX, y + 21);

  // Trigger download
  const filename = `${bill.bill_number.replace(/[^a-zA-Z0-9_-]/g, '_')}_Invoice.pdf`;
  doc.save(filename);
}
