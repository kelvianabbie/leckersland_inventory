import { useState, useEffect } from 'react';
import { salesAPI, customersAPI, inventoryAPI } from '../utils/api';
import { Customer, InventoryItem } from '../types';
import Alert from '../components/Alert';

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

  const availableProducts = inventory.filter(i => i.quantity > 0);

  const handleAddToCart = () => {
    if (!selectedProductId || quantity <= 0) return;

    if (cart.length >= MAX_ITEMS) {
      setError(`Max ${MAX_ITEMS} products`);
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
      setError('Customer + product required');
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

      setSuccess('Sale created!');
      setCart([]);
      setSelectedCustomer(0);
      setSaleDate('');
      setRef('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Sale</h1>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Customer */}
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(parseInt(e.target.value))}
          className="w-full border px-4 py-2 rounded"
        >
          <option value={0}>Select customer</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Product add */}
        <div className="grid grid-cols-4 gap-4">
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(parseInt(e.target.value))}
            className="border px-2"
          >
            <option value={0}>Product</option>
            {availableProducts.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value))}
            className="border px-2"
          />

          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="border px-2"
          />

          <button type="button" onClick={handleAddToCart} className="bg-blue-500 text-white">
            Add
          </button>
        </div>

        {/* Cart */}
        {cart.map(item => (
          <div key={item.product_id} className="flex justify-between border p-2">
            <span>{item.name}</span>
            <span>{item.quantity}</span>
          </div>
        ))}

        {/* Date */}
        <input
          type="datetime-local"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          className="w-full border px-4 py-2"
        />

        {/* Ref */}
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="Reference"
          className="w-full border px-4 py-2"
        />

        <button
          type="submit"
          className="w-full bg-primary text-white py-3 rounded"
        >
          {submitting ? 'Saving...' : 'Create Sale'}
        </button>
      </form>
    </div>
  );
}