import { useEffect, useState } from 'react';
import { customersAPI } from '../utils/api';
import { Customer } from '../types';
import Alert from '../components/Alert';
import Loading from '../components/Loading';

type CustomerForm = {
  name: string;
  type: string;
  contact_info?: string;
  address?: string;
};

type ConfirmAction = {
  id: number;
  action: 'deactivate' | 'reactivate';
} | null;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>({
    name: '',
    type: '',
    contact_info: '',
    address: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    loadCustomers();
  }, [showInactive]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersAPI.getAll({
        includeInactive: showInactive
      });
      setCustomers(res.data?.customers || []);
      setError(null);
    } catch {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      contact_info: '',
      address: ''
    });
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, formData);
        setSuccess('Customer updated successfully');
      } else {
        await customersAPI.create(formData);
        setSuccess('Customer added successfully');
      }

      resetForm();
      await loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      type: customer.type,
      contact_info: customer.contact_info || '',
      address: customer.address || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.action === 'deactivate') {
        await customersAPI.deactivate(confirmAction.id);
        setSuccess('Customer deactivated');
      } else {
        await customersAPI.reactivate(confirmAction.id);
        setSuccess('Customer reactivated');
      }

      await loadCustomers();
    } catch {
      setError('Operation failed');
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">👥 Customers</h1>
        <p className="text-gray-600">Manage customer records</p>
      </div>

      {/* FORM */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <input
                type="text"
                value={formData.type}
                onChange={(e) =>
                    setFormData({
                    ...formData,
                    type: e.target.value as CustomerForm['type']
                    })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Info</label>
            <textarea
              value={formData.contact_info}
              onChange={(e) =>
                setFormData({ ...formData, contact_info: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50"
            >
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>

            {editingCustomer && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
        />
        <label className="text-sm text-gray-700">
            Show Inactive Customers
        </label>
        </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow relative">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center">
            <Loading />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                    className={`hover:bg-gray-50 ${
                      !customer.is_active ? 'bg-gray-100 text-gray-400' : ''
                    }`}
                  >
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className={!customer.is_active ? 'text-gray-500' : 'text-gray-900'}>
                        {customer.name}
                      </span>

                      {!customer.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                    {customer.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {customer.contact_info || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"> {/*px-6 py-4 text-sm text-gray-600*/}
                    {customer.address || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>

                    {customer.is_active ? (
                      <button
                        onClick={() => setConfirmAction({ id: customer.id, action: 'deactivate' })}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: customer.id, action: 'reactivate' })}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No customers found
            </div>
          )}
        </div>
      </div>
      {confirmAction && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {confirmAction.action === 'deactivate'
              ? 'Deactivate Customer'
              : 'Reactivate Customer'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {confirmAction.action === 'deactivate'
              ? 'Are you sure you want to deactivate this customer? They will be hidden from default views.'
              : 'Are you sure you want to reactivate this customer?'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white rounded ${
                confirmAction.action === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}