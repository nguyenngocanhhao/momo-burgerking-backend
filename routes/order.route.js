const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');

router.post('/create', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.json({ message: 'Tạo đơn hàng thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Tạo đơn hàng thất bại', details: err.message });
  }
});

module.exports = router;
