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

      <div className="bg-white rounded-lg shadow p-6">
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            required
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <textarea
            placeholder="Contact Info"
            value={formData.contact_info}
            onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <textarea
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          />

          <div className="flex gap-3">
            <button className="px-6 py-2 bg-primary text-white rounded-lg">
              {submitting ? 'Saving...' : 'Add Vendor'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/vendors')}
              className="px-6 py-2 bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}