const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');
const { Op } = require('sequelize');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

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

router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    let rows = [];

    // CSV
    if (file.mimetype === 'text/csv') {
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }

    // Excel
    else {
      const workbook = XLSX.readFile(file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }

    let created = 0;
    let skipped = 0;
    let skippedSkus = [];

    const skus = rows.map(r => r.sku).filter(Boolean);

    const existingProducts = await Product.findAll({
      where: { sku: skus },
      attributes: ['sku'],
      transaction
    });

    const existingSkuSet = new Set(existingProducts.map(p => p.sku));
    const seenInFile = new Set();

    const normalize = (obj) => {
      const newObj = {};
      for (const key in obj) {
        newObj[key.toLowerCase().replace(/\s+/g, '_')] = obj[key];
      }
      return newObj;
    };

    for (let row of rows) {
      row = normalize(row);
      const {
        name,
        sku,
        category,
        sell_price,
        buy_price,
        reorder_point,
        initial_stock,
        location
      } = row;

      if (!name || !sku) {
        skipped++;
        skippedSkus.push({ sku: sku || 'UNKNOWN', reason: 'missing_required_fields' });
        continue;
      }

      const parsedSell = Number(sell_price) || 0;
      const parsedBuy = Number(buy_price) || 0;
      const parsedStock = Math.max(0, Number(initial_stock) || 0);

      if (existingSkuSet.has(sku)) {
        skipped++;
        skippedSkus.push({ sku, reason: 'already_exists' });
        continue;
      }

      if (seenInFile.has(sku)) {
        skipped++;
        skippedSkus.push({ sku, reason: 'duplicate_in_file' });
        continue;
      }

      const product = await Product.create({
        name,
        sku,
        category,
        sell_price: sell_price || 0,
        buy_price: buy_price || 0,
        reorderPoint: reorder_point || 10
      }, { transaction });

      await Inventory.create({
        product_id: product.id,
        quantity: initial_stock || 0,
        location: location || 'main-warehouse'
      }, { transaction });

      created++;
      seenInFile.add(sku);
      existingSkuSet.add(sku);
    }

    await transaction.commit();

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.json({
      success: true,
      data: { created, skipped, skipped_skus: skippedSkus }
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;