import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, api } from '../utils/api';
import Alert from '../components/Alert';

export default function AddProduct() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    sell_price: 0,
    buy_price: 0,
    reorder_point: 10,
    initial_stock: 0,
    location: 'main-warehouse'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: 
        e.target.type === 'number'
          ? Number(e.target.value)
          : e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.sku) {
      setError('Product Name and SKU are required');
      return;
    }

    try {
      setLoading(true);
      await productsAPI.create(form);
      navigate('/inventory'); // ✅ redirect after success
    } catch (err) {
      setError('Failed to create product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">➕ Add New Product</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {error && <Alert type="error">{error}</Alert>}

          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sell Price</label>
            <input
              type="number"
              name="sell_price"
              value={form.sell_price}
              onChange={handleChange}
              step="0.01"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Buy Price</label>
            <input
              type="number"
              name="buy_price"
              value={form.buy_price}
              onChange={handleChange}
              step="0.01"
              className="w-full border rounded px-3 py-2"
            />
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reorder Point</label>
              <input
                type="number"
                name="reorder_point"
                value={form.reorder_point}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Initial Stock</label>
              <input
                type="number"
                name="initial_stock"
                value={form.initial_stock}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>

        </form>

        <div className="mb-6 border p-4 rounded-lg bg-gray-50">
          <h3 className="font-medium mb-2">📂 Bulk Upload (CSV / Excel)</h3>

          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button
            onClick={async () => {
              if (!file) return;

              const formData = new FormData();
              formData.append('file', file);

              try {
                setUploading(true);

                const res = await api.post('/products/bulk-upload', formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });

                alert(`Created: ${res.data.data.created}, Skipped: ${res.data.data.skipped}`);
              } catch (err) {
                console.error(err);
                alert('Upload failed');
              } finally {
                setUploading(false);
                setFile(null);
              }
            }}
            disabled={!file || uploading}
            className="ml-3 px-4 py-2 bg-blue-600 text-white rounded"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}