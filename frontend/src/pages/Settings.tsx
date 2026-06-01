import { useState } from 'react';

export default function Settings() {
  const [taxRate, setTaxRate] = useState(() => {
    const saved = localStorage.getItem('billflow_default_tax');
    return saved ? +saved : 18;
  });
  const [currency, setCurrency] = useState('INR');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem('billflow_default_tax', String(taxRate));
    localStorage.setItem('billflow_currency', currency);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleClearData() {
    if (window.confirm('Are you sure? This will delete all bills and account data.')) {
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your billing preferences</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Defaults</h2>
        {saved && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm animate-slide-down">Settings saved!</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Tax Rate (%)</label>
            <input type="number" className="input-field max-w-xs" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
            <select className="input-field max-w-xs" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <button onClick={handleSave} className="btn-primary">Save Settings</button>
        </div>
      </div>

      <div className="card border border-red-100">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently delete all data including bills, account information, and settings.</p>
        <button onClick={handleClearData} className="btn-danger">🗑️ Clear All Data</button>
      </div>
    </div>
  );
}
