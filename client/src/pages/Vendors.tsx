import { useEffect, useState } from 'react';
import { vendorsAPI } from '../utils/api';
import { Vendor } from '../types';
import Alert from '../components/Alert';
import Loading from '../components/Loading';

type VendorForm = {
  name: string;
  contact_info?: string;
  address?: string;
};

type ConfirmAction = {
  id: number;
  action: 'deactivate' | 'reactivate';
} | null;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<VendorForm>({
    name: '',
    contact_info: '',
    address: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    loadVendors();
  }, [showInactive]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorsAPI.getAll({
        includeInactive: showInactive
      });
      setVendors(res.data?.vendors || []);
      setError(null);
    } catch {
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_info: '',
      address: ''
    });
    setEditingVendor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingVendor) {
        await vendorsAPI.update(editingVendor.id, formData);
        setSuccess('Vendor updated successfully');
      } else {
        await vendorsAPI.create(formData);
        setSuccess('Vendor added successfully');
      }

      resetForm();
      await loadVendors();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_info: vendor.contact_info || '',
      address: vendor.address || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.action === 'deactivate') {
        await  vendorsAPI.deactivate(confirmAction.id);
        setSuccess('Vendor deactivated');
      } else {
        await vendorsAPI.reactivate(confirmAction.id);
        setSuccess('Vendor reactivated');
      }

      await loadVendors();
    } catch {
      setError('Operation failed');
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🏭 Vendors</h1>
        <p className="text-gray-600">Manage vendor records</p>
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
              {editingVendor ? 'Update Vendor' : 'Add Vendor'}
            </button>

            {editingVendor && (
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
            Show Inactive Vendors
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <tr
                  key={vendor.id}
                    className={`hover:bg-gray-50 ${
                      !vendor.is_active ? 'bg-gray-100 text-gray-400' : ''
                    }`}
                  >
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className={!vendor.is_active ? 'text-gray-500' : 'text-gray-900'}>
                        {vendor.name}
                      </span>

                      {!vendor.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-gray-300 text-gray-700 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {vendor.contact_info || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate"> {/*px-6 py-4 text-sm text-gray-600*/}
                    {vendor.address || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(vendor.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Edit
                    </button>

                    {vendor.is_active ? (
                      <button
                        onClick={() => setConfirmAction({ id: vendor.id, action: 'deactivate' })}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: vendor.id, action: 'reactivate' })}
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

          {vendors.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No vendors found
            </div>
          )}
        </div>
      </div>
      {confirmAction && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {confirmAction.action === 'deactivate'
              ? 'Deactivate Vendor'
              : 'Reactivate Vendor'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {confirmAction.action === 'deactivate'
              ? 'Are you sure you want to deactivate this vendor? They will be hidden from default views.'
              : 'Are you sure you want to reactivate this vendor?'}
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