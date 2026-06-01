import { useParams, useNavigate } from 'react-router-dom';
import { useBills } from '../context/BillContext';
import { formatCurrency } from '../utils/helpers';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useMemo } from 'react';

export default function BillDetails() {
  const { id } = useParams();
  const { getBill, finalizeBill } = useBills();
  const navigate = useNavigate();
  const bill = getBill(id || '');
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // Full bill details for clipboard sharing
  const fullBillText = useMemo(() => {
    if (!bill) return '';
    return [
      `Bill: ${bill.billNumber}`,
      `Date: ${bill.date} ${bill.time}`,
      `Store: ${bill.storeName}`,
      `Customer: ${bill.customerName}`,
      `Items:`,
      ...bill.items.map((it) => `  - ${it.name} x${it.quantity} @ ${formatCurrency(it.unitPrice)} = ${formatCurrency(it.totalPrice)}`),
      `Total: ${formatCurrency(bill.grandTotal)}`,
      `Payment: ${bill.paymentMethod}`,
    ].join('\n');
  }, [bill]);

  function handleCopyBill() {
    navigator.clipboard.writeText(fullBillText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!bill) {
    return (
      <div className="card text-center py-16">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-gray-500 mb-4">Bill not found</p>
        <button onClick={() => navigate('/bill-history')} className="btn-primary">Go to History</button>
      </div>
    );
  }

  function handlePrint() {
    window.print();
  }

  async function handleFinalize() {
    if (id) await finalizeBill(id);
  }

  // Human-readable bill text for QR code
  const qrData = [
    `--- ${bill.storeName} ---`,
    bill.storeAddress,
    `Bill: ${bill.billNumber}`,
    `Date: ${bill.date} ${bill.time}`,
    `Customer: ${bill.customerName}`,
    bill.customerPhone ? `Phone: ${bill.customerPhone}` : '',
    ``,
    `Items:`,
    ...bill.items.map((it, idx) => `${idx + 1}. ${it.name} x${it.quantity} @ ${it.unitPrice} = ${it.totalPrice}`),
    ``,
    `Subtotal: ${bill.subtotal}`,
    bill.discountAmount > 0 ? `Discount (${bill.discountRate}%): -${bill.discountAmount}` : '',
    `Tax (${bill.taxRate}%): +${bill.taxAmount}`,
    `Grand Total: ${bill.grandTotal}`,
    `Payment: ${bill.paymentMethod.toUpperCase()}`,
    ``,
    `Thank you for your business!`,
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Details</h1>
          <p className="text-gray-500 text-sm mt-1">{bill.billNumber}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {!bill.finalized && <button onClick={handleFinalize} className="btn-success">✓ Finalize</button>}
          {bill.finalized && <button onClick={() => setShowQR(!showQR)} className="btn-secondary">{showQR ? 'Hide QR' : '📱 Share QR'}</button>}
          <button onClick={handlePrint} className="btn-secondary">🖨️ Print</button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="no-print">
        <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${bill.finalized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {bill.finalized ? '✅ Finalized' : '⏳ Pending'}
        </span>
      </div>

      {/* QR Code */}
      {showQR && bill.finalized && (
        <div className="card text-center animate-slide-down no-print">
          <h3 className="font-semibold text-gray-900 mb-4">Share via QR Code</h3>
          <div className="inline-block p-6 bg-white rounded-2xl border border-gray-200 shadow-md">
            <QRCodeSVG value={qrData} size={220} level="L" fgColor="#000000" bgColor="#ffffff" includeMargin={true} />
          </div>
          <p className="text-xs text-gray-400 mt-3 mb-4">Scan to view bill summary</p>
          <div className="flex justify-center gap-3">
            <button onClick={handleCopyBill} className="btn-secondary text-sm">
              {copied ? '✅ Copied!' : '📋 Copy Bill Details'}
            </button>
          </div>
          <details className="mt-4 text-left max-w-sm mx-auto">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View QR data</summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">{qrData}</pre>
          </details>
        </div>
      )}

      {/* Print Area */}
      <div className="print-area">
        <div className="card">
          {/* Header */}
          <div className="text-center border-b border-gray-100 pb-6 mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">{bill.storeName}</h2>
            <p className="text-sm text-gray-500 mt-1">{bill.storeAddress}</p>
            <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
              <span>📅 {bill.date}</span>
              <span>🕐 {bill.time}</span>
              <span>#{bill.billNumber}</span>
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Customer</p>
              <p className="font-medium text-gray-900">{bill.customerName}</p>
              {bill.customerPhone && <p className="text-sm text-gray-500">{bill.customerPhone}</p>}
            </div>
            <div className="md:text-right">
              <p className="text-xs text-gray-400 uppercase font-medium">Payment Method</p>
              <p className="font-medium text-gray-900 capitalize">{bill.paymentMethod}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-500 font-medium">#</th>
                <th className="text-left py-3 text-gray-500 font-medium">Item</th>
                <th className="text-center py-3 text-gray-500 font-medium">Qty</th>
                <th className="text-right py-3 text-gray-500 font-medium">Price</th>
                <th className="text-right py-3 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-3 text-gray-400">{idx + 1}</td>
                  <td className="py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(bill.subtotal)}</span></div>
            {bill.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({bill.discountRate}%)</span><span>-{formatCurrency(bill.discountAmount)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Tax ({bill.taxRate}%)</span><span className="font-medium">+{formatCurrency(bill.taxAmount)}</span></div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200"><span>Grand Total</span><span>{formatCurrency(bill.grandTotal)}</span></div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-400">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
