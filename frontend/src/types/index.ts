export interface User {
  id: string;
  name: string;
  email: string;
  storeName: string;
  storeAddress: string;
  phone: string;
  role: 'admin' | 'cashier';
  createdAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  time: string;
  storeName: string;
  storeAddress: string;
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'online';
  finalized: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}
