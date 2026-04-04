import { useState, useEffect } from 'react';
import { ordersAPI, inventoryAPI } from '../utils/api';
import { PurchaseOrder, InventoryItem } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

type OrderStatus = 'all' | 'pending' | 'ordered' | 'received';

export default function Orders() {
  //bunch of useState
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus>('all');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [cart, setCart] = useState<{
    product_id: number;
    name: string;
    quantity: number;
  }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadData();
  }, [page, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, inventoryRes, allOrdersRes] = await Promise.all([
      ordersAPI.getAll({
        page,
        limit,
        status: filter === 'all' ? undefined : filter
      }),
      inventoryAPI.getAll(),
      ordersAPI.getAll({ limit: 1000 }) // load all orders for stats
      ]);
      
      setOrders(ordersRes.data?.orders || []);
      setAllOrders(allOrdersRes.data?.orders || []);
      setInventory(inventoryRes.data?.inventory || []);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    const product = inventory.find(i => i.product_id === selectedProductId);
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
          quantity
        }
      ];
    });

    setSelectedProductId(0);
    setQuantity(1);
  };

  //create new order function
  //new
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('At least one product required');
      return;
    }

    try {
      await ordersAPI.create({
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });

      setCart([]);
      setSuccess('Order created!');
      await loadData();

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">📋 Purchase Orders</h1>
        <p className="text-gray-600">Manage orders to Taiwan suppliers</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/*total order based on status*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 shadow">
          <p className="text-sm text-blue-700">Ordered</p>
          <p className="text-2xl font-bold text-blue-600">{stats.ordered}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow">
          <p className="text-sm text-green-700">Received</p>
          <p className="text-2xl font-bold text-green-600">{stats.received}</p>
        </div>
      </div>

      {/*filter buttons based on status*/}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {setFilter('all'); setPage(1)}}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => {setFilter('pending'); setPage(1)}}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-600'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => {setFilter('ordered'); setPage(1)}}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'ordered' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'
          }`}
        >
          Ordered ({stats.ordered})
        </button>
        <button
          onClick={() => {setFilter('received'); setPage(1)}}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'received' ? 'bg-green-600 text-white' : 'bg-white text-green-600'
          }`}
        >
          Received ({stats.received})
        </button>
      </div>

      {/*create order form*/}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">➕ Create New Purchase Order</h2>

        <form onSubmit={handleCreateOrder} className="space-y-6">

          {/* Add product row */}
          <div className="grid grid-cols-3 gap-4">
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              <option value={0}>Select product</option>
              {inventory.map(item => (
                <option key={item.product_id} value={item.product_id}>
                  {item.product_name} ({item.quantity} in stock)
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

          {/* Cart table */}
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary disabled:opacity-50"
          >
            Create Order
          </button>

        </form>
      </div>

      {/*order history table*/}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Order History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
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
        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">No orders match the current filter</div> //if there is nothing in the order history
        )}
      </div>
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