// In production (behind ALB), use relative path '/api'
// In local dev, use full URL 'http://localhost:4000/api'
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('billflow_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;
  return res.json();
}

// ─── AUTH ─────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  storeName: string;
  storeAddress: string;
  phone: string;
  role: string;
  createdAt: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { name: string; email: string; password: string; storeName: string; storeAddress: string; phone: string }) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<ApiUser>('/auth/me'),

  updateProfile: (data: { name: string; storeName: string; storeAddress: string; phone: string }) =>
    request<{ message: string }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ─── BILLS ────────────────────────────────────────────────

export interface ApiBillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ApiBill {
  id: string;
  billNumber: string;
  date: string;
  time: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  customerPhone: string;
  items: ApiBillItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: string;
  finalized: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateBillPayload {
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  taxRate: number;
  discountRate: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  finalized: boolean;
}

export const billsApi = {
  getAll: () => request<ApiBill[]>('/bills'),

  getById: (id: string) => request<ApiBill>(`/bills/${id}`),

  create: (data: CreateBillPayload) =>
    request<ApiBill>('/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  finalize: (id: string) =>
    request<{ message: string }>(`/bills/${id}/finalize`, { method: 'PATCH' }),
};

// ─── HEALTH ───────────────────────────────────────────────

export const healthApi = {
  check: () => request<{ status: string; database: string }>('/health'),
};
