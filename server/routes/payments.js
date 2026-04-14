const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');

// Add payment
router.post('/', async (req, res) => {
  try {
    const { sale_id, amount, payment_date } = req.body;

    const sale = await Sale.findByPk(sale_id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    const items = await SaleItem.findAll({
      where: { saleId: sale_id }
    });

    const totalSale = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const existingPayments = await Payment.findAll({
      where: { saleId: sale_id }
    });

    const totalPaid = existingPayments.reduce(
      (sum, p) => sum + parseFloat(p.amount),
      0
    );

    if (totalPaid + amount > totalSale) {
      return res.status(400).json({
        success: false,
        error: 'Payment exceeds total sale amount'
      });
    }

    const payment = await Payment.create({
      saleId: sale_id,
      amount,
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

// Get payments by sale
router.get('/:saleId', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { saleId: req.params.saleId },
      order: [['paymentDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { payments }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;