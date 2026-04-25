import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Analytics from './pages/Analytics';
import Orders from './pages/Orders';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import Customers from './pages/Customers';
import Login from './pages/Login';
import Vendors from './pages/Vendors';
import AddCustomer from './pages/AddCustomer';
import CustomerDetail from './pages/CustomerDetail';
import EditCustomer from './pages/EditCustomer';
import AddVendor from './pages/AddVendor';
import VendorDetail from './pages/VendorDetail';
import EditVendor from './pages/EditVendor';
import SaleDetail from './pages/SaleDetail';
import AddSales from './pages/AddSales';
import AddOrder from './pages/AddOrder';
import OrderDetail from './pages/OrderDetail';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/add" element={<AddProduct />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/:id" element={<SaleDetail />} />
          <Route path="sales/add" element={<AddSales />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/add" element={<AddOrder />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/add" element={<AddCustomer />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/edit" element={<EditCustomer />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/add" element={<AddVendor />} />
          <Route path="/vendors/:id" element={<VendorDetail />} />
          <Route path="/vendors/:id/edit" element={<EditVendor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;