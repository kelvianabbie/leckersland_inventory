const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { getSeason } = require('../utils/seasons');
const { QueryTypes } = require('sequelize');

// Record a new sale
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { customer_id, sale_date, items, ref } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: 'Sale must contain at least one item'
      });
    }

    const saleDate = sale_date ? new Date(sale_date) : new Date();
    const season = getSeason(saleDate);

    // 1️⃣ Validate stock for ALL items first
    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      const inventory = await Inventory.findOne({
        where: { product_id: item.product_id },
        transaction: t
      });

      if (!inventory) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Inventory not found for ${product?.name || 'selected product'}`
        });
      }

      if (inventory.quantity < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ${product.name}`
        });
      }
    }

    // 2️⃣ Create Sale header
    const sale = await Sale.create({
      customerId: customer_id,
      saleDate,
      season,
      status: 'pending',
      ref
    }, { transaction: t });

    // 3️⃣ Insert sale items
    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });

      const finalPrice =
        item.unit_price !== undefined && item.unit_price !== null
          ? item.unit_price
          : product.sell_price;

      await require('../models/SaleItem').create({
        saleId: sale.id,
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: finalPrice
      }, { transaction: t });
    }

    await t.commit();

    res.json({
      success: true,
      data: { id: sale.id }
    });

  } catch (error) {
    await t.rollback();
    console.error('Sale error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

//get sales summary by customer type
router.get('/summary/customer-type', async (req, res) => {
  try {
    const results = await sequelize.query(`
      SELECT 
        c.type as customer_type,
        COUNT(DISTINCT s.id) as total_sales,
        SUM(si.quantity) as total_items_sold,
        SUM(si.quantity * si.unit_price) as estimated_revenue
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN sale_items si ON si.sale_id = s.id
      WHERE s.status = 'completed'
      GROUP BY c.type
      ORDER BY total_items_sold DESC
    `, { type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: { results }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sales - UPDATED with status filter
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1, customer_id, status, season } = req.query;
    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;
    const { month } = req.query;

    const sales = await sequelize.query(`
      SELECT 
        s.id,
        s.customer_id,
        s.sale_date,
        s.season,
        s.status,
        s.completed_date,
        s.ref,
        s.credit_memo,
        c.id as customer_id_join,
        c.name as customer_name,
        c.type as customer_type,
        si.product_id,
        si.quantity,
        si.unit_price,
        p.name as product_name,
        p.sku,
        COALESCE(pay.total_paid, 0) as total_paid
      FROM (
        SELECT *
        FROM sales
        WHERE 1=1
          ${status ? 'AND status = :status' : ''}
          ${customer_id ? 'AND customer_id = :customer_id' : ''}
          ${season ? 'AND season = :season' : ''}
          ${month ? "AND EXTRACT(MONTH FROM sale_date) = :month" : ""}
        ORDER BY sale_date DESC
        LIMIT :limit
        OFFSET :offset
      ) s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN (
        SELECT sale_id, SUM(amount) as total_paid
        FROM payments
        GROUP BY sale_id
      ) pay ON pay.sale_id = s.id
      ORDER BY s.sale_date DESC
    `, {
      replacements: {
        limit: parsedLimit,
        offset,
        ...(status && { status }),
        ...(customer_id && { customer_id }),
        ...(season && { season }),
        ...(month && { month: parseInt(month) })
      },
      type: QueryTypes.SELECT
    });

    const salesMap = {};

    for (const row of sales) {
      if (!salesMap[row.id]) {
        salesMap[row.id] = {
          id: row.id,
          customer_id: row.customer_id,
          sale_date: row.sale_date,
          season: row.season,
          status: row.status,
          completed_date: row.completed_date,
          ref: row.ref,
          credit_memo: parseFloat(row.credit_memo || 0),
          customer: row.customer_id_join ? {
            id: row.customer_id_join,
            name: row.customer_name,
            type: row.customer_type
          } : null,
          items: [],
          total_paid: parseFloat(row.total_paid || 0),
        };
      }

      if (row.product_id) {
        salesMap[row.id].items.push({
          product_id: row.product_id,
          quantity: row.quantity,
          unit_price: parseFloat(row.unit_price),
          product: {
            id: row.product_id,
            name: row.product_name,
            sku: row.sku
          }
        });
      }
    }

    const sortedSales = Object.values(salesMap).sort(
      (a, b) => new Date(b.sale_date) - new Date(a.sale_date)
    );

    res.json({
      success: true,
      data: {
        sales: sortedSales,
        page: parsedPage,
        limit: parsedLimit
      }
    });

  } catch (error) {
    console.error('Sales GET error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update sale status
router.put('/:id/status', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;

    const sale = await Sale.findByPk(id, { transaction: t });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: 'Sale not found' });
    }

    const oldStatus = sale.status;

    // Prevent invalid transitions
    if (oldStatus === 'completed' && status !== 'completed') {
      await t.rollback();
      return res.status(400).json({ message: 'Completed sales cannot be modified' });
    }

    const SaleItem = require('../models/SaleItem');
    // COMPLETE SALE → DECREASE STOCK
    if (status === 'completed' && oldStatus !== 'completed') {
      const items = await SaleItem.findAll({
        where: { saleId: sale.id },
        transaction: t
      });

      for (const item of items) {
        const inventory = await Inventory.findOne({
          where: { product_id: item.productId },
          transaction: t
        });

        if (!inventory) {
          await t.rollback();
          return res.status(404).json({ message: 'Inventory not found' });
        }

        if (inventory.quantity < item.quantity) {
          await t.rollback();
          return res.status(400).json({ message: 'Not enough stock' });
        }

        inventory.quantity -= item.quantity;
        await inventory.save({ transaction: t });
      }

      sale.completedDate = new Date();
    }

    sale.status = status;
    await sale.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      data: { sale }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating sale status:', error);
    res.status(500).json({ message: 'Failed to update sale status' });
  }
});

// PUT /sales/:id/credit-memo
router.put('/:id/credit-memo', async (req, res) => {
  try {
    const { id } = req.params;
    const { credit_memo } = req.body;

    const sale = await Sale.findByPk(id);

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    if (credit_memo < 0) {
      return res.status(400).json({ success: false, error: 'Invalid credit memo' });
    }

    sale.creditMemo = credit_memo;
    await sale.save();

    res.json({
      success: true,
      data: { sale }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single sale detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await sequelize.query(`
      SELECT 
        s.id,
        s.customer_id,
        s.sale_date,
        s.season,
        s.status,
        s.completed_date,
        s.ref,
        s.credit_memo,
        c.id as customer_id_join,
        c.name as customer_name,
        c.type as customer_type,
        si.product_id,
        si.quantity,
        si.unit_price,
        p.name as product_name,
        p.sku,
        COALESCE(pay.total_paid, 0) as total_paid
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN (
        SELECT sale_id, SUM(amount) as total_paid
        FROM payments
        GROUP BY sale_id
      ) pay ON pay.sale_id = s.id
      WHERE s.id = :id
    `, {
      replacements: { id },
      type: QueryTypes.SELECT
    });

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    const sale = {
      id: rows[0].id,
      customer_id: rows[0].customer_id,
      sale_date: rows[0].sale_date,
      season: rows[0].season,
      status: rows[0].status,
      completed_date: rows[0].completed_date,
      ref: rows[0].ref,
      credit_memo: parseFloat(rows[0].credit_memo || 0),
      total_paid: parseFloat(rows[0].total_paid || 0),
      customer: rows[0].customer_id_join ? {
        id: rows[0].customer_id_join,
        name: rows[0].customer_name,
        type: rows[0].customer_type
      } : null,
      items: []
    };

    rows.forEach(row => {
      if (row.product_id) {
        sale.items.push({
          product_id: row.product_id,
          quantity: row.quantity,
          unit_price: parseFloat(row.unit_price),
          product: {
            id: row.product_id,
            name: row.product_name,
            sku: row.sku
          }
        });
      }
    });

    res.json({
      success: true,
      data: { sale }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;