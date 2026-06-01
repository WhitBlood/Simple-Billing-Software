import { Link, useSearchParams } from 'react-router-dom';
import { useBills } from '../context/BillContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useState } from 'react';

type FilterType = 'all' | 'finalized' | 'pending';

export default function BillHistory() {
  const { bills } = useBills();
  const [searchParams] = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [search, setSearch] = useState('');

  const filtered = bills.filter((b) => {
    if (filter === 'finalized' && !b.finalized) return false;
    if (filter === 'pending' && b.finalized) return false;
    if (search && !b.billNumber.toLowerCase().includes(search.toLowerCase()) && !b.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill History</h1>
          <p className="text-gray-500 text-sm mt-1">{bills.length} total bills</p>
        </div>
        <Link to="/create-bill" className="btn-primary">➕ New Bill</Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <input className="input-field flex-1" placeholder="Search by bill # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex gap-2">
            {(['all', 'finalized', 'pending'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No bills found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Bill #</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium">Customer</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium hidden md:table-cell">Date</th>
                <th className="text-left py-3 px-3 text-gray-500 font-medium hidden md:table-cell">Payment</th>
                <th className="text-right py-3 px-3 text-gray-500 font-medium">Amount</th>
                <th className="text-center py-3 px-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill) => (
                <tr key={bill.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-3"><Link to={`/bill/${bill.id}`} className="font-medium text-primary-600 hover:underline">{bill.billNumber}</Link></td>
                  <td className="py-3 px-3 text-gray-700">{bill.customerName}</td>
                  <td className="py-3 px-3 text-gray-500 hidden md:table-cell">{formatDate(bill.date)}</td>
                  <td className="py-3 px-3 text-gray-500 hidden md:table-cell capitalize">{bill.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrency(bill.grandTotal)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${bill.finalized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {bill.finalized ? 'Finalized' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
