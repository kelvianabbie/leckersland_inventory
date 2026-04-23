import { useState, useEffect } from 'react';
import { salesAPI, customersAPI, inventoryAPI } from '../utils/api';
import { Customer, InventoryItem } from '../types';
import Alert from '../components/Alert';
import { useNavigate } from 'react-router-dom';

export default function AddSales() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number>(0);
  const [saleDate, setSaleDate] = useState('');
  const [ref, setRef] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<string>('');
  const MAX_ITEMS = 11;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, inventoryRes] = await Promise.all([
        customersAPI.getAll(),
        inventoryAPI.getAll()
      ]);

      setCustomers(customersRes.data?.customers || []);
      setInventory(inventoryRes.data?.inventory || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const availableProducts = inventory.filter(i => i.quantity > 0);

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    if (cart.length >= MAX_ITEMS) {
      setError(`Max ${MAX_ITEMS} products allowed`);
      return;
    }

    const product = availableProducts.find(p => p.product_id === selectedProductId);
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

      await salesAPI.create({
        customer_id: selectedCustomer,
        sale_date: saleDate || undefined,
        ref: ref || undefined,
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price
        }))
      });

      setSuccess('Sale created! Redirecting back to invoice page...');

      // Optional: slight delay so user sees feedback
      setTimeout(() => {
        navigate('/sales');
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
  <div>
    <div className="mb-6">
      <h1 className="text-2xl font-bold mb-2">💰 Generate Invoice</h1>
      <p className="text-gray-600">
        Log sales to track inventory and customer purchases
      </p>
    </div>

    <div className="bg-white rounded-lg shadow p-6">
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer *
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(parseInt(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value={0}>Select a customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Add Product */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Product * (Max 11) ({cart.length}/11 items added)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            <option value={0}>Select product</option>
            {availableProducts.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name} ({p.quantity} available)
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

        {/* Cart Table */}
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
                                ? {
                                    ...i,
                                    unit_price: value === '' ? null : parseFloat(value)
                                  }
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

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to record sale at current time
          </p>
        </div>

        {/* Ref */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ref
          </label>
          <input
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. PO-123, WhatsApp order, etc."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary disabled:opacity-50"
        >
          {submitting ? 'Recording Invoice...' : 'Record Invoice'}
        </button>
      </form>
    </div>
  </div>
);
}