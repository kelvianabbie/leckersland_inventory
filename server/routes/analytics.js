const express = require('express');
const router = express.Router();
const { sequelize } = require('../models/db');

//top sellers by season
router.get('/top-sellers', async (req, res) => {
  try {
    const { season = 'summer', limit = 10 } = req.query;
    
    const results = await sequelize.query(`
      SELECT 
        p.name as product_name,
        p.sku,
        p.category,
        SUM(si.quantity) as total_sold,
        COUNT(DISTINCT s.id) as order_count,
        AVG(si.quantity)::decimal(10,2) as avg_per_order
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.season = :season
        AND s.status = 'completed'
        AND s.sale_date >= NOW() - INTERVAL '2 years'
      GROUP BY p.id, p.name, p.sku, p.category
      ORDER BY total_sold DESC
      LIMIT :limit
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { season, limit: parseInt(limit) }
    });
    
    res.json({
      success: true,
      data: { season, results }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//biggest customer
router.get('/biggest-customer', async (req, res) => {
  try {
    const { season = 'summer', mode = 'quantity' } = req.query;

    const [customer] = await sequelize.query(`
      SELECT 
        c.id,
        c.name,
        SUM(si.quantity) as total_quantity,
        SUM(si.quantity * si.unit_price) as total_revenue
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      JOIN sale_items si ON si.sale_id = s.id
      WHERE s.status = 'completed'
        AND s.season = :season
      GROUP BY c.id, c.name
      ORDER BY 
        ${mode === 'revenue' ? 'total_revenue' : 'total_quantity'} DESC
      LIMIT 1
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { season }
    });

    if (!customer) {
      return res.json({
        success: true,
        data: { customer: null, products: [] }
      });
    }

    const products = await sequelize.query(`
      SELECT 
        p.name as product_name,
        SUM(si.quantity) as quantity,
        SUM(si.quantity * si.unit_price) as revenue
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.customer_id = :customerId
        AND s.status = 'completed'
        AND s.season = :season
      GROUP BY p.id, p.name
      ORDER BY ${mode === 'revenue' ? 'revenue' : 'quantity'} DESC
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        customerId: customer.id,
        season
      }
    });

    res.json({
      success: true,
      data: { customer, products }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//biggest vendor (all-time)
router.get('/biggest-vendor', async (req, res) => {
  try {
    const { mode = 'expense' } = req.query;

    const [vendor] = await sequelize.query(`
      SELECT 
        v.id,
        v.name,
        SUM(poi.quantity) as total_quantity,
        SUM(poi.quantity * poi.buy_price) as total_expense
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.status IN ('ordered', 'received')
      GROUP BY v.id, v.name
      ORDER BY 
        ${mode === 'quantity' ? 'total_quantity' : 'total_expense'} DESC
      LIMIT 1
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    if (!vendor) {
      return res.json({
        success: true,
        data: { vendor: null, products: [] }
      });
    }

    const products = await sequelize.query(`
      SELECT 
        p.name as product_name,
        SUM(poi.quantity) as quantity,
        SUM(poi.quantity * poi.buy_price) as expense
      FROM purchase_orders po
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      JOIN products p ON poi.product_id = p.id
      WHERE po.vendor_id = :vendorId
        AND po.status IN ('ordered', 'received')
      GROUP BY p.id, p.name
      ORDER BY ${mode === 'quantity' ? 'quantity' : 'expense'} DESC
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        vendorId: vendor.id
      }
    });

    res.json({
      success: true,
      data: { vendor, products }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//top sellers by margin
router.get('/top-margins', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const results = await sequelize.query(`
      SELECT 
        p.name,
        p.sku,
        p.category,
        p.sell_price,
        p.buy_price,
        ROUND(
          ((p.sell_price - p.buy_price) / NULLIF(p.sell_price, 0)) * 100,
          2
        ) as margin_percent
      FROM products p
      WHERE p.is_active = true
      ORDER BY margin_percent DESC
      LIMIT :limit
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { limit: parseInt(limit) }
    });

    res.json({
      success: true,
      data: { results }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//top sellers by profit
router.get('/top-profit', async (req, res) => {
  try {
    const { season = 'summer', limit = 10 } = req.query;

    const results = await sequelize.query(`
      SELECT 
        p.name,
        p.sku,
        p.category,
        SUM(si.quantity) as total_sold,
        SUM(
          (si.unit_price - p.buy_price) * si.quantity
        ) as total_profit
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.status = 'completed'
        AND s.season = :season
      GROUP BY p.id, p.name, p.sku, p.category
      ORDER BY total_profit DESC
      LIMIT :limit
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { season, limit: parseInt(limit) }
    });

    res.json({
      success: true,
      data: { season, results }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

//reorder recommendations
router.get('/reorder-recommendations', async (req, res) => {
  try {
    const { season } = req.query;
    const currentSeason = season || require('../utils/seasons').getSeason(new Date());

    const recommendations = await sequelize.query(`
      WITH seasonal_sales AS (
        SELECT 
          si.product_id,
          SUM(si.quantity) as sold_this_season
        FROM sales s
        JOIN sale_items si ON si.sale_id = s.id
        WHERE s.season = :season
          AND s.status = 'completed'
          AND s.sale_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
        GROUP BY si.product_id
      )
      SELECT 
        p.name,
        p.sku,
        p.category,
        COALESCE(ss.sold_this_season, 0) as sold_this_season,
        i.quantity as current_stock,
        p.reorder_point,
        CASE
          WHEN COALESCE(ss.sold_this_season,0) = 0 THEN 'OK'
          WHEN i.quantity <= p.reorder_point THEN 'ORDER NOW'
          WHEN i.quantity <= p.reorder_point * 1.5 THEN 'PLAN TO ORDER'
          ELSE 'OK'
        END AS status,
        GREATEST(
          (COALESCE(ss.sold_this_season,0) + p.reorder_point) - i.quantity,
          0
        ) as suggested_order_qty
      FROM products p
      JOIN inventory i ON p.id = i.product_id
      LEFT JOIN seasonal_sales ss ON p.id = ss.product_id
      ORDER BY 
        CASE 
          WHEN COALESCE(ss.sold_this_season,0) = 0 THEN 4
          WHEN i.quantity <= p.reorder_point THEN 1
          WHEN i.quantity <= p.reorder_point * 1.5 THEN 2
          ELSE 3
        END,
        sold_this_season DESC
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { season: currentSeason }
    });

    res.json({
      success: true,
      data: { season: currentSeason, recommendations }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// monthly financial report
router.get('/monthly-report', async (req, res) => {
  try {
    const { month, year } = req.query;

    const now = new Date();
    const selectedMonth = parseInt(month) || (now.getMonth() + 1);
    const selectedYear = now.getFullYear();

    // date range
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDateQuery = `
      (DATE_TRUNC('month', DATE :startDate) + INTERVAL '1 month')
    `;

    // TOTAL REVENUE (from sales)
    const [revenueResult] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM sales
      WHERE status = 'completed'
        AND sale_date >= DATE :startDate
        AND sale_date < ${endDateQuery}
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { startDate }
    });

    // TOTAL EXPENSE (from purchase orders)
    const [expenseResult] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(poi.quantity * poi.buy_price), 0) as total_expense
      FROM purchase_orders po
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.status IN ('ordered', 'received')
        AND po.created_at >= DATE :startDate
        AND po.created_at < ${endDateQuery}
    `, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { startDate }
    });

    const revenue = Number(revenueResult.total_revenue);
    const expense = Number(expenseResult.total_expense);

    res.json({
      success: true,
      data: {
        month: selectedMonth,
        revenue,
        expense,
        profit: revenue - expense
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;