import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBills } from '../context/BillContext';
import { Bill, BillItem } from '../types';
import { generateId, generateBillNumber, getCurrentDate, getCurrentTime, sanitizeInput, formatCurrency } from '../utils/helpers';

export default function CreateBill() {
  const { user, isOnline } = useAuth();
  const { addBill, createBillOnServer } = useBills();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Bill['paymentMethod']>('cash');
  const [taxRate, setTaxRate] = useState(18);
  const [discountRate, setDiscountRate] = useState(0);
  const [items, setItems] = useState<BillItem[]>([]);
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unitPrice: 0 });
  const [error, setError] = useState('');

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  function addItem() {
    const name = sanitizeInput(newItem.name);
    if (!name) { setError('Item name is required'); return; }
    if (newItem.quantity <= 0) { setError('Quantity must be positive'); return; }
    if (newItem.unitPrice <= 0) { setError('Price must be positive'); return; }
    setError('');
    const item: BillItem = {
      id: generateId(),
      name,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      totalPrice: newItem.quantity * newItem.unitPrice,
    };
    setItems([...items, item]);
    setNewItem({ name: '', quantity: 1, unitPrice: 0 });
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: 'quantity' | 'unitPrice', value: number) {
    setItems(items.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      updated.totalPrice = updated.quantity * updated.unitPrice;
      return updated;
    }));
  }

  async function handleFinalize() {
    if (!customerName.trim()) { setError('Customer name is required'); return; }
    if (items.length === 0) { setError('Add at least one item'); return; }
    setError('');

    if (isOnline && localStorage.getItem('billflow_token')) {
      try {
        const bill = await createBillOnServer({
          customerName: sanitizeInput(customerName), customerPhone, paymentMethod,
          taxRate, discountRate, items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          finalized: true,
        });
        navigate(`/bill/${bill.id}`);
        return;
      } catch (err) { console.error('API create failed, using local:', err); }
    }

    const bill: Bill = {
      id: generateId(), billNumber: generateBillNumber(), date: getCurrentDate(), time: getCurrentTime(),
      storeName: user?.storeName || '', storeAddress: user?.storeAddress || '',
      customerName: sanitizeInput(customerName), customerPhone, items, subtotal, taxRate, taxAmount,
      discountRate, discountAmount, grandTotal, paymentMethod, finalized: true,
      createdBy: user?.id || '', createdAt: new Date().toISOString(),
    };
    addBill(bill);
    navigate(`/bill/${bill.id}`);
  }

  async function handleSaveDraft() {
    if (items.length === 0) { setError('Add at least one item'); return; }

    if (isOnline && localStorage.getItem('billflow_token')) {
      try {
        const bill = await createBillOnServer({
          customerName: sanitizeInput(customerName) || 'Walk-in Customer', customerPhone, paymentMethod,
          taxRate, discountRate, items: items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          finalized: false,
        });
        navigate(`/bill/${bill.id}`);
        return;
      } catch (err) { console.error('API create failed, using local:', err); }
    }

    const bill: Bill = {
      id: generateId(), billNumber: generateBillNumber(), date: getCurrentDate(), time: getCurrentTime(),
      storeName: user?.storeName || '', storeAddress: user?.storeAddress || '',
      customerName: sanitizeInput(customerName) || 'Walk-in Customer', customerPhone, items, subtotal,
      taxRate, taxAmount, discountRate, discountAmount, grandTotal, paymentMethod, finalized: false,
      createdBy: user?.id || '', createdAt: new Date().toISOString(),
    };
    addBill(bill);
    navigate(`/bill/${bill.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Bill</h1>
          <p className="text-gray-500 text-sm mt-1">Add items and finalize the bill</p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-slide-down">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name *</label>
                <input className="input-field" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input className="input-field" placeholder="9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Add Item */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Item</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input className="input-field flex-1" placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              <input type="number" className="input-field w-full sm:w-24" placeholder="Qty" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: +e.target.value })} />
              <input type="number" className="input-field w-full sm:w-32" placeholder="Price" min={0} value={newItem.unitPrice || ''} onChange={(e) => setNewItem({ ...newItem, unitPrice: +e.target.value })} />
              <button onClick={addItem} className="btn-primary whitespace-nowrap">+ Add</button>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="card overflow-x-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items ({items.length})</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Item</th>
                    <th className="text-center py-3 px-2 text-gray-500 font-medium">Qty</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Price</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Total</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 px-2 text-center">
                        <input type="number" className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-center text-sm" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', +e.target.value)} />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <input type="number" className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-right text-sm" min={0} value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', +e.target.value)} />
                      </td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      <td className="py-3 px-2 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="space-y-6">
          <div className="card sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill Summary</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as Bill['paymentMethod'])}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax %</label>
                  <input type="number" className="input-field" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount %</label>
                  <input type="number" className="input-field" min={0} max={100} value={discountRate} onChange={(e) => setDiscountRate(+e.target.value)} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discountRate > 0 && <div className="flex justify-between text-green-600"><span>Discount ({discountRate}%)</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>Tax ({taxRate}%)</span><span>+{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></div>
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={handleFinalize} className="btn-success w-full py-3">✓ Finalize Bill</button>
              <button onClick={handleSaveDraft} className="btn-secondary w-full py-3">💾 Save as Draft</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
