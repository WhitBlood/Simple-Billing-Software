import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBills } from '../context/BillContext';
import { formatCurrency } from '../utils/helpers';

export default function Dashboard() {
  const { user } = useAuth();
  const { bills } = useBills();

  const totalRevenue = bills.filter((b) => b.finalized).reduce((s, b) => s + b.grandTotal, 0);
  const totalBills = bills.length;
  const finalizedBills = bills.filter((b) => b.finalized).length;
  const recentBills = bills.slice(0, 5);

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: '💰', color: 'from-green-400 to-green-600', link: '/bill-history?filter=finalized' },
    { label: 'Total Bills', value: totalBills, icon: '📄', color: 'from-blue-400 to-blue-600', link: '/bill-history?filter=all' },
    { label: 'Finalized', value: finalizedBills, icon: '✅', color: 'from-purple-400 to-purple-600', link: '/bill-history?filter=finalized' },
    { label: 'Pending', value: totalBills - finalizedBills, icon: '⏳', color: 'from-orange-400 to-orange-600', link: '/bill-history?filter=pending' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your billing today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Link to={stat.link} key={stat.label} className="card hover:shadow-elevated group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/create-bill" className="btn-primary">➕ Create New Bill</Link>
          <Link to="/bill-history" className="btn-secondary">📋 View History</Link>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bills</h2>
          <Link to="/bill-history" className="text-sm font-medium text-primary-600 hover:text-primary-700">View all →</Link>
        </div>
        {recentBills.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No bills yet. Create your first bill!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Bill #</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Customer</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <Link to={`/bill/${bill.id}`} className="font-medium text-primary-600 hover:underline">{bill.billNumber}</Link>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{bill.customerName}</td>
                    <td className="py-3 px-2 text-gray-500">{bill.date}</td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900">{formatCurrency(bill.grandTotal)}</td>
                    <td className="py-3 px-2 text-center">
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
    </div>
  );
}
