const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const Customer = sequelize.define('Customer', {
  name: { type: DataTypes.STRING, allowNull: false },
  type: { 
    type: DataTypes.STRING, 
    allowNull: false
  },
  contactInfo: { type: DataTypes.TEXT, field: 'contact_info' },
  isActive: { 
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  address: {
    type: DataTypes.TEXT
  }
}, { 
  tableName: 'customers', 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Customer;