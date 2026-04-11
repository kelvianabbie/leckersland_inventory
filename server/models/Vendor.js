const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const Vendor = sequelize.define('Vendor', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactInfo: {
    type: DataTypes.TEXT,
    field: 'contact_info'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  address: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'vendors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Vendor;