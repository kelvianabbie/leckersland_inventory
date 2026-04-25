import { useState, useEffect } from 'react';
import { ordersAPI, inventoryAPI, vendorsAPI, orderPaymentsAPI } from '../utils/api';
import { PurchaseOrder, InventoryItem, Vendor } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';
import { useNavigate } from 'react-router-dom';

type OrderStatus = 'all' | 'pending' | 'ordered' | 'received';

export default function Orders() {
  //bunch of useState
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, inventoryRes, allOrdersRes, vendorsRes] = await Promise.all([
      ordersAPI.getAll({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter
      }),
      inventoryAPI.getAll(),
      ordersAPI.getAll({ limit: 1000 }), // load all orders for stats
      vendorsAPI.getAll()
      ]);
      
      setOrders(ordersRes.data?.orders || []);
      setAllOrders(allOrdersRes.data?.orders || []);
      setInventory(inventoryRes.data?.inventory || []);
      setVendors(vendorsRes.data?.vendors || []);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  //function to update status of the ordered product
  const handleUpdateStatus = async (orderId: number, status: 'pending' | 'ordered' | 'received' | 'cancelled') => {
    try {
      await ordersAPI.updateStatus(orderId, status);
      setSuccess(`Order ${status === 'received' ? 'received' : 'updated'} successfully!`);
      await loadData();
    //  setTimeout(() => setSuccess(null), 3000); //auto-hide success message after 3 seconds
    } catch (err) {
      setError('Failed to update order status'); //error message
    }
  };

  //cancel order with confirmation
  const openCancelModal = (id: number) => {
    setOrderToCancel(id);
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setOrderToCancel(null);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      setActionLoading(orderToCancel);
      await ordersAPI.delete(orderToCancel);
      setOrders(prev => prev.filter(o => o.id !== orderToCancel));
      setSuccess("Order cancelled successfully");
    } catch {
      setError("Failed to cancel order");
    } finally {
      closeCancelModal();
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return null;

    return new Date(date).toLocaleString();
  };

  //filter orders based on status
  const stats = {
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === 'pending').length,
    ordered: allOrders.filter(o => o.status === 'ordered').length,
    received: allOrders.filter(o => o.status === 'received').length,
  };

  if (loading) return <Loading />;

  const getFilteredOrders = () => {
    let filtered = [...orders];

    if (vendorSearch.trim()) {
      const term = vendorSearch.toLowerCase();

      filtered = filtered.filter(order =>
        order.vendor?.name?.toLowerCase().includes(term)
      );
    }

    const toDateOnly = (date: string | Date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    if (startDate) {
      const start = toDateOnly(startDate);
      filtered = filtered.filter(o => {
        const created = toDateOnly(o.created_at);
        return created >= start;
      });
    }

    if (endDate) {
      const end = toDateOnly(endDate);
      filtered = filtered.filter(o => {
        const created = toDateOnly(o.created_at);
        return created <= end;
      });
    }

    return filtered;
  };

  const openPaymentModal = async (orderId: number) => {
    try {
      setPaymentOrderId(orderId);
      setPaymentLoading(true);
      setPaymentError(null);

      const res = await orderPaymentsAPI.getByOrder(orderId);
      setPaymentHistory(res.data?.data?.payments || []);
    } catch (err) {
      setPaymentError('Failed to load payment history');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentOrderId || paymentAmount <= 0) {
      setPaymentError('Invalid payment');
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentError(null);

      const order = orders.find(o => o.id === paymentOrderId);

      if (order) {
        const total = order.total_amount || 0;

        if ((order.total_paid || 0) + paymentAmount > total) {
          setPaymentError('Payment exceeds total order amount');
          return;
        }
      }

      await orderPaymentsAPI.create({
        purchase_order_id: paymentOrderId,
        amount: paymentAmount,
        payment_date: paymentDate || undefined,
        payment_method: paymentMethod || undefined
      });

      setSuccess('Payment recorded');

      // update orders locally
      setOrders(prev =>
        prev.map(o => {
          if (o.id === paymentOrderId) {
            return {
              ...o,
              total_paid: (o.total_paid || 0) + paymentAmount
            };
          }
          return o;
        })
      );

      // also update allOrders (for stats)
      setAllOrders(prev =>
        prev.map(o => {
          if (o.id === paymentOrderId) {
            return {
              ...o,
              total_paid: (o.total_paid || 0) + paymentAmount
            };
          }
          return o;
        })
      );

      const res = await orderPaymentsAPI.getByOrder(paymentOrderId);
      setPaymentHistory(res.data?.data?.payments || []);

      setPaymentAmount(0);
      setPaymentDate('');
      setPaymentMethod('');

    } catch (err: any) {
      setPaymentError(err.response?.data?.error || 'Failed to add payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">📋 Purchase Order</h1>
          <p className="text-gray-600">Manage orders to suppliers</p>
        </div>

        <button
          onClick={() => navigate('/orders/add')}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary"
        >
          + New Purchase Order
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/*order history table*/}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Purchase Order History</h2>
        </div>
        {/*status*/}
        <div className="p-6 border-b space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Purchase Order Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className={`cursor-pointer bg-white rounded-lg p-4 shadow border ${
                  statusFilter === 'all' ? 'ring-2 ring-primary' : ''
                }`}
              >
                <p className="text-sm text-gray-600">Total Purchase Orders</p>
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
                onClick={() => { setStatusFilter('ordered'); setPage(1); }}
                className={`cursor-pointer bg-blue-50 rounded-lg p-4 shadow border ${
                  statusFilter === 'ordered' ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <p className="text-sm text-blue-700">Ordered</p>
                <p className="text-2xl font-bold text-blue-600">{stats.ordered}</p>
              </div>
              <div
                onClick={() => { setStatusFilter('received'); setPage(1); }}
                className={`cursor-pointer bg-green-50 rounded-lg p-4 shadow border ${
                  statusFilter === 'received' ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <p className="text-sm text-green-700">Received</p>
                <p className="text-2xl font-bold text-green-600">{stats.received}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search by vendor..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
          </div>

          {/* Date Filters */}
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total / Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getFilteredOrders().map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    #{order.id}
                  </td>
                  {/*Created Date*/}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(order.created_at)}
                  </td>
                  {/*Product and Quantity*/}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.items.map(item => (
                      <div key={item.product_id}>
                        {item.product?.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td
                    className="px-6 py-4 text-sm font-medium text-primary cursor-pointer"
                    onClick={() => openPaymentModal(order.id)}
                  >
                    ${(order.total_amount || 0).toFixed(2)} / ${(order.total_paid || 0).toFixed(2)}
                  </td>
                  {/*Vendor*/}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.vendor?.name || '-'}
                  </td> 
                  {/*Ordered Date*/}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!order.ordered_date && (
                      <span className="text-gray-400 italic">Product hasn't been ordered yet</span>
                    )}
                    {order.ordered_date && (
                      <span className="text-gray-900">
                        {formatDate(order.ordered_date)}
                      </span>
                    )}
                  </td>
                  {/*Received Date*/}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {!order.ordered_date && (
                      <span className="text-gray-400 italic">Product hasn't been ordered yet</span>
                    )}
                    {order.ordered_date && !order.received_date && (
                      <span className="text-blue-500 italic">Product ordered but hasn't arrived yet</span>
                    )}
                    {order.received_date && (
                      <span className="text-gray-900">{formatDate(order.received_date)}</span>
                    )}
                  </td>
                  {/*Status*/}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.status === 'pending' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>
                    )}
                    {order.status === 'ordered' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Ordered</span>
                    )}
                    {order.status === 'received' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Received</span>
                    )}
                  </td>
                  {/*Actions*/}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      {/*Pending → show only Mark as Ordered*/}
                      {order.status === 'pending' && (
                        <>
                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'ordered')}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Mark as Ordered
                          </button>

                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => openCancelModal(order.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {/*Ordered → show only Mark as Received*/}
                      {order.status === 'ordered' && (
                        <>
                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => handleUpdateStatus(order.id, 'received')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Mark as Received
                          </button>

                          <button
                            disabled={actionLoading === order.id}
                            onClick={() => openCancelModal(order.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {/*Received → no status buttons, only cancel optional*/}
                      {order.status === 'received' && (
                        <span className="text-green-500 text-xs italic">Order completed</span>
                      )}
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
              disabled={orders.length < limit}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        {getFilteredOrders().length === 0 && (
          <div className="text-center py-8 text-gray-500">No orders match the current filter</div> //if there is nothing in the order history
        )}
      </div>
      {paymentOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">
              Payments for Purchase Order #{paymentOrderId}
            </h2>
            {paymentError && <Alert type="error">{paymentError}</Alert>}
            {/* Payment History */}
            <div className="max-h-40 overflow-y-auto border rounded mb-4">
              {paymentLoading ? (
                <p className="p-3 text-sm">Loading...</p>
              ) : paymentHistory.length === 0 ? (
                <p className="p-3 text-sm text-gray-500">No payments yet</p>
              ) : (
                paymentHistory.map((p, i) => (
                  <div key={i} className="p-2 text-sm border-b">
                    ${p.amount} — {new Date(p.paymentDate).toLocaleString()} — {p.paymentMethod || 'N/A'}
                  </div>
                ))
              )}
            </div>
            {/* Add Payment */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Payment method (ex: PayPal)"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="border px-3 py-2 rounded"
              />
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
              onClick={() => {
                setPaymentOrderId(null);
                setPaymentError(null);
              }}
              className="mt-4 text-sm text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/*cancel order confirmation*/}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-semibold mb-4">Cancel Order</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this order?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                No, keep it
              </button>
              <button
                onClick={confirmCancelOrder}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}