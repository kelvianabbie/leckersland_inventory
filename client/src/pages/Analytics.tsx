import { useState, useEffect } from 'react';
import { analyticsAPI } from '../utils/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { TopSeller, ReorderRecommendation, Season, BiggestCustomer, TopMargin, TopProfit } from '../types';
import Loading from '../components/Loading';
import Alert from '../components/Alert';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getCurrentSeason = (): Season => {
  const month = new Date().getMonth() + 1;

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
};

export default function Analytics() {
  const [season, setSeason] = useState<Season>(getCurrentSeason());
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'quantity' | 'revenue'>('quantity');
  const [biggestCustomer, setBiggestCustomer] = useState<any>(null);
  const [customerProducts, setCustomerProducts] = useState<any[]>([]);
  const [topMargins, setTopMargins] = useState<TopMargin[]>([]);
  const [topProfit, setTopProfit] = useState<TopProfit[]>([]);

  useEffect(() => {
    loadData();
  }, [season, mode]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        sellersRes,
        recsRes,
        biggestRes,
        marginsRes,
        profitRes
      ] = await Promise.all([
        analyticsAPI.getTopSellers(season, 10),
        analyticsAPI.getReorderRecommendations(season),
        analyticsAPI.getBiggestCustomer(season, mode),
        analyticsAPI.getTopMargins(10),
        analyticsAPI.getTopProfit(season, 10)
      ]);

      setTopSellers(sellersRes.data?.results || []);
      setRecommendations(recsRes.data?.recommendations || []);
      setBiggestCustomer(biggestRes.data?.customer || null);
      setCustomerProducts(biggestRes.data?.products || []);
      setTopMargins(marginsRes.data?.results || []);
      setTopProfit(profitRes.data?.results || []);

      setError(null);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const topSellersChart = {
    labels: topSellers.map(item => item.product_name),
    datasets: [
      {
        label: 'Units Sold',
        data: topSellers.map(item => item.total_sold),
        backgroundColor: 'rgba(37, 99, 235, 0.6)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: `Top Sellers - ${season.charAt(0).toUpperCase() + season.slice(1)}` },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Units Sold' } },
    },
  };

  const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];

  if (loading) return <Loading />;
  if (error) return <Alert type="error">{error}</Alert>;

  // Category totals
  const categoryTotals = topSellers.reduce((acc: Record<string, number>, item) => {
    const category = (item.category || 'Uncategorized').trim().toLowerCase();

    const value = Number(item.total_sold) || 0;

    if (!acc[category]) acc[category] = 0;
    acc[category] += value;

    return acc;
  }, {});

  // Convert to array and sort
  const categoryData = Object.entries(categoryTotals).sort(
    ([,a], [,b]) => (b as number) - (a as number)
  );

  // Find largest value
  const maxCategorySales = Math.max(...Object.values(categoryTotals), 1);

  const profitChart = {
    labels: topProfit.map(p => p.name),
    datasets: [
      {
        label: 'Profit',
        data: topProfit.map(p => p.total_profit),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
    ],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">📈 Analytics Dashboard</h1>
        <p className="text-gray-600">Seasonal trends and reorder recommendations</p>
      </div>

      {/*filter per season*/}
      <div className="mb-6 flex gap-3">
        {seasons.map(s => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              season === s ? 'bg-primary text-white' : 'bg-white text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/*charts row*/}
      {/* ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Sellers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top 10 Sellers</h2>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: '400px', height: '400px' }}>
              <Bar data={topSellersChart} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sales by Category</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {categoryData.map(([category, total]) => {
              const percent = ((total as number) / maxCategorySales) * 100;
              return (
                <div key={category} className="grid grid-cols-[1fr_160px_80px] items-center gap-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="font-medium text-right">{category}</span>
                  <span className="text-gray-600 text-right">{total} units</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Profit */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Profit Products</h2>
          <div className="w-full overflow-x-auto">
            <div style={{ minWidth: '400px', height: '400px' }}>
              <Bar data={profitChart} />
            </div>
          </div>
        </div>

        {/* Best Margins */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Best Margins</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sell Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buy Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {topMargins.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4">${item.sell_price}</td>
                    <td className="px-6 py-4">${item.buy_price}</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">
                      {item.margin_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>  
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-8">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold">
            Biggest Customer ({season})
          </h2>

          <div className="flex gap-2">
            <button
              onClick={() => setMode('quantity')}
              className={`px-3 py-1 rounded ${
                mode === 'quantity' ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
            >
              Quantity
            </button>

            <button
              onClick={() => setMode('revenue')}
              className={`px-3 py-1 rounded ${
                mode === 'revenue' ? 'bg-primary text-white' : 'bg-gray-100'
              }`}
            >
              Revenue
            </button>
          </div>
        </div>

        {/* CUSTOMER SUMMARY */}
        {biggestCustomer && (
          <div className="p-6 border-b">
            <div className="text-xl font-bold">
              {biggestCustomer.name}
            </div>

            <div className="text-sm text-gray-600 mt-1">
              {mode === 'quantity' ? (
                <>Total Quantity: {biggestCustomer.total_quantity}</>
              ) : (
                <>Total Revenue: ${biggestCustomer.total_revenue}</>
              )}
            </div>
          </div>
        )}

        {!biggestCustomer && (
          <div className="p-6 text-gray-500">
            No customer data for this season
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {customerProducts.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {item.product_name}
                  </td>
                  <td className="px-6 py-4">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4">
                    ${item.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/*reorder recommendation per season*/}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">📦 Reorder Recommendations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Based on current season ({season}) sales and stock levels
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sold This Season</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recommendations.map((item) => (
                <tr 
                  key={item.sku} 
                  className={`hover:bg-gray-50 ${
                    item.status === 'ORDER NOW' ? 'bg-red-50' : 
                    item.status === 'PLAN TO ORDER' ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.sold_this_season}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={
                      item.current_stock <= item.reorder_point ? 'text-red-600' : 
                      item.current_stock <= item.reorder_point * 1.5 ? 'text-yellow-600' : 'text-green-600'
                    }>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'ORDER NOW' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        ORDER NOW
                      </span>
                    )}
                    {item.status === 'PLAN TO ORDER' && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Plan to Order
                      </span>
                    )}
                    {item.status === 'OK' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-primary">
                    {Math.max(0, item.suggested_order_qty)} units
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recommendations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No reorder recommendations at this time
          </div>
        )}
      </div>
    </div>
  );
}