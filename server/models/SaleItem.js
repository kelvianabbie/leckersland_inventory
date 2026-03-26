const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const SaleItem = sequelize.define('SaleItem', {
  saleId: {
    type: DataTypes.INTEGER,
    field: 'sale_id'
  },
  productId: {
    type: DataTypes.INTEGER,
    field: 'product_id'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12,2),
    field: 'unit_price',
    allowNull: false
  }
}, {
  tableName: 'sale_items',
  timestamps: false
});

module.exports = SaleItem;