import { useState } from 'react';
import { vendorsAPI } from '../utils/api';
import Alert from '../components/Alert';
import { useNavigate } from 'react-router-dom';

export default function AddVendor() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    contact_info: '',
    address: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      await vendorsAPI.create(formData);
      setTimeout(() => navigate('/vendors'), 800);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">➕ Add Vendor</h1>
      <p className="text-gray-600">Create a new vendor record</p>

      <div className="bg-white rounded-lg shadow p-6">
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Name *
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Info
            </label>
            <textarea
              rows={3}
              value={formData.contact_info}
              onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Address
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <button
              disabled={submitting}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Vendor'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/vendors')}
              className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}