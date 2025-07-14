// routes/product.js
const express = require('express');
const router = express.Router();
const Product = require('../models/product.model');

// GET /products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find(); // lấy tất cả sản phẩm
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

module.exports = router;
