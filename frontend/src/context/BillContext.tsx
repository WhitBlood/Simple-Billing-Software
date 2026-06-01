import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Bill } from '../types';
import { getItem, setItem } from '../utils/storage';
import { billsApi, CreateBillPayload } from '../services/api';

interface BillContextType {
  bills: Bill[];
  addBill: (bill: Bill) => void;
  createBillOnServer: (data: CreateBillPayload) => Promise<Bill>;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  finalizeBill: (id: string) => Promise<void>;
  getBill: (id: string) => Bill | undefined;
  loadBills: () => Promise<void>;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

function isOnline(): boolean {
  return !!localStorage.getItem('billflow_token');
}

export function BillProvider({ children }: { children: ReactNode }) {
  const [bills, setBills] = useState<Bill[]>(() => getItem<Bill[]>('bills') || []);

  useEffect(() => {
    setItem('bills', bills);
  }, [bills]);

  const loadBills = useCallback(async () => {
    if (!isOnline()) return;
    try {
      const apiBills = await billsApi.getAll();
      setBills(apiBills.map((b) => ({ ...b, paymentMethod: b.paymentMethod as Bill['paymentMethod'] })));
    } catch (err) {
      console.error('Failed to load bills from server:', err);
    }
  }, []);

  // Load from server on mount if online
  useEffect(() => {
    if (isOnline()) loadBills();
  }, [loadBills]);

  function addBill(bill: Bill) {
    setBills((prev) => [bill, ...prev]);
  }

  async function createBillOnServer(data: CreateBillPayload): Promise<Bill> {
    if (isOnline()) {
      const res = await billsApi.create(data);
      const bill: Bill = { ...res, paymentMethod: res.paymentMethod as Bill['paymentMethod'] };
      setBills((prev) => [bill, ...prev]);
      return bill;
    }
    throw new Error('Backend not available');
  }

  function updateBill(id: string, data: Partial<Bill>) {
    setBills((prev) => prev.map((b) => (b.id === id && !b.finalized ? { ...b, ...data } : b)));
  }

  async function finalizeBill(id: string) {
    if (isOnline()) {
      try { await billsApi.finalize(id); } catch (err) { console.error('Finalize API error:', err); }
    }
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, finalized: true } : b)));
  }

  function getBill(id: string) {
    return bills.find((b) => b.id === id);
  }

  return (
    <BillContext.Provider value={{ bills, addBill, createBillOnServer, updateBill, finalizeBill, getBill, loadBills }}>
      {children}
    </BillContext.Provider>
  );
}

export function useBills() {
  const ctx = useContext(BillContext);
  if (!ctx) throw new Error('useBills must be used within BillProvider');
  return ctx;
}
