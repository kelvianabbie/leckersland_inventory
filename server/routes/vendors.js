const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const { sequelize } = require('../models/db');

router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const whereClause = includeInactive
      ? {}
      : { isActive: true };

    const vendors = await Vendor.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
      attributes: [
        'id',
        'name',
        'address',
        [sequelize.col('contact_info'), 'contact_info'],
        'created_at',
        [sequelize.col('is_active'), 'is_active']
      ]
    });

    res.json({ success: true, data: { vendors } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact_info, address } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Vendor name is required'
      });
    }

    const vendor = await Vendor.create({
      name,
      contact_info,
      address
    });

    res.json({ success: true, data: { vendor } });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_info, address } = req.body;

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    await vendor.update({ name, contact_info, address });

    res.json({ success: true, data: { vendor } });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/deactivate', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    vendor.is_active = false;
    await vendor.save();

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/reactivate', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    vendor.is_active = true;
    await vendor.save();

    res.json({ success: true, data: vendor });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;