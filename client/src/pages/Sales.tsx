import { useState, useEffect } from 'react';
import { salesAPI, customersAPI, inventoryAPI } from '../utils/api';
import { Sale, Customer, InventoryItem, SaleCreate, Season } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';
import ConfirmModal from '../components/ConfirmModal';

type SaleStatus = 'all' | 'pending' | 'completed' | 'cancelled';

export default function Sales() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://leckersland-inventory.onrender.com/api';

  // Filter state
  const [statusFilter, setStatusFilter] = useState<SaleStatus>('all');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [search, setSearch] = useState('');

  // Form state
  const [cart, setCart] = useState<{
    product_id: number;
    name: string;
    unit_price: number;
    quantity: number;
  }[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, [statusFilter, seasonFilter, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const salesParams: any = { limit, page };

      if (statusFilter !== 'all') {
        salesParams.status = statusFilter;
      }

      if (seasonFilter !== 'all') {
        salesParams.season = seasonFilter;
      }

      const [customersRes, inventoryRes, filteredSalesRes, allSalesRes] =
        await Promise.all([
          customersAPI.getAll(),
          inventoryAPI.getAll(),
          salesAPI.getAll(salesParams),
          salesAPI.getAll({ limit: 100 }) // no filters
        ]);

      setCustomers(customersRes.data?.customers || []);
      setInventory(inventoryRes.data?.inventory || []);
      setSales(filteredSalesRes.data?.sales || []);
      setAllSales(allSalesRes.data?.sales || []);

      setError(null);

    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    const product = availableProducts.find(
      p => p.product_id === selectedProductId
    );

    if (!product) return;

    setCart(prev => {
      const existing = prev.find(i => i.product_id === selectedProductId);

      if (existing) {
        return prev.map(i =>
          i.product_id === selectedProductId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }

      return [
        ...prev,
        {
          product_id: selectedProductId,
          name: product.product_name,
          unit_price: (product as any).sell_price || 0, // we'll improve later
          quantity
        }
      ];
    });

    setSelectedProductId(0);
    setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer || cart.length === 0) {
      setError('Customer and at least one product required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await salesAPI.create({
        customer_id: selectedCustomer,
        sale_date: saleDate || undefined,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });

      setSuccess('Sale recorded successfully!');
      setCart([]);
      setSelectedCustomer(0);
      setSaleDate('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (saleId: number, status: 'pending' | 'completed' | 'cancelled') => {
    try {
      await salesAPI.updateStatus(saleId, status);
      setSuccess(`Sale marked as ${status}!`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update sale status');
    }
  };

  const getFilteredSales = (): Sale[] => {
    let filtered = [...sales];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (seasonFilter !== 'all') {
      filtered = filtered.filter(s => s.season === seasonFilter);
    }

    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(sale => {
        const customerName = sale.customer?.name?.toLowerCase() || '';
        const productName = sale.items
          ?.map(item => item.product?.name?.toLowerCase() || '')
          .join(' ') || ''
        return (
          customerName.includes(searchTerm) ||
          productName.includes(searchTerm)
        );
      });
    }

    return filtered;
  };

  const availableProducts = inventory.filter(item => item.quantity > 0);

  // Calculate stats
  const stats = {
    total: allSales.length,
    pending: allSales.filter(s => s.status === 'pending').length,
    completed: allSales.filter(s => s.status === 'completed').length,
    cancelled: allSales.filter(s => s.status === 'cancelled').length,
    spring: allSales.filter(s => s.season === 'spring').length,
    summer: allSales.filter(s => s.season === 'summer').length,
    fall: allSales.filter(s => s.season === 'fall').length,
    winter: allSales.filter(s => s.season === 'winter').length,
  };

  const filteredSales = getFilteredSales();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">💰 Record Sale</h1>
        <p className="text-gray-600">Log sales to track inventory and customer purchases</p>
      </div>

      {/* Record Sale Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              required
            >
              <option value={0}>Select a customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.type})
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              <option value={0}>Select product</option>
              {availableProducts.map(item => (
                <option key={item.product_id} value={item.product_id}>
                  {item.product_name} ({item.quantity} available)
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="px-4 py-2 border rounded-lg"
            />

            <button
              type="button"
              onClick={handleAddToCart}
              className="bg-primary text-white rounded-lg"
            >
              Add
            </button>
          </div>

          {cart.length > 0 && (
            <div className="mt-4 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">Qty</th>
                    <th className="px-4 py-2 text-left">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product_id}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCart(prev =>
                              prev.filter(i => i.product_id !== item.product_id)
                            )
                          }
                          className="text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date (Optional)</label>
            <input
              type="datetime-local"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to record sale at current time</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary disabled:opacity-50"
          >
            {submitting ? 'Recording Sale...' : 'Record Sale'}
          </button>
        </form>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Sales History</h2>
        </div>
        {/* Stats */}
        <div className="p-6 border-b space-y-8">
          {/* ================= STATUS SECTION ================= */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Sales Status
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 shadow">
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 shadow">
                <p className="text-sm text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 shadow">
                <p className="text-sm text-red-700">Canceled</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.cancelled}
                </p>
              </div>
            </div>
          </div>
          {/* ================= SEASON SECTION ================= */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Season Breakdown
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-emerald-100 rounded-lg p-4 shadow">
                <p className="text-sm text-emerald-700">Spring</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.spring}
                </p>
              </div>
              <div className="bg-blue-100 rounded-lg p-4 shadow">
                <p className="text-sm text-blue-700">Summer</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.summer}
                </p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 shadow">
                <p className="text-sm text-orange-700">Fall</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.fall}
                </p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 shadow">
                <p className="text-sm text-purple-700">Winter</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.winter}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by customer or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 self-center">Status:</span>
            <button
              type="button"
              onClick={() => {setStatusFilter('all'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                statusFilter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => {setStatusFilter('pending'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-600'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => {setStatusFilter('completed'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                statusFilter === 'completed' ? 'bg-green-600 text-white' : 'bg-white text-green-600'
              }`}
            >
              Completed ({stats.completed})
            </button>
            <button
              type="button"
              onClick={() => {setStatusFilter('cancelled'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                statusFilter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-red-600'
              }`}
            >
              Canceled ({stats.cancelled})
            </button>
          </div>

          {/* Season Filter */}
          <div className="flex gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 self-center">Season:</span>
            <button
              type="button"
              onClick={() => {setSeasonFilter('all'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                seasonFilter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {setSeasonFilter('spring'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                seasonFilter === 'spring' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600'
              }`}
            >
              Spring
            </button>
            <button
              type="button"
              onClick={() => {setSeasonFilter('summer'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                seasonFilter === 'summer' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'
              }`}
            >
              Summer
            </button>
            <button
              type="button"
              onClick={() => {setSeasonFilter('fall'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                seasonFilter === 'fall' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600'
              }`}
            >
              Fall
            </button>
            <button
              type="button"
              onClick={() => {setSeasonFilter('winter'); setPage(1)}}
              className={`px-4 py-2 rounded-lg font-medium ${
                seasonFilter === 'winter' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'
              }`}
            >
              Winter
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
              <Loading />
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Season</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.items.map(item => (
                        <div key={item.product_id}>
                          {item.product?.name} × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      $
                      {sale.items
                        .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
                        .toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sale.customer?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{sale.customer?.type || ''}</div>
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="grid grid-cols-3 gap-2 min-w-[320px] items-center text-xs">

                        {/* COLUMN 1 */}
                        <div>
                          {sale.status === 'completed' && (
                            <span className="text-green-500 italic">Sale Completed</span>
                          )}
                          {sale.status === 'cancelled' && (
                            <span className="text-red-500 italic">Sale Cancelled</span>
                          )}
                          {sale.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(sale.id, 'completed')}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Mark as Completed
                            </button>
                          )}
                        </div>

                        {/* COLUMN 2 */}
                        <div>
                          {(sale.status === 'pending' || sale.status === 'completed') && (
                            <button
                              onClick={() => {
                                window.open(
                                  `${API_BASE_URL}/sales/${sale.id}`,
                                  '_blank'
                                );
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              Download Invoice
                            </button>
                          )}
                        </div>

                        {/* COLUMN 3 */}
                        <div>
                          {sale.status === 'pending' && (
                            <button
                              onClick={() => setCancelSaleId(sale.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sales match the current filters
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={cancelSaleId !== null}
        title="Cancel Sale"
        message="Are you sure you want to cancel this sale? This action cannot be undone."
        loading={cancelLoading}
        onCancel={() => setCancelSaleId(null)}
        onConfirm={async () => {
          if (!cancelSaleId) return;
          try {
            setCancelLoading(true);
            await handleUpdateStatus(cancelSaleId, 'cancelled');
            setCancelSaleId(null);
          } finally {
            setCancelLoading(false);
          }
        }}
      />
    </div>
  );
}