const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');
const { getSeason } = require('../utils/seasons');

const Sale = sequelize.define('Sale', {
  customerId: {
    type: DataTypes.INTEGER,
    field: 'customer_id'
  },
  saleDate: {
    type: DataTypes.DATE,
    field: 'sale_date',
    defaultValue: DataTypes.NOW
  },
  season: {
    type: DataTypes.STRING,
    defaultValue: () => getSeason(new Date())
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  completedDate: {
    type: DataTypes.DATE,
    field: 'completed_date',
    allowNull: true
  }
}, {
  tableName: 'sales',
  timestamps: false
});

Sale.beforeCreate((sale) => {
  if (!sale.season) {
    sale.season = getSeason(sale.saleDate || new Date());
  }
});

module.exports = Sale;