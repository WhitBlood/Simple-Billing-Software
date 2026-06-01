import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sanitizeInput, validateEmail } from '../utils/helpers';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const registeredSuccess = (location.state as { registered?: boolean })?.registered;
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const email = sanitizeInput(form.email);
    if (!validateEmail(email)) { setError('Invalid email address'); return; }
    if (!form.password) { setError('Password is required'); return; }
    setLoading(true);
    try {
      const result = await login(email, form.password);
      if (result.success) navigate('/dashboard');
      else setError(result.error || 'Login failed');
    } catch { setError('Login failed'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 items-center justify-center p-12">
        <div className="max-w-md text-white animate-fade-in">
          <h1 className="text-5xl font-extrabold mb-6">BillFlow</h1>
          <p className="text-xl text-primary-100 leading-relaxed">
            Streamline your billing process with our modern, intuitive management platform. Create, track, and share invoices effortlessly.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-3xl font-bold">500+</p>
              <p className="text-primary-200 text-sm">Bills Created</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-3xl font-bold">99%</p>
              <p className="text-primary-200 text-sm">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gray-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-2">Sign in to your BillFlow account</p>
          </div>

          {registeredSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm animate-slide-down">
              🎉 Account created successfully! Please sign in with your credentials.
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="rounded border-gray-300" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
