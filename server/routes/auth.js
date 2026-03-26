const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sequelize } = require('../models/db');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [user] = await sequelize.query(
      `SELECT * FROM users WHERE username = :username`,
      {
        replacements: { username },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;