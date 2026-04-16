import { useEffect, useState } from 'react';
import { customersAPI } from '../utils/api';
import { Customer } from '../types';
import Alert from '../components/Alert';
import Loading from '../components/Loading';
import { useNavigate } from 'react-router-dom';

type ConfirmAction = {
  id: number;
  action: 'deactivate' | 'reactivate';
} | null;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    loadCustomers();
  }, [showInactive]);

  const navigate = useNavigate();

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">👥 Customers</h1>
          <p className="text-gray-600">Manage customer records</p>
        </div>

        <button
          onClick={() => navigate('/customers/add')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary"
        >
          ➕ Add Customer
        </button>
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
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className={`text-left hover:underline ${
                          !customer.is_active ? 'text-gray-500' : 'text-blue-600'
                        }`}
                      >
                        {customer.name}
                      </button>

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
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
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