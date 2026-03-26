const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, unique: true, allowNull: false },
  category: DataTypes.STRING,
  sell_price: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  buy_price: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  reorderPoint: { type: DataTypes.INTEGER, field: 'reorder_point', defaultValue: 10 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true}
}, { 
  tableName: 'products', 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Product;