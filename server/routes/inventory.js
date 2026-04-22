const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

//get all inventory with product details
router.get('/', async (req, res) => {
  try {
    const { stock, search, includeInactive } = req.query;

    let stockCondition = '';

    if (stock === 'low') {
      stockCondition = 'AND i.quantity <= p.reorder_point';
    }

    if (stock === 'medium') {
      stockCondition = `
        AND i.quantity > p.reorder_point
        AND i.quantity <= p.reorder_point * 1.5
      `;
    }

    if (stock === 'high') {
      stockCondition = 'AND i.quantity > p.reorder_point * 1.5';
    }

    let searchCondition = '';
    let replacements = {};

    if (search) {
      searchCondition = `
        AND (
          LOWER(p.name) LIKE LOWER(:search)
          OR LOWER(p.sku) LIKE LOWER(:search)
          OR LOWER(p.category) LIKE LOWER(:search)
        )
      `;
      replacements.search = `%${search}%`;
    }

    let activeCondition = '';

    if (!includeInactive || includeInactive !== 'true') {
      activeCondition = 'WHERE p.is_active = true';
    } else {
      activeCondition = 'WHERE 1=1';
    }

    const inventory = await sequelize.query(`
      SELECT 
        i.id, 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.sell_price,
        p.buy_price,
        i.quantity,
        i.location,
        p.reorder_point,
        p.is_active,
        CASE 
          WHEN i.quantity <= p.reorder_point THEN 'LOW'
          WHEN i.quantity <= p.reorder_point * 1.5 THEN 'MEDIUM'
          ELSE 'HIGH'
        END as stock_status
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ${activeCondition}
      ${stockCondition}
      ${searchCondition}
      ORDER BY i.quantity ASC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: { inventory }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//update inventory (for transfers/receiving orders)
router.post('/update', async (req, res) => {
  try {
    const { product_id, quantity, location } = req.body;
    
    let inventory = await Inventory.findOne({ where: { product_id } });
    if (!inventory) {
      inventory = await Inventory.create({ product_id, quantity, location });
    } else {
      inventory.quantity = quantity;
      inventory.location = location || inventory.location;
      await inventory.save();
    }
    
    res.json({
      success: true,
      data: { inventory }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;