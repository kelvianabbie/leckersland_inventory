const express = require('express');
const router = express.Router();
const OrderPayment = require('../models/OrderPayment');
const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseOrderItem = require('../models/PurchaseOrderItem');

// Add payment
router.post('/', async (req, res) => {
  try {
    const { purchase_order_id, amount, payment_date, payment_method } = req.body;

    const order = await PurchaseOrder.findByPk(purchase_order_id);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    const items = await PurchaseOrderItem.findAll({
      where: { purchaseOrderId: purchase_order_id }
    });

    const totalOrder = items.reduce(
      (sum, item) => sum + item.quantity * parseFloat(item.buyPrice),
      0
    );

    const existingPayments = await OrderPayment.findAll({
      where: { purchaseOrderId: purchase_order_id }
    });

    const totalPaid = existingPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );

    if (totalPaid + amount > totalOrder) {
      return res.status(400).json({
        success: false,
        error: 'Payment exceeds total order amount'
      });
    }

    const payment = await OrderPayment.create({
      purchaseOrderId: purchase_order_id,
      amount,
      paymentMethod: payment_method,
      paymentDate: payment_date || new Date()
    });

    res.json({ 
      success: true, 
      data: { payment } 
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get payments
router.get('/:orderId', async (req, res) => {
  try {
    const payments = await OrderPayment.findAll({
      where: { purchaseOrderId: req.params.orderId },
      order: [['paymentDate', 'ASC']]
    });

    res.json({ 
      success: true, 
      data: { payments } 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;