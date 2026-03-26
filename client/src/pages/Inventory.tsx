import { useState, useEffect } from 'react';
import { inventoryAPI, productsAPI } from '../utils/api';
import { InventoryItem } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';
import InventoryCard from '../components/InventoryCard';

type FilterType = 'all' | 'low' | 'medium' | 'high';

type ConfirmAction = {
  id: number;
  action: 'deactivate' | 'reactivate';
} | null;

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [fetching, setFetching] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);


  useEffect(() => {
    loadInventory(filter, debouncedSearch);
  }, [filter, debouncedSearch, showInactive]);


  const loadInventory = async (stock?: string, search?: string) => {
    try {
      if (inventory.length === 0) {
        setLoading(true);   // first load only
      } else {
        setFetching(true);  // search/filter
      }

      // always fetch full inventory for stats
      const fullRes = await inventoryAPI.getAll();
      setAllInventory(fullRes.data?.inventory || []);

      // fetch filtered inventory for display
      const params: any = {};
      if (stock && stock !== 'all') params.stock = stock;
      if (search) params.search = search;
      if (showInactive) params.includeInactive = true;

      const filteredRes = await inventoryAPI.getAll(params);
      setInventory(filteredRes.data?.inventory || []);

      setError(null);
    } catch (err) {
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const handleUpdateInventory = async (productId: number, quantity: number) => {
    await inventoryAPI.update({ product_id: productId, quantity });
    await loadInventory();
  };

  const handleDeactivateProduct = async (productId: number) => {
    try {
      await productsAPI.deactivate(productId);
      await loadInventory();
    } catch (err) {
      console.error('Failed to deactivate product');
    }
  };

  const handleReactivateProduct = async (productId: number) => {
    try {
      await productsAPI.reactivate(productId);
      await loadInventory(filter, debouncedSearch);
    } catch (err) {
      console.error('Failed to reactivate product');
    }
  };

  const stats = {
    total: allInventory.length,
    low: allInventory.filter(i => i.stock_status === 'LOW').length,
    medium: allInventory.filter(i => i.stock_status === 'MEDIUM').length,
    high: allInventory.filter(i => i.stock_status === 'HIGH').length,
  };

  if (loading) return <Loading />;
  if (error) return <Alert type="error">{error}</Alert>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">📦 Inventory Management</h1>
        <p className="text-gray-600">Track stock levels across all products</p>
      </div>

      {/*items based on the stocks*/}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 shadow">
          <p className="text-sm text-red-700">Low Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.low}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow">
          <p className="text-sm text-yellow-700">Medium Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow">
          <p className="text-sm text-green-700">High Stock</p>
          <p className="text-2xl font-bold text-green-600">{stats.high}</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/*filter buttons based on stocks*/}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-700'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'low' ? 'bg-red-600 text-white' : 'bg-white text-red-600'
          }`}
        >
          Low Stock ({stats.low})
        </button>
        <button
          onClick={() => setFilter('medium')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'medium' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-600'
          }`}
        >
          Medium Stock ({stats.medium})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'high' ? 'bg-green-600 text-white' : 'bg-white text-green-600'
          }`}
        >
          High Stock ({stats.high})
        </button>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-primary"
          />
          Show Inactive Products
        </label>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => window.location.href = '/inventory/add'}
          className="bg-primary text-white px-4 py-2 rounded hover:opacity-90"
        >
          ➕ Add Product
        </button>
      </div>
      
      {fetching && (
        <p className="text-sm text-gray-400 mb-2">
          Updating results...
        </p>
      )}

      {/*inventory grid*/}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inventory.map((item) => (
          <InventoryCard 
            key={item.id} 
            item={item} 
            onUpdate={handleUpdateInventory}
            onDeactivate={handleDeactivateProduct}
            onReactivate={handleReactivateProduct}
          />
        ))}
      </div>

      {inventory.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No items match the current filter
        </div>
      )}
    </div>
  );
}