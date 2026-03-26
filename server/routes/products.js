const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { is_active: true },
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message });
  }
});

//CREATE new product
router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      sku,
      category,
      sell_price,
      buy_price,
      reorder_point,
      initial_stock,
      location
    } = req.body;

    // 1. Create product
    const product = await Product.create(
      {
        name,
        sku,
        category,
        sell_price,
        buy_price,
        reorderPoint: reorder_point
      },
      { transaction }
    );

    // IMPORTANT: use product.id directly
    const productId = product.id;

    console.log("Created product with ID:", productId);

    // 2. Create inventory using the correct product ID
    await Inventory.create(
      {
        product_id: productId,
        quantity: initial_stock || 0,
        location: location || 'main-warehouse'
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    await transaction.rollback();

    console.error("CREATE PRODUCT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, sell_price, buy_price, reorder_point } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    //Prevent duplicate SKU (except for current product)
    const existingSKU = await Product.findOne({
      where: {
        sku,
        id: { [Op.ne]: id } // not equal to current id
      }
    });

    if (existingSKU) {
      return res.status(400).json({
        success: false,
        error: 'SKU already exists'
      });
    }

    await product.update({
      name,
      sku,
      category,
      sell_price,
      buy_price,
      reorderPoint: reorder_point
    });

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

//deactivate
router.put('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    product.is_active = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deactivated'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//reactivate product
router.put('/:id/reactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    product.is_active = true;
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;