import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sanitizeInput } from '../utils/helpers';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    storeName: user?.storeName || '',
    storeAddress: user?.storeAddress || '',
    phone: user?.phone || '',
  });
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile({
      name: sanitizeInput(form.name),
      storeName: sanitizeInput(form.storeName),
      storeAddress: sanitizeInput(form.storeAddress),
      phone: form.phone,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 mt-1 capitalize">{user?.role}</span>
          </div>
        </div>

        {saved && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm animate-slide-down">Profile updated successfully!</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name</label>
            <input className="input-field" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Address</label>
            <input className="input-field" value={form.storeAddress} onChange={(e) => setForm({ ...form, storeAddress: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
