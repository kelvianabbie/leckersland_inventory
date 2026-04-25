const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const OrderPayment = sequelize.define('OrderPayment', {
  purchaseOrderId: {
    type: DataTypes.INTEGER,
    field: 'purchase_order_id',
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentDate: {
    type: DataTypes.DATE,
    field: 'payment_date',
    allowNull: false
  }
}, {
  tableName: 'order_payments',
  timestamps: false
});

module.exports = OrderPayment;