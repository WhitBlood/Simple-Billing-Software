import { useState } from 'react';
import { Link } from 'react-router-dom';
import { validateEmail } from '../utils/helpers';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEmail(email)) { setError('Invalid email address'); return; }
    setError('');
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-primary-50">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🔑</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-500 mb-6 text-sm">Enter your email and we'll send you a reset link</p>

          {sent ? (
            <div className="p-4 rounded-xl bg-accent-50 border border-accent-100 text-accent-700 text-sm">
              If an account exists with that email, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary w-full py-3">Send Reset Link</button>
            </form>
          )}

          <Link to="/login" className="inline-block mt-6 text-sm font-medium text-primary-600 hover:text-primary-700">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
