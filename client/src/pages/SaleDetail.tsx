import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesAPI, paymentsAPI } from '../utils/api';
import { Sale } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      setLoading(true);

      const res = await salesAPI.getById(Number(id));
      setSale(res.data?.sale || null);

      const payRes = await paymentsAPI.getBySale(Number(id));
      setPaymentHistory(payRes.data?.data?.payments || []);

    } catch (err) {
      setError('Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!sale || paymentAmount <= 0) return;

    try {
      setPaymentLoading(true);

      const subtotal = sale.items.reduce(
        (sum, i) => sum + i.quantity * i.unit_price,
        0
      );

      const total = subtotal - (sale.credit_memo || 0);

      if ((sale.total_paid || 0) + paymentAmount > total) {
        setError('Payment exceeds total');
        return;
      }

      await paymentsAPI.create({
        sale_id: sale.id,
        amount: paymentAmount,
        payment_date: paymentDate || undefined
      });

      setPaymentAmount(0);
      setPaymentDate('');

      await loadSale();

    } catch (err) {
      setError('Failed to add payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <Loading />;

  if (!sale) return <div className="p-6">Sale not found</div>;

  const subtotal = sale.items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );

  const total = subtotal - (sale.credit_memo || 0);

  return (
    <div className="p-6 space-y-6">

      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600"
      >
        ← Back
      </button>

      {error && <Alert type="error">{error}</Alert>}

      {/* HEADER */}
      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-2">
          Sale #{sale.id}
        </h1>

        <p><strong>Status:</strong> {sale.status}</p>
        <p><strong>Date:</strong> {new Date(sale.sale_date).toLocaleString()}</p>
        <p><strong>Customer:</strong> {sale.customer?.name}</p>
        <p><strong>Season:</strong> {sale.season}</p>
        <p><strong>Ref:</strong> {sale.ref || '-'}</p>
      </div>

      {/* ITEMS */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-semibold mb-4">Items</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left">Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {sale.items.map(item => (
              <tr key={item.product_id} className="border-b">
                <td>{item.product?.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">${item.unit_price}</td>
                <td className="text-center">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right mt-4 space-y-1">
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Credit Memo: ${sale.credit_memo || 0}</p>
          <p className="font-bold text-lg">Total: ${total.toFixed(2)}</p>
          <p>Paid: ${sale.total_paid?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* PAYMENTS */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-semibold mb-4">Payments</h2>

        <div className="space-y-2 mb-4">
          {paymentHistory.length === 0 && (
            <p className="text-sm text-gray-500">No payments yet</p>
          )}

          {paymentHistory.map((p, i) => (
            <div key={i} className="text-sm border-b pb-1">
              ${p.amount} — {new Date(p.paymentDate).toLocaleString()}
            </div>
          ))}
        </div>

        {/* ADD PAYMENT */}
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            className="border px-2 py-1 rounded"
          />

          <input
            type="datetime-local"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />

          <button
            onClick={handleAddPayment}
            className="bg-green-600 text-white px-3 rounded"
          >
            Add
          </button>
        </div>
      </div>

    </div>
  );
}