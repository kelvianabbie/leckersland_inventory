import { useEffect, useState } from 'react';
import { vendorsAPI } from '../utils/api';
import { Vendor } from '../types';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import { useNavigate } from 'react-router-dom';

type ConfirmAction = {
  id: number;
  action: 'deactivate' | 'reactivate';
} | null;

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
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

  const navigate = useNavigate();

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">🏭 Vendors</h1>
          <p className="text-gray-600">Manage vendor records</p>
        </div>

        <button
          onClick={() => navigate('/vendors/add')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary"
        >
          ➕ Add Vendor
        </button>
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
                        <button
                          onClick={() => navigate(`/vendors/${vendor.id}`)}
                          className={`text-left hover:underline ${
                            !vendor.is_active ? 'text-gray-500' : 'text-blue-600'
                          }`}
                        >
                          {vendor.name}
                        </button>
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
                      onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
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