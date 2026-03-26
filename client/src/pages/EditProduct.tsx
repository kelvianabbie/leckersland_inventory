import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../utils/api';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    sell_price: 0,
    buy_price: 0,
    reorder_point: 10,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getAll();
      const product = response.data.data.products.find(
        (p: any) => p.id === Number(id)
      );

      if (!product) {
        setError('Product not found');
        return;
      }

      setForm(product);
    } catch {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await productsAPI.update(Number(id), form);
      navigate('/inventory');
    } catch {
      setError('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Loading product..." />;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Edit Product</h2>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label className="block text-sm font-medium mb-1">Product Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sell Price</label>
          <input
            type="number"
            value={form.sell_price}
            onChange={(e) =>
              setForm({ ...form, sell_price: Number(e.target.value) })
            }
            className="w-full border rounded px-3 py-2"
            step="0.01"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Buy Price</label>
          <input
            type="number"
            value={form.buy_price}
            onChange={(e) =>
              setForm({ ...form, buy_price: Number(e.target.value) })
            }
            className="w-full border rounded px-3 py-2"
            step="0.01"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reorder Point</label>
          <input
            type="number"
            value={form.reorder_point}
            onChange={(e) =>
              setForm({ ...form, reorder_point: Number(e.target.value) })
            }
            className="w-full border rounded px-3 py-2"
            min="0"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}