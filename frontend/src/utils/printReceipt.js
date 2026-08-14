import { formatCurrency } from './formatters';

/**
 * Universal, bulletproof receipt printing utility using an isolated iframe.
 * Eliminates all background bleed, clipping, and SPA modal CSS conflicts.
 */
export const printReceipt = ({ receipt, invoice, hospital }) => {
  const pat = receipt?.patientId || invoice?.patientId || receipt?.invoiceId?.patientId || {};
  const patName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim() || 'Walk-in Patient';
  const patUhid = pat.uhid || invoice?.patientUhid || 'N/A';
  const patPhone = pat.phone || 'N/A';

  const docObj = receipt?.invoiceId?.doctorId || invoice?.doctorId || receipt?.invoiceId?.consultation?.doctorId || invoice?.consultation?.doctorId;
  const rawDocName = receipt?.invoiceId?.doctorName || invoice?.doctorName || docObj?.name;
  const docName = rawDocName ? (rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`) : 'Dr. Test Doctor';

  const hospObj = receipt?.hospitalId || hospital || invoice?.hospitalId || {};
  const hospName = hospObj?.name || 'Test Hospital Main Campus';

  const addrObj = hospObj?.address || {};
  const formattedAddress = [
    addrObj?.street || '123 Healthcare Boulevard, Medical Enclave',
    addrObj?.city || 'Chennai',
    addrObj?.state || 'Tamil Nadu',
    addrObj?.postalCode ? `PIN: ${addrObj.postalCode}` : 'PIN: 600001',
  ].filter(Boolean).join(', ');

  const hospPhone = hospObj?.contactPhone || '6380140927';
  const hospEmail = hospObj?.contactEmail || 'billing@testhospital.com';

  const invData = receipt?.invoiceId || invoice || {};
  const invNo = invData.invoiceNo || 'INV-TH-2026-00001';
  const rcNo = receipt?.receiptNo || 'REC-2026-00001';
  const paymentDate = receipt?.createdAt ? new Date(receipt.createdAt) : new Date();
  const tenderMode = receipt?.paymentMode || 'CARD';
  const paidAmount = receipt?.amountPaid || invData.paidAmount || invData.grandTotal || 0;

  const items = invData.items && invData.items.length > 0 ? invData.items : [
    { description: 'OPD General Consultation Fee', qty: 1, unitPrice: paidAmount, totalPrice: paidAmount },
  ];

  const subtotal = invData.subtotal || items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const discount = invData.discountAmount || 0;
  const grandTotal = invData.grandTotal || (subtotal - discount);
  const balanceDue = Math.max(0, (invData.balanceAmount !== undefined ? invData.balanceAmount : grandTotal - paidAmount));

  const itemsHtml = items.map((it, idx) => `
    <tr>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 10px;">${idx + 1}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 500;">
        ${it.description}
        ${it.category ? `<span style="font-size: 9px; padding: 2px 4px; border-radius: 4px; background: #f1f5f9; color: #475569; margin-left: 6px; border: 1px solid #e2e8f0;">${it.category}</span>` : ''}
      </td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${it.qty || 1}x</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${formatCurrency(it.unitPrice)}</td>
      <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">${formatCurrency(it.totalPrice)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${rcNo}</title>
        <style>
          @page {
            margin: 10mm;
            size: auto;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.4;
            padding: 10px;
          }
          .receipt-container {
            max-width: 720px;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 20px;
            background: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .header .address {
            font-size: 11px;
            color: #334155;
            font-weight: 500;
            margin-bottom: 4px;
          }
          .header .contact {
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
          }
          .badge {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            font-size: 11px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
          }
          .meta-label {
            color: #64748b;
            font-weight: 500;
          }
          .meta-val {
            font-weight: bold;
            color: #0f172a;
          }
          .table-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          thead th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 800;
            color: #334155;
            text-align: left;
          }
          .totals-wrap {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 16px;
          }
          .totals-box {
            width: 250px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 11px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .totals-grand {
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
            margin-top: 4px;
            font-weight: 800;
            font-size: 12px;
            color: #0f172a;
          }
          .totals-paid {
            font-weight: 800;
            color: #059669;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: flex-end;
            gap: 16px;
            border-top: 2px solid #0f172a;
            padding-top: 16px;
            margin-top: 8px;
          }
          .stamp-box {
            width: 70px;
            height: 70px;
            border: 1px dashed #94a3b8;
            border-radius: 6px;
            display: flex;
            align-items: center;
            text-align: center;
            justify-content: center;
            font-size: 8px;
            color: #64748b;
            background: #fafafa;
            margin-bottom: 4px;
          }
          .signature-line {
            border-top: 1px solid #0f172a;
            width: 170px;
            margin-left: auto;
            text-align: right;
            padding-top: 4px;
          }
          .signature-title {
            font-weight: 800;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .signature-sub {
            font-size: 8px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>${hospName}</h1>
            <div class="address">${formattedAddress}</div>
            <div class="contact">📞 Phone: ${hospPhone} &nbsp;|&nbsp; ✉️ Email: ${hospEmail}</div>
            <div class="badge">Official Medical Cash Receipt & Treatment Bill</div>
          </div>

          <div class="meta-grid">
            <div class="meta-row">
              <span class="meta-label">Patient:</span>
              <span class="meta-val">${patName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Receipt No:</span>
              <span class="meta-val" style="font-family: monospace; color: #4338ca;">${rcNo}</span>
            </div>

            <div class="meta-row">
              <span class="meta-label">UHID:</span>
              <span class="meta-val" style="font-family: monospace;">${patUhid}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Invoice No:</span>
              <span class="meta-val" style="font-family: monospace;">${invNo}</span>
            </div>

            <div class="meta-row">
              <span class="meta-label">Mobile Phone:</span>
              <span class="meta-val" style="font-family: monospace;">${patPhone}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Date & Time:</span>
              <span class="meta-val">${paymentDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>

            <div class="meta-row" style="border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <span class="meta-label">Attending Doctor:</span>
              <span class="meta-val">${docName}</span>
            </div>
            <div class="meta-row" style="border-top: 1px solid #e2e8f0; padding-top: 4px;">
              <span class="meta-label">Tender Mode:</span>
              <span class="meta-val" style="color: #4338ca; text-transform: uppercase;">${tenderMode}</span>
            </div>
          </div>

          <div class="table-title">Treatment Item Breakdown (${items.length} Billable Services)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Treatment / Service Description</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 85px; text-align: right;">Unit Price</th>
                <th style="width: 90px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-wrap">
            <div class="totals-box">
              <div class="totals-row">
                <span style="color: #64748b;">Subtotal:</span>
                <span style="font-family: monospace;">${formatCurrency(subtotal)}</span>
              </div>
              ${discount > 0 ? `
              <div class="totals-row" style="color: #d97706;">
                <span>Discount:</span>
                <span style="font-family: monospace;">— ${formatCurrency(discount)}</span>
              </div>` : ''}
              <div class="totals-row totals-grand">
                <span>Grand Total:</span>
                <span style="font-family: monospace;">${formatCurrency(grandTotal)}</span>
              </div>
              <div class="totals-row totals-paid">
                <span>Amount Paid:</span>
                <span style="font-family: monospace;">${formatCurrency(paidAmount)}</span>
              </div>
              <div class="totals-row" style="color: #64748b; font-size: 10px;">
                <span>Balance Due:</span>
                <span style="font-family: monospace;">${formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          <div class="footer-grid">
            <div>
              <div class="stamp-box">Hospital Seal / Stamp</div>
              <div style="font-size: 9px; color: #64748b;">Thank you for your visit. Computer-generated official receipt.</div>
            </div>
            <div style="text-align: right;">
              <div class="signature-line">
                <div class="signature-title">Authorized Signatory</div>
                <div class="signature-sub">Cashier / Billing In-Charge</div>
              </div>
            </div>
          </div>

          <div style="margin-top: 14px; padding-top: 8px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #64748b; font-family: sans-serif;">
            <span>Powered by <strong style="color: #0f172a;">Risewithmedia.com</strong></span>
            <span style="font-family: monospace; font-weight: 600; color: #4338ca;">hms.risewithmedia.com</span>
          </div>
        </div>
      </body>
    </html>
  `;

  // Create or reuse hidden printable iframe
  let iframe = document.getElementById('receipt-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Trigger print once document is ready
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
};
