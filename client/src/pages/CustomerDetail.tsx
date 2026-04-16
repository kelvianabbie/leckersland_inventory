import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { customersAPI, salesAPI } from '../utils/api';
import { Customer, Sale } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState<number | 'all'>('all');
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [id, page, month]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [customerRes, salesRes] = await Promise.all([
        customersAPI.getById(Number(id)),
        salesAPI.getAll({
          customer_id: Number(id),
          limit,
          page,
          ...(month !== 'all' && { month })
        })
      ]);

      setCustomer(customerRes.data?.customer || null);
      setSales(salesRes.data?.sales || []);
      setError(null);
    } catch {
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!customer) return <div className="p-6">Customer not found</div>;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">👤 {customer.name}</h1>
        <p className="text-gray-600">Customer details</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* CUSTOMER INFO CARD */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium">{customer.name}</p>
          </div>

          <div>
            <p className="text-gray-500">Type</p>
            <p className="capitalize">{customer.type}</p>
          </div>

          <div>
            <p className="text-gray-500">Contact</p>
            <p>{customer.contact_info || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Status</p>
            <p>
              {customer.is_active ? (
                <span className="text-green-600 font-medium">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-gray-500">Address</p>
            <p>{customer.address || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Created</p>
            <p>{new Date(customer.created_at).toLocaleDateString()}</p>
          </div>

        </div>
      </div>

      {/* SALES */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Sales History</h2>
        </div>

        <div className="p-6">
          {/* Month Filter */}
          <div className="flex gap-4 mb-4">
            <select
              value={month}
              onChange={(e) => {
                const val = e.target.value;
                setMonth(val === 'all' ? 'all' : Number(val));
                setPage(1);
              }}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Months</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          {sales.length === 0 ? (
            <p className="text-gray-500 text-sm">No sales found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total / Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Season</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => {
                    const total = sale.items.reduce(
                      (sum, item) => sum + item.quantity * item.unit_price,
                      0
                    );

                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          #{sale.id}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.sale_date).toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sale.items.map((item) => (
                            <div key={item.product_id}>
                              {item.product?.name} × {item.quantity}
                            </div>
                          ))}
                        </td>

                        <td className="px-6 py-4 text-sm font-medium text-primary">
                          ${total.toFixed(2)} / ${sale.total_paid?.toFixed(2) || '0.00'}
                        </td>

                        {/* Season badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sale.season === 'spring' ? 'bg-emerald-100 text-emerald-800' :
                            sale.season === 'summer' ? 'bg-blue-100 text-blue-800' :
                            sale.season === 'fall' ? 'bg-orange-100 text-orange-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {sale.season.charAt(0).toUpperCase() + sale.season.slice(1)}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.completed_date
                            ? new Date(sale.completed_date).toLocaleString()
                            : <span className="text-gray-400 italic">Not completed yet</span>}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : sale.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-center gap-4 p-6">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Previous
                </button>

                <span className="px-4 py-2 font-medium">
                  Page {page}
                </span>

                <button
                  disabled={sales.length < limit}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}