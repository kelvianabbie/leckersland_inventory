const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { sequelize } = require('../models/db');

//get all customers
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const whereClause = includeInactive
      ? {}
      : { isActive: true };

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
      attributes: [
        'id',
        'name',
        'type',
        'address',
        [sequelize.col('contact_info'), 'contact_info'],
        'created_at',
        [sequelize.col('is_active'), 'is_active']
      ]
    });

    res.json({
      success: true,
      data: { customers }
    });
  } catch (error) {
    console.error('GET /customers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

//create new customer
router.post('/', async (req, res) => {
  try {
    const { name, type, contact_info, address } = req.body;
    const customer = await Customer.create({ name, type, contactInfo: contact_info, address });
    res.json({
      success: true,
      data: { customer }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, type, contact_info, address } = req.body;

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    customer.name = name;
    customer.type = type;
    customer.contactInfo = contact_info;
    customer.address = address;
    await customer.save();

    res.json({
      success: true,
      data: { customer }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deactivate customer
router.put('/:id/deactivate', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    customer.isActive = false;
    await customer.save();

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reactivate customer
router.put('/:id/reactivate', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    customer.isActive = true;
    await customer.save();

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      attributes: [
        'id',
        'name',
        'type',
        'address',
        [sequelize.col('contact_info'), 'contact_info'],
        'created_at',
        [sequelize.col('is_active'), 'is_active']
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: { customer }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;