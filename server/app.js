require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./models/db');

const inventoryRoutes = require('./routes/inventory');
const analyticsRoutes = require('./routes/analytics');
const salesRoutes = require('./routes/sales');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const productRoutes = require('./routes/products');
const invoiceRoutes = require('./routes/invoice');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'https://your-app.pages.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

//test DB connection on startup
testConnection();

//error logging
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

//routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/sales', authMiddleware, salesRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/invoice', authMiddleware, invoiceRoutes);

//API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - Inventory: http://localhost:${PORT}/api/inventory`);
  console.log(`   - Top Sellers: http://localhost:${PORT}/api/analytics/top-sellers?season=summer`);
  console.log(`   - Reorder Recs: http://localhost:${PORT}/api/analytics/reorder-recommendations`);
  console.log(`   - Sales: http://localhost:${PORT}/api/sales`);
  console.log(`   - Customers: http://localhost:${PORT}/api/customers`);
  console.log(`   - Orders: http://localhost:${PORT}/api/orders`);
});