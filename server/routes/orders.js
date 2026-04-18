const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

//get all purchase orders
router.get('/', async (req, res) => {
  try {
    const { status, limit = 20, page = 1, vendor_id, month } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const offset = (parsedPage - 1) * parsedLimit;

    let whereConditions = [];
    let replacements = {
      limit: parsedLimit,
      offset
    };

    if (status) {
      whereConditions.push('po.status = :status');
      replacements.status = status;
    }

    if (vendor_id) {
      whereConditions.push('po.vendor_id = :vendor_id');
      replacements.vendor_id = parseInt(vendor_id);
    }

    if (month) {
      whereConditions.push('EXTRACT(MONTH FROM po.created_at) = :month');
      replacements.month = parseInt(month);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const orders = await sequelize.query(`
      SELECT 
        po.id,
        po.status,
        po.ordered_date,
        po.received_date,
        po.created_at,
        po.vendor_id,
        v.name as vendor_name,
        poi.product_id,
        poi.quantity,
        poi.buy_price,
        p.name as product_name,
        p.sku
      FROM (
        SELECT *
        FROM purchase_orders po
        ${whereClause}
        ORDER BY po.created_at DESC
        LIMIT :limit
        OFFSET :offset
      ) po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      LEFT JOIN products p ON poi.product_id = p.id
      ORDER BY po.created_at DESC, po.id DESC
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // ✅ Transform flat → nested
    const orderMap = {};

    for (const row of orders) {
      if (!orderMap[row.id]) {
        orderMap[row.id] = {
          id: row.id,
          status: row.status,
          ordered_date: row.ordered_date,
          received_date: row.received_date,
          created_at: row.created_at,
          vendor: row.vendor_id
            ? {
                id: row.vendor_id,
                name: row.vendor_name
              }
            : null,
          items: []
        };
      }

      if (row.product_id) {
        orderMap[row.id].items.push({
          product_id: row.product_id,
          quantity: row.quantity,
          buy_price: row.buy_price,
          product: {
            name: row.product_name,
            sku: row.sku
          }
        });
      }
    }

    const formattedOrders = Object.values(orderMap).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({
      success: true,
      data: {
        orders: formattedOrders,
        page: parsedPage,
        limit: parsedLimit
      }
    });

  } catch (error) {
    console.error('Orders GET error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

//create new purchase order
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { items, vendor_id } = req.body;

    if (!vendor_id) {
      throw new Error('Vendor is required');
    }

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const order = await PurchaseOrder.create({vendorId: vendor_id}, { transaction: t });

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, { transaction: t });

      if (!product) {
        throw new Error('Product not found');
      }

      await require('../models/PurchaseOrderItem').create({
        purchaseOrderId: order.id,
        productId: item.product_id,
        quantity: item.quantity,
        buyPrice: product.buy_price
      }, { transaction: t });
    }

    await t.commit();

    res.json({
      success: true,
      data: {
        order: { id: order.id }
      }
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
});

//update order status
router.put('/:id/status', async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await PurchaseOrder.findByPk(id, { transaction: t });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;

    //set ordered date
    if (status === 'ordered' && !order.orderedDate) {
      order.orderedDate = new Date();
    }

    //set received date AND update inventory
    if (status === 'received' && !order.receivedDate) {
      order.receivedDate = new Date();
      
      const PurchaseOrderItem = require('../models/PurchaseOrderItem');

      const items = await PurchaseOrderItem.findAll({
        where: { purchaseOrderId: order.id },
        transaction: t
      });

      for (const item of items) {
        let inventory = await Inventory.findOne({
          where: { product_id: item.productId },
          transaction: t
        });

        if (!inventory) {
          await Inventory.create({
            product_id: item.productId,
            quantity: item.quantity
          }, { transaction: t });
        } else {
          inventory.quantity += item.quantity;
          await inventory.save({ transaction: t });
        }
      }
    }

    await order.save({ transaction: t });

    await t.commit();

    res.json({
      success: true
    });

  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }
});

//delete order (cancel)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    const PurchaseOrderItem = require('../models/PurchaseOrderItem');

    await PurchaseOrderItem.destroy({
      where: { purchaseOrderId: id }
    });

    await order.destroy();

    res.json({
      success: true
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

module.exports = router;