import { useState, useEffect } from 'react';
import { inventoryAPI, analyticsAPI, salesAPI, ordersAPI, productsAPI } from '../utils/api';
import { InventoryItem, TopSeller, ReorderRecommendation,Season,PurchaseOrder,Sale } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';
import InventoryCard from '../components/InventoryCard';

const getCurrentSeason = (): Season => {
  const month = new Date().getMonth() + 1;

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
};

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<PurchaseOrder[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTopSellers();
  }, [selectedSeason]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryRes, ordersRes, salesRes] = await Promise.all([ //recsRes 2nd
        inventoryAPI.getAll(),
        ordersAPI.getAll({ limit: 5 }),
        salesAPI.getAll({ limit: 5 })
      ]);
      setInventory(inventoryRes.data?.inventory || []);
      setRecentOrders(ordersRes.data?.orders || []);
      setRecentSales(salesRes.data?.sales || []);
      setError(null);
      await loadTopSellers();
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopSellers = async () => {
    try {
      const sellersRes = await analyticsAPI.getTopSellers(selectedSeason, 5);
      setTopSellers(sellersRes.data?.results || []);
    } catch (err) {
      console.error('Failed to load top sellers', err);
    }
  };

  const handleUpdateInventory = async (productId: number, quantity: number) => {
    await inventoryAPI.update({ product_id: productId, quantity });
    await loadData(); //refresh data
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSaleStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <Loading />;
  if (error) return <Alert type="error">{error}</Alert>;

  const lowStockItems = inventory.filter(item => item.stock_status === 'LOW');
  const criticalCount = lowStockItems.length;

  const mediumStockCount = inventory.filter(
    item => item.stock_status === 'MEDIUM'
  ).length;

  const highStockCount = inventory.filter(
    item => item.stock_status === 'HIGH'
  ).length;

  const totalItems = inventory.length;

  const lowPercent = totalItems ? Math.round((criticalCount / totalItems) * 100) : 0;
  const mediumPercent = totalItems ? Math.round((mediumStockCount / totalItems) * 100) : 0;
  const highPercent = totalItems ? Math.round((highStockCount / totalItems) * 100) : 0;

  const handleDeactivateProduct = async (productId: number) => {
    try {
      await productsAPI.deactivate(productId);
      await loadData();
    } catch (err) {
      console.error('Failed to deactivate product', err);
    }
  };

  const handleReactivateProduct = async (productId: number) => {
    try {
      await productsAPI.reactivate(productId);
      await loadData();
    } catch (err) {
      console.error('Failed to reactivate product', err);
    }
  };

  return (
    <div>
      {/*stats in header*/}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{criticalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-2xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-green-600 text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Top Seller This Season</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {topSellers[0]?.product_name || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Reorder Suggestions</p>
              <p className="text-2xl font-bold text-gray-900">
                {/*{recommendations.filter(r => r.status === 'ORDER NOW').length}*/}
                {criticalCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/*low stock alert*/}
      {criticalCount > 0 && (
        <Alert type="warning">
          You have {criticalCount} item(s) with low stock. Go to Orders to create purchase orders.
        </Alert>
      )}

      {/*top seller for certain season (season can be selected)*/}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            🏆 Top Sellers - {selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)}
          </h2>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value as Season)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
        </div>

        <div className="p-6">
          {topSellers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <div className="space-y-4">
              {topSellers.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">
                      {index + 1}. {item.product_name}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({item.sku})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">
                      {item.total_sold}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      units sold
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*recent orders*/}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">📋 Recent Orders</h2>
        </div>

        <div className="p-6">
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {order.items && order.items.length > 0
                        ? order.items.map(item => (
                            <div key={item.product_id}>
                              {item.product?.name} × {item.quantity}
                            </div>
                          ))
                        : 'No Items'}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>

                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {order.items?.reduce((sum, item) => sum + item.quantity, 0)} units
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/*recent sales*/}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">💰 Recent Sales</h2>
        </div>

        <div className="p-6">
          {recentSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent sales</p>
          ) : (
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {sale.items && sale.items.length > 0 
                          ? sale.items.map(item => ( 
                          <div key={item.product_id}> 
                          {item.product?.name} × {item.quantity} 
                          </div> 
                        )) 
                        : 'No Items'
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      {sale.customer?.name || 'Unknown Customer'} 
                      {sale.customer?.type && (
                        <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                          {sale.customer.type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getSaleStatusColor(sale.status)}`}
                    >
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>

                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {sale.items?.reduce(
                          (sum, item) => sum + item.quantity,
                          0
                        )} units
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.sale_date
                          ? new Date(sale.sale_date).toLocaleDateString()
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/*inventory health overview*/}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">📊 Inventory Health Overview</h2>
        </div>
        <div className="p-6">
          {/*progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden mb-6 flex">
            <div 
              className="bg-red-500 h-full"
              style={{ width: `${lowPercent}%` }}
            />
            <div 
              className="bg-yellow-400 h-full"
              style={{ width: `${mediumPercent}%` }}
            />
            <div 
              className="bg-green-500 h-full"
              style={{ width: `${highPercent}%` }}
            />
          </div>

          {/*legend*/}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-red-600">Low Stock</div>
                <div className="text-xl font-bold text-red-700">
                  {criticalCount}
                </div>
              </div>
              <div className="text-sm font-medium text-red-600">
                {lowPercent}%
              </div>
            </div>

            <div className="flex items-center justify-between bg-yellow-50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-yellow-600">Medium Stock</div>
                <div className="text-xl font-bold text-yellow-700">
                  {mediumStockCount}
                </div>
              </div>
              <div className="text-sm font-medium text-yellow-600">
                {mediumPercent}%
              </div>
            </div>

            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
              <div>
                <div className="text-sm text-green-600">Healthy Stock</div>
                <div className="text-xl font-bold text-green-700">
                  {highStockCount}
                </div>
              </div>
              <div className="text-sm font-medium text-green-600">
                {highPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*items with low stocks*/}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-red-600">⚠️ Low Stock Items</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockItems.map((item) => (
              <InventoryCard 
                key={item.id} 
                item={item} 
                onUpdate={handleUpdateInventory}
                onDeactivate={handleDeactivateProduct}
                onReactivate={handleReactivateProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/*quick action buttons to redirect*/}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/inventory'}
              className="p-4 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <div className="text-3xl mb-2">📦</div>
              <div className="font-medium">View All Inventory</div>
            </button>
            <button
              onClick={() => window.location.href = '/sales'}
              className="p-4 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <div className="text-3xl mb-2">💰</div>
              <div className="font-medium">Record a Sale</div>
            </button>
            <button
              onClick={() => window.location.href = '/orders'}
              className="p-4 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <div className="text-3xl mb-2">📋</div>
              <div className="font-medium">Manage Orders</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}