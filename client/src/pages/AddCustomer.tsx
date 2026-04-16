import { useState } from 'react';
import { customersAPI } from '../utils/api';
import Alert from '../components/Alert';
import { useNavigate } from 'react-router-dom';

type CustomerForm = {
  name: string;
  type: string;
  contact_info?: string;
  address?: string;
};

export default function AddCustomer() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CustomerForm>({
    name: '',
    type: '',
    contact_info: '',
    address: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await customersAPI.create(formData);

      setSuccess('Customer added successfully');

      // Optional: redirect after short delay
      setTimeout(() => {
        navigate(`/customers`);
      }, 800);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">➕ Add Customer</h1>
        <p className="text-gray-600">Create a new customer record</p>
      </div>

      {/* FORM */}
      <div className="bg-white rounded-lg shadow p-6">

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* NAME */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* TYPE */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Type *
            </label>
            <input
              type="text"
              required
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* CONTACT */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Contact Info
            </label>
            <textarea
              rows={3}
              value={formData.contact_info}
              onChange={(e) =>
                setFormData({ ...formData, contact_info: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* ADDRESS */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Address
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Customer'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/customers')}
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