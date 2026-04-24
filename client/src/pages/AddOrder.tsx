import { useState, useEffect } from 'react';
import { ordersAPI, inventoryAPI, vendorsAPI } from '../utils/api';
import { InventoryItem, Vendor } from '../types';
import Alert from '../components/Alert';
import { useNavigate } from 'react-router-dom';

export default function AddOrder() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState(0);
  const [cart, setCart] = useState<{
    product_id: number;
    name: string;
    quantity: number;
    buy_price: number | null;
  }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [ref, setRef] = useState('');
  const [price, setPrice] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryRes, vendorsRes] = await Promise.all([
        inventoryAPI.getAll(),
        vendorsAPI.getAll()
      ]);

      setInventory(inventoryRes.data?.inventory || []);
      setVendors(vendorsRes.data?.vendors || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
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
          quantity,
          buy_price: price === '' ? null : parseFloat(price)
        }
      ];
    });

    setPrice('');
    setSelectedProductId(0);
    setProductSearch('');
    setQuantity(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVendorId) {
      setError('Vendor is required');
      return;
    }

    if (cart.length === 0) {
      setError('At least one product required');
      return;
    }

    try {
      setSubmitting(true);

      await ordersAPI.create({
        vendor_id: selectedVendorId,
        ref: ref || undefined,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          buy_price: item.buy_price
        }))
      });

      setSuccess('Order created! Redirecting...');

      setTimeout(() => {
        navigate('/orders');
      }, 800);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  const subtotal = cart.reduce((sum, item) => {
    const product = inventory.find(p => p.product_id === item.product_id);
    const price = item.buy_price ?? product?.buy_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">📦 Create Purchase Order</h1>
        <p className="text-gray-600">Order products from vendors</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ref
            </label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. Supplier invoice, WhatsApp order"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <select
              value={selectedVendorId}
              onChange={e => setSelectedVendorId(parseInt(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value={0}>Select vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Product *
            </label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <input onKeyDown={(e) => {
                  if (!showDropdown) return;

                  const filtered = inventory.filter(p =>
                    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
                  );

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightIndex(prev =>
                      Math.min(prev + 1, filtered.length - 1)
                    );
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightIndex(prev => Math.max(prev - 1, 0));
                  }

                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (highlightIndex >= 0) {
                      const selected = filtered[highlightIndex];
                      if (selected) {
                        setSelectedProductId(selected.product_id);
                        setProductSearch(selected.product_name);
                        setPrice(selected.buy_price?.toString() || '');
                        setShowDropdown(false);
                        setHighlightIndex(-1);
                      }
                    }
                  }

                  if (e.key === 'Escape') {
                    setShowDropdown(false);
                  }
                }}
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowDropdown(true);
                    setHighlightIndex(-1);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search product..."
                  className="w-full px-4 py-2 border rounded-lg"
                />

                {showDropdown && (
                  <div className="absolute z-10 bg-white border w-full mt-1 rounded-lg shadow max-h-60 overflow-y-auto">
                    {inventory
                      .filter(p =>
                        p.product_name.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .map((p, index) => (
                        <div
                          key={p.product_id}
                          onClick={() => {
                            setSelectedProductId(p.product_id);
                            setProductSearch(p.product_name);
                            setPrice(p.buy_price?.toString() || '');
                            setShowDropdown(false);
                          }}
                          className={`px-4 py-2 cursor-pointer ${
                            index === highlightIndex
                              ? 'bg-primary text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {p.product_name}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="px-4 py-2 border rounded-lg"
              />

              <input
                type="number"
                placeholder="Buy price (optional)"
                value={price}
                onChange={e => setPrice(e.target.value)}
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
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">Qty</th>
                    <th className="px-4 py-2 text-left">Buy Price</th>
                    <th className="px-4 py-2 text-left">Total</th>
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
                          value={item.buy_price ?? ''}
                          placeholder="default"
                          onChange={(e) => {
                            const value = e.target.value;
                            setCart(prev =>
                              prev.map(i =>
                                i.product_id === item.product_id
                                  ? {
                                      ...i,
                                      buy_price: value === '' ? null : parseFloat(value)
                                    }
                                  : i
                              )
                            );
                          }}
                          className="w-24 border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {(() => {
                          const product = inventory.find(p => p.product_id === item.product_id);
                          const finalPrice = item.buy_price ?? product?.buy_price ?? 0;
                          return `$${(finalPrice * item.quantity).toFixed(2)}`;
                        })()}
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

          <div className="border-t pt-4 flex items-center gap-3">
            <span className="text-lg font-medium text-gray-700">
              Subtotal
            </span>
            <span className="text-xl font-bold text-primary">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-secondary disabled:opacity-50"
          >
            {submitting ? 'Creating Order...' : 'Create Order'}
          </button>

        </form>
      </div>
    </div>
  );
}