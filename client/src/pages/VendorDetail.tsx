import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { vendorsAPI, ordersAPI } from '../utils/api';
import { Vendor, PurchaseOrder } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function VendorDetail() {
  const { id } = useParams();
  const vendorId = Number(id);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, month]);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await vendorsAPI.getById(vendorId);
      setVendor(res.data?.vendor || null);
    } catch {
      setError('Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await ordersAPI.getAll({
        page,
        limit,
        vendor_id: vendorId,
        month: month || undefined
      });

      setOrders(res.data?.orders || []);
    } catch {
      setError('Failed to load orders');
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (loading) return <Loading />;

  if (!vendor) {
    return <div className="text-center py-10 text-gray-500">Vendor not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Vendor Info */}
      <div>
        <h1 className="text-2xl font-bold">🏭 {vendor.name}</h1>
        <p className="text-gray-600">Vendor details</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* VENDOR INFO CARD */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Vendor Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium">{vendor.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p>
              {vendor.is_active ? (
                <span className="text-green-600 font-medium">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Contact</p>
            <p>{vendor.contact_info || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p>{new Date(vendor.created_at).toLocaleDateString()}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500">Address</p>
            <p>{vendor.address || '-'}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3 items-center">
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value ? Number(e.target.value) : '');
            setPage(1);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {new Date(0, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {/* Order Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Order History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      {order.items.map(i => (
                        <div key={i.product_id}>
                          <span className="font-medium text-gray-900">
                            {i.product?.name} × {i.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(order.ordered_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(order.received_date)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'received'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'ordered'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
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
              disabled={orders.length < limit}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No orders found
          </div>
        )}
      </div>
    </div>
  );
}