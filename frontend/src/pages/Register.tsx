import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sanitizeInput, validateEmail, validatePassword, validatePhone } from '../utils/helpers';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', storeName: '', storeAddress: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const name = sanitizeInput(form.name);
    const email = sanitizeInput(form.email);
    if (!name) { setError('Name is required'); return; }
    if (!validateEmail(email)) { setError('Invalid email address'); return; }
    const pwErr = validatePassword(form.password);
    if (pwErr) { setError(pwErr); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.storeName.trim()) { setError('Store name is required'); return; }
    if (!validatePhone(form.phone)) { setError('Invalid phone number (10 digits)'); return; }

    setLoading(true);
    try {
      const result = await register({ name, email, password: form.password, storeName: sanitizeInput(form.storeName), storeAddress: sanitizeInput(form.storeAddress), phone: form.phone });
      if (result.success) navigate('/login', { state: { registered: true } });
      else setError(result.error || 'Registration failed');
    } catch { setError('Registration failed'); }
    setLoading(false);
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} className="input-field" placeholder={placeholder} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-primary-50">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="card p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">BillFlow</h1>
            <p className="text-gray-500 mt-2">Create your free account</p>
          </div>

          {error && <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('Full Name', 'name', 'text', 'John Doe')}
              {field('Email', 'email', 'email', 'you@example.com')}
              {field('Password', 'password', 'password', '••••••••')}
              {field('Confirm Password', 'confirmPassword', 'password', '••••••••')}
              {field('Store Name', 'storeName', 'text', 'My Store')}
              {field('Phone', 'phone', 'tel', '9876543210')}
            </div>
            {field('Store Address', 'storeAddress', 'text', '123 Main St, City')}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-6 disabled:opacity-60">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="font-semibold text-primary-600">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
