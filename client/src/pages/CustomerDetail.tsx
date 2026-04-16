import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { customersAPI, salesAPI } from '../utils/api';
import { Customer, Sale } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [customerRes, salesRes] = await Promise.all([
        customersAPI.getById(Number(id)),
        salesAPI.getAll({ customer_id: Number(id), limit: 10 })
      ]);

      setCustomer(customerRes.data?.customer || null);
      setSales(salesRes.data?.sales || []);
      setError(null);
    } catch {
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!customer) return <div className="p-6">Customer not found</div>;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">👤 {customer.name}</h1>
        <p className="text-gray-600">Customer details & activity</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* CUSTOMER INFO CARD */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium">{customer.name}</p>
          </div>

          <div>
            <p className="text-gray-500">Type</p>
            <p className="capitalize">{customer.type}</p>
          </div>

          <div>
            <p className="text-gray-500">Contact</p>
            <p>{customer.contact_info || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Status</p>
            <p>
              {customer.is_active ? (
                <span className="text-green-600 font-medium">Active</span>
              ) : (
                <span className="text-gray-500">Inactive</span>
              )}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-gray-500">Address</p>
            <p>{customer.address || '-'}</p>
          </div>

          <div>
            <p className="text-gray-500">Created</p>
            <p>{new Date(customer.created_at).toLocaleDateString()}</p>
          </div>

        </div>
      </div>

      {/* RECENT SALES */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>

        {sales.length === 0 ? (
          <p className="text-gray-500 text-sm">No sales yet</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="border rounded p-3 flex justify-between text-sm"
              >
                <div>
                  <p className="font-medium">Sale #{sale.id}</p>
                  <p className="text-gray-500">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="capitalize">{sale.status}</p>
                  <p className="text-gray-600">
                    {sale.items.length} items
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}