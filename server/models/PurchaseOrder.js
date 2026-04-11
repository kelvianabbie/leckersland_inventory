const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  vendorId: {
    type: DataTypes.INTEGER,
    field: 'vendor_id'
  },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'ordered', 'received', 'cancelled']]
    }
  },
  orderedDate: { type: DataTypes.DATE, field: 'ordered_date' },
  receivedDate: { type: DataTypes.DATE, field: 'received_date' }
}, { 
  tableName: 'purchase_orders', 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PurchaseOrder;