import { Outlet, Link, useLocation } from 'react-router-dom';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Inventory', href: '/inventory', icon: '📦' },
  { name: 'Sales', href: '/sales', icon: '💰' },
  { name: 'Customers', href: '/customers', icon: '👥' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Orders', href: '/orders', icon: '📋' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/*sidebar*/}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Leckersland Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Wholesale Management</p>
        </div>
        <nav className="mt-6 px-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                location.pathname === item.href
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/*main*/}
      <div className="ml-64">
        <header className="bg-white shadow-sm">
          <div className="px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </header>
        
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}