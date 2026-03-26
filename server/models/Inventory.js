const { sequelize } = require('./db');
const { DataTypes } = require('sequelize');

const Inventory = sequelize.define('Inventory', {

  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  quantity: { 
    type: DataTypes.INTEGER, 
    defaultValue: 0,
    validate: {
      min: 0
    }
  },

  location: { 
    type: DataTypes.STRING, 
    defaultValue: 'main-warehouse' 
  }

}, { 
  tableName: 'inventory', 
  timestamps: false
});

module.exports = Inventory;