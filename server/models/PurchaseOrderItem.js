const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  purchaseOrderId: {
    type: DataTypes.INTEGER,
    field: 'purchase_order_id'
  },

  productId: {
    type: DataTypes.INTEGER,
    field: 'product_id'
  },

  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  buyPrice: {
    type: DataTypes.DECIMAL(12,2),
    field: 'buy_price',
    allowNull: false
  }

}, {
  tableName: 'purchase_order_items',
  timestamps: false
});

module.exports = PurchaseOrderItem;