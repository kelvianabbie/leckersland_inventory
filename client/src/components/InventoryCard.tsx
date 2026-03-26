import { useState } from 'react';
import { InventoryItem } from '../types';
import { useNavigate } from 'react-router-dom';
import Alert from './Alert';
import ConfirmModal from './ConfirmModal';

interface InventoryCardProps {
  item: InventoryItem;
  onUpdate: (productId: number, quantity: number) => Promise<void>;
  onDeactivate: (productId: number) => Promise<void>;
  onReactivate: (productId: number) => Promise<void>;
}

export default function InventoryCard({ item, onUpdate, onDeactivate, onReactivate }: InventoryCardProps) {
  const [editing, setEditing] = useState(false);
  const [newQuantity, setNewQuantity] = useState(item.quantity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const getStatusColor = (): string => {
    if (item.stock_status === 'LOW') return 'bg-red-100 text-red-800';
    if (item.stock_status === 'MEDIUM') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await onUpdate(item.product_id, newQuantity);
      setEditing(false);
    } catch (err) {
      setError('Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setLoading(true);
      setError(null);
      await onDeactivate(item.product_id);
    } catch {
      setError('Failed to deactivate product');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div
        className={`rounded-lg shadow p-5 transition-all ${
          item.is_active === false
            ? 'bg-gray-200'
            : 'bg-white hover:shadow-md'
        }`}
      >
      {error && <Alert type="error">{error}</Alert>}
      
      {orderSuccess && (<Alert type="success">Purchase order created successfully</Alert>)}

      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{item.product_name}</h3>
          <p className="text-sm text-gray-500">{item.sku}</p>
          <p className="text-sm text-gray-600 mt-1">{item.category}</p>
          <p className="text-sm text-gray-600 mt-1">
            Sell Price: ${Number(item.sell_price).toFixed(2)}
          </p>

          <p className="text-sm text-gray-600">
            Buy Price: ${Number(item.buy_price).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">{item.location}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {item.stock_status}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Stock:</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                className="w-24 px-2 py-1 border rounded text-sm"
                min="0"
              />
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-3 py-1 bg-primary text-white rounded hover:bg-secondary disabled:opacity-50 text-sm"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNewQuantity(item.quantity);
                }}
                className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{item.quantity}</span>
              <p className="text-xs text-gray-500">units</p>
              {item.is_active !== false && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-1 text-xs text-primary hover:text-secondary"
                >
                  Edit Stock
                </button>
              )}
              {item.is_active !== false && (
                <button
                  onClick={() => navigate(`/products/${item.product_id}/edit`)}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Edit Product
                </button>
              )}
              {item.is_active !== false && (
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="ml-2 text-xs text-red-600 hover:text-red-800"
                >
                  Deactivate
                </button>
                
              )}
              {item.is_active === false && (
                <button
                  onClick={() => onReactivate(item.product_id)}
                  className="mt-2 text-xs text-green-600 hover:text-green-800"
                >
                  Reactivate
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reorder Point:</span>
            <span className="font-medium">{item.reorder_point}</span>
          </div>
          {item.stock_status === 'LOW' && (
            <div className="mt-2">
              <p className="text-xs text-red-600 mb-2">
                ⚠️ Stock below reorder point! Consider ordering more.
              </p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={showConfirm}
        title="Deactivate Product"
        message="This will hide the product from inventory and sales. You can restore it later."
        onCancel={() => setShowConfirm(false)}
        onConfirm={async () => {
          await handleDeactivate();
          setShowConfirm(false);
        }}
        loading={loading}
      />
    </div>
  );
}