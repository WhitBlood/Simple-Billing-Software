import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { getItem, setItem, removeItem } from '../utils/storage';
import { generateId } from '../utils/helpers';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password: string; storeName: string; storeAddress: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getItem<User>('current_user'));
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000/api') + '/health');
        if (r.ok) setIsOnline(true);
      } catch { setIsOnline(false); }
    })();
  }, []);

  useEffect(() => {
    if (user) setItem('current_user', user);
    else removeItem('current_user');
  }, [user]);

  async function login(email: string, password: string) {
    if (isOnline) {
      try {
        const res = await authApi.login(email, password);
        localStorage.setItem('billflow_token', res.token);
        setUser({
          id: res.user.id, name: res.user.name, email: res.user.email,
          storeName: res.user.storeName, storeAddress: res.user.storeAddress,
          phone: res.user.phone, role: res.user.role as 'admin' | 'cashier',
          createdAt: res.user.createdAt,
        });
        return { success: true };
      } catch (err) { return { success: false, error: (err as Error).message }; }
    }
    const users = getItem<Array<User & { password: string }>>('users') || [];
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return { success: false, error: 'Invalid email or password' };
    const { password: _, ...userData } = found;
    setUser(userData);
    return { success: true };
  }

  async function register(data: { name: string; email: string; password: string; storeName: string; storeAddress: string; phone: string }) {
    if (isOnline) {
      try { await authApi.register(data); return { success: true }; }
      catch (err) { return { success: false, error: (err as Error).message }; }
    }
    const users = getItem<Array<User & { password: string }>>('users') || [];
    if (users.find((u) => u.email === data.email)) return { success: false, error: 'Email already registered' };
    const newUser: User & { password: string } = {
      id: generateId(), name: data.name, email: data.email, password: data.password,
      storeName: data.storeName, storeAddress: data.storeAddress, phone: data.phone,
      role: 'admin', createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setItem('users', users);
    return { success: true };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('billflow_token');
  }

  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...data };
    if (isOnline && localStorage.getItem('billflow_token')) {
      try { await authApi.updateProfile({ name: updated.name, storeName: updated.storeName, storeAddress: updated.storeAddress, phone: updated.phone }); }
      catch (err) { console.error('Profile API error:', err); }
    }
    setUser(updated);
    const users = getItem<Array<User & { password: string }>>('users') || [];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) { users[idx] = { ...users[idx], ...data }; setItem('users', users); }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
