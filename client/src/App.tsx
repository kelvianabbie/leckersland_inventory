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
          <Route path="analytics" element={<Analytics />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;