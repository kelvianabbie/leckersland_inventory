import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ordersAPI } from '../utils/api';
import { PurchaseOrder } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await ordersAPI.getById(Number(id));
      setOrder(res.data?.order || null);
    } catch (err) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!order) return <div className="p-6">Order not found</div>;

  return (
    <div className="space-y-6 p-6">
      {error && <Alert type="error">{error}</Alert>}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Purchase Order Detail #{order.id}
        </h1>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">

        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created Date</p>
            <p className="font-medium">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Vendor</p>
            <p className="font-medium">{order.vendor?.name || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Status</p>
            <p className="capitalize">{order.status}</p>
          </div>

          <div>
            <p className="text-gray-500">Ref</p>
            <p>{order.ref || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Ordered Date</p>
            <p>
              {order.ordered_date
                ? new Date(order.ordered_date).toLocaleString()
                : '-'}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Received Date</p>
            <p>
              {order.received_date
                ? new Date(order.received_date).toLocaleString()
                : '-'}
            </p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-center">Buy Price</th>
                <th className="px-4 py-2 text-center">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {order.items.map(item => {
                const price = item.buy_price || 0;
                const total = price * item.quantity;

                return (
                  <tr key={item.product_id}>
                    <td className="px-4 py-2">
                      {item.product?.name}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2 text-center">
                      ${price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTALS */}
        <div className="text-left space-y-1">
          <p className="text-lg font-bold">
            Total Price: ${(order.total_amount || 0).toFixed(2)}
          </p>
          <p>
            Total Paid: ${(order.total_paid || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}