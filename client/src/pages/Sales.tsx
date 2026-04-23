import { useState, useEffect } from 'react';
import { salesAPI, customersAPI, inventoryAPI, paymentsAPI } from '../utils/api';
import { Sale, Customer, InventoryItem, SaleCreate, Season } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';

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
  const token = localStorage.getItem('token');
  const [invoiceSaleId, setInvoiceSaleId] = useState<number | ''>('');
  const [paymentSaleId, setPaymentSaleId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [price, setPrice] = useState<string>(''); // string empty is allowed
  const [ref, setRef] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<SaleStatus>('all');
  const [search, setSearch] = useState('');

  // Form state
  const [cart, setCart] = useState<{
    product_id: number;
    name: string;
    unit_price: number | null;
    quantity: number;
  }[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, [statusFilter, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const salesParams: any = { limit, page };

      if (statusFilter !== 'all') {
        salesParams.status = statusFilter;
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

  const navigate = useNavigate();

  const MAX_ITEMS = 11;

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    if (cart.length >= MAX_ITEMS) {
      setError(`Maximum ${MAX_ITEMS} products allowed per sale (invoice limit)`);
      return;
    }

    const product = availableProducts.find(
      p => p.product_id === selectedProductId
    );

    if (!product) return;

    setCart(prev => {
      const existing = prev.find(i => i.product_id === selectedProductId);

      if (!existing && prev.length >= MAX_ITEMS) {
        setError(`Maximum ${MAX_ITEMS} products allowed per sale`);
        return prev;
      }

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
          unit_price: price === '' ? null : parseFloat(price),
          quantity
        }
      ];
    });

    setPrice('');
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
        ref: ref || undefined,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price // optional field
        }))
      });

      setSuccess('Sale recorded successfully!');
      setCart([]);
      setSelectedCustomer(0);
      setSaleDate('');
      setRef('');
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
  
  const handleDownloadInvoice = () => {
    if (!invoiceSaleId) {
      setError('Please enter a Sale ID');
      return;
    }

    window.open(
      `${API_BASE_URL}/invoice/${invoiceSaleId}?token=${token}`,
      '_blank'
    );
  };

  const getFilteredSales = (): Sale[] => {
    let filtered = [...sales];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
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

    const toDateOnly = (date: string | Date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    if (startDate) {
      const start = toDateOnly(startDate);

      filtered = filtered.filter(s => {
        const sale = toDateOnly(s.sale_date);
        return sale >= start;
      });
    }

    if (endDate) {
      const end = toDateOnly(endDate);

      filtered = filtered.filter(s => {
        const sale = toDateOnly(s.sale_date);
        return sale <= end;
      });
    }

    return filtered;
  };

  const availableProducts = inventory.filter(item => item.quantity > 0);

  const openPaymentModal = async (saleId: number) => {
    try {
      setPaymentSaleId(saleId);
      setPaymentLoading(true);
      setPaymentError(null);

      const res = await paymentsAPI.getBySale(saleId);
      setPaymentHistory(res.data?.data?.payments || []);
    } catch (err) {
      setError('Failed to load payment history');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentSaleId || paymentAmount <= 0) {
      setError('Invalid payment');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError(null);

      const sale = sales.find(s => s.id === paymentSaleId);

      if (sale) {
        const subtotal = sale.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0
        );

        const total = subtotal - (sale.credit_memo || 0);

        if ((sale.total_paid || 0) + paymentAmount > total) {
          setError('Payment exceeds total sale price');
          return;
        }
      }

      await paymentsAPI.create({
        sale_id: paymentSaleId,
        amount: paymentAmount,
        payment_date: paymentDate || undefined
      });

      setSuccess('Payment recorded');

      // Refresh sales + payment history
      await loadData();
      const res = await paymentsAPI.getBySale(paymentSaleId);
      setPaymentHistory(res.data?.data?.payments || []);

      setPaymentAmount(0);
      setPaymentDate('');

    } catch (err: any) {
      setPaymentError(err.response?.data?.error || 'Failed to add payment');
    } finally {
      setPaymentLoading(false);
    }
  };

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">💰 Generate Invoice</h1>
          <p className="text-gray-600">
            Log sales to track inventory and customer purchases
          </p>
        </div>

        <button
          onClick={() => navigate('/sales/add')}
          className="bg-primary text-white px-4 py-2 rounded-lg"
        >
          + Create Sale
        </button>
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
          
          <label className="block text-sm font-medium text-gray-700 mb-2">Add Product * (Max 11) ({cart.length}/11 items added)</label>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            <input
              type="number"
              placeholder="Custom price (optional)"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={cart.length >= 11}
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
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product_id}>
                      <td className="px-4 py-2">{item.name}</td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.unit_price ?? ''}
                          placeholder="default"
                          onChange={(e) => {
                            const value = e.target.value;
                            setCart(prev =>
                              prev.map(i =>
                                i.product_id === item.product_id
                                  ? { ...i, unit_price: value === '' ? null : parseFloat(value) }
                                  : i
                              )
                            );
                          }}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ref</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. PO-123, WhatsApp order, etc."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary disabled:opacity-50"
          >
            {submitting ? 'Recording Invoice...' : 'Record Invoice'}
          </button>
        </form>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Invoice History</h2>
        </div>
        {/* Stats */}
        <div className="p-6 border-b space-y-8">
          {/* ================= STATUS SECTION ================= */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Invoice Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className={`cursor-pointer rounded-lg p-4 shadow border ${
                  statusFilter === 'all' ? 'ring-2 ring-primary' : ''
                }`}
              >
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div
                onClick={() => { setStatusFilter('pending'); setPage(1); }}
                className={`cursor-pointer bg-yellow-50 rounded-lg p-4 shadow border ${
                  statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div
                onClick={() => { setStatusFilter('completed'); setPage(1); }}
                className={`cursor-pointer bg-green-50 rounded-lg p-4 shadow border ${
                  statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <p className="text-sm text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div
                onClick={() => { setStatusFilter('cancelled'); setPage(1); }}
                className={`cursor-pointer bg-red-50 rounded-lg p-4 shadow border ${
                  statusFilter === 'cancelled' ? 'ring-2 ring-red-500' : ''
                }`}
              >
                <p className="text-sm text-red-700">Canceled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
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
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
          </div>

          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Clear Dates
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
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total / Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((sale) => {
                  const subtotal = sale.items.reduce(
                    (sum, item) => sum + item.quantity * item.unit_price,
                    0
                  );

                  const total = subtotal - (sale.credit_memo || 0);

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                      >
                      #{sale.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer" 
                      onClick={() => openPaymentModal(sale.id)}
                    >
                      ${total.toFixed(2)} / ${sale.total_paid?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sale.customer?.name || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{sale.customer?.type || ''}</div>
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
                      <div className="grid grid-cols-3 min-w-[340px] items-center text-xs">

                        {/* COLUMN 1 */}
                        <div className="flex items-center h-8 pr-2">
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
                        <div className="flex items-center h-8 px-2">
                          {(sale.status === 'pending' || sale.status === 'completed') && (
                            <button
                              onClick={() => {
                                window.open(
                                  `${API_BASE_URL}/invoice/${sale.id}?token=${token}`,
                                  '_blank'
                                );
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded whitespace-nowrap"
                            >
                              Download Invoice
                            </button>
                          )}
                        </div>

                        {/* COLUMN 3 */}
                        <div className="flex items-center h-8 pl-2">
                          {sale.status === 'pending' && (
                            <button
                              onClick={() => setCancelSaleId(sale.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          )}
                        </div>

                      </div>
                    </td>
                  </tr>
                )})}
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
      {paymentSaleId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            
            <h2 className="text-lg font-semibold mb-4">
              Payments for Sale #{paymentSaleId}
            </h2>

            {paymentError && (
              <Alert type="error">{paymentError}</Alert>
            )}

            {/* Payment History */}
            <div className="max-h-40 overflow-y-auto border rounded mb-4">
              {paymentLoading ? (
                <p className="p-3 text-sm">Loading...</p>
              ) : paymentHistory.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No payments yet</p>
              ) : (
                paymentHistory.map((p, i) => (
                  <div key={i} className="p-2 text-sm border-b">
                    ${p.amount} — {new Date(p.paymentDate).toLocaleString()}
                  </div>
                ))
              )}
            </div>

            {/* Add Payment */}
            <div className="flex flex-col gap-3">
              <input
                type="number"
                placeholder="Amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="border px-3 py-2 rounded"
              />

              <input
                type="datetime-local"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="border px-3 py-2 rounded"
              />

              <button
                onClick={handleAddPayment}
                className="bg-green-600 text-white py-2 rounded"
              >
                Add Payment
              </button>
            </div>

            <button
              onClick={() => {setPaymentSaleId(null); setPaymentError(null);}}
              className="mt-4 text-sm text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

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