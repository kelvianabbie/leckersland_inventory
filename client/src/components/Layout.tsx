import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Product', href: '/inventory', icon: '📦' },
  { name: 'Purchase Order', href: '/orders', icon: '📋' },
  { name: 'Invoice', href: '/sales', icon: '💰' },
  { name: 'Customers', href: '/customers', icon: '👥' },
  { name: 'Vendors', href: '/vendors', icon: '🏭' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
];

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;

    // Exact match for dashboard only
    if (path === '/') return 'Dashboard';

    // Match other routes by prefix
    const match = navigation.find(n =>
      n.href !== '/' && path.startsWith(n.href)
    );

    return match?.name || 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Leckersland Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Wholesale Management</p>
        </div>

        <nav className="mt-6 px-4">
          {navigation.map((item) => {
            const isActive =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <div className="md:ml-64">

        {/* HEADER */}
        <header className="bg-white shadow-sm h-16 flex items-center">
          <div className="w-full px-4 md:px-8 flex justify-between items-center">

            {/* LEFT: HAMBURGER + TITLE */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden text-2xl"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>

              <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                {getPageTitle()}
              </h2>
            </div>

            {/* DATE */}
            <div className="text-xs md:text-sm text-gray-500 text-right">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}