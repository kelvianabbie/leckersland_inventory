import { useEffect, useState } from 'react';
import { vendorsAPI } from '../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/Alert';
import Loading from '../components/Loading';

export default function EditVendor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    contact_info: '',
    address: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      const res = await vendorsAPI.getById(Number(id));
      const vendor = res.data?.vendor;

      if (!vendor) throw new Error();

      setFormData({
        name: vendor.name,
        contact_info: vendor.contact_info || '',
        address: vendor.address || ''
      });
    } catch {
      setError('Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      await vendorsAPI.update(Number(id), formData);
      navigate(`/vendors`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update vendor');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">✏️ Edit Vendor</h1>
      <p className="text-gray-600">Update vendor information</p>

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
            onChange={(e) =>
              setFormData({ ...formData, contact_info: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />

          <textarea
            placeholder="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="w-full px-4 py-2 border rounded-lg"
          />

          <div className="flex gap-3">
            <button
              disabled={submitting}
              className="px-6 py-2 bg-primary text-white rounded-lg"
            >
              {submitting ? 'Saving...' : 'Update Vendor'}
            </button>

            <button
              type="button"
              onClick={() => navigate(`/vendors`)}
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