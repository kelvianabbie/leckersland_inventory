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
  const [creditMemoInput, setCreditMemoInput] = useState<number>(sale?.credit_memo || 0);
  const [creditLoading, setCreditLoading] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://leckersland-inventory.onrender.com/api';
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadSale();
  }, [id]);

  useEffect(() => {
    if (sale) {
      setCreditMemoInput(sale.credit_memo || 0);
    }
  }, [sale]);

  const loadSale = async () => {
    try {
      setLoading(true);

      const res = await salesAPI.getById(Number(id));
      setSale(res.data?.sale || null);

    } catch (err) {
      setError('Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!sale?.id) {
      setError('Invalid sale ID');
      return;
    }

    window.open(
      `${API_BASE_URL}/invoice/${sale.id}?token=${token}`,
      '_blank'
    );
  };

  const handleApplyCreditMemo = async () => {
    if (!sale) return;

    try {
      setCreditLoading(true);

      await salesAPI.updateCreditMemo(sale.id, creditMemoInput);

      await loadSale();

    } catch (err) {
      setError('Failed to apply credit memo');
    } finally {
      setCreditLoading(false);
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
    <div className="space-y-6 p-6">
      {error && <Alert type="error">{error}</Alert>}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Invoice Detail #{sale.id}
        </h1>

        <div className="flex flex-wrap items-center gap-4">
          {/* Download */}
          <button
            onClick={handleDownloadInvoice}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Download Invoice
          </button>
          {/* Credit Memo */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Credit Memo:</span>
            <input
              type="number"
              value={creditMemoInput}
              onChange={(e) => setCreditMemoInput(parseFloat(e.target.value) || 0)}
              className="border px-3 py-2 rounded-lg w-32"
              placeholder="0.00"
            />
            <button
              onClick={handleApplyCreditMemo}
              disabled={creditLoading}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* INFO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-medium">
              {new Date(sale.sale_date).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Customer</p>
            <p className="font-medium">{sale.customer?.name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="capitalize">{sale.status}</p>
          </div>
          <div>
            <p className="text-gray-500">Ref</p>
            <p>{sale.ref || '-'}</p>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-center">Price</th>
                <th className="px-4 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sale.items.map(item => (
                <tr key={item.product_id}>
                  <td className="px-4 py-2">{item.product?.name}</td>
                  <td className="px-4 py-2 text-center">{item.quantity}</td>
                  <td className="px-4 py-2 text-center">
                    ${item.unit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

        {/* TOTALS */}
        <div className="text-left space-y-1">
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Credit: ${sale.credit_memo?.toFixed(2) || '0.00'}</p>
          <p className="text-lg font-bold">
            Total Price: ${total.toFixed(2)}
          </p>
          <p>
            Total Paid: ${sale.total_paid?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
}