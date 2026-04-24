const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const Payment = sequelize.define('Payment', {
  saleId: {
    type: DataTypes.INTEGER,
    field: 'sale_id',
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
  tableName: 'payments',
  timestamps: false
});

module.exports = Payment;