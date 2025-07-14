const express = require('express');
const router = express.Router();
const PromoCode = require('../models/promo.models');

router.post('/apply', async (req, res) => {
  const { code } = req.body;

  try {
    const promo = await PromoCode.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!promo) {
      return res.status(400).json({ success: false, message: 'Mã không hợp lệ hoặc đã hết hạn.' });
    }

    return res.json({
      success: true,
      discountPercent: promo.discountPercent,
      message: `Áp dụng mã thành công: -${promo.discountPercent}%`
    });
  } catch (err) {
    console.error('Lỗi kiểm tra mã:', err);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

module.exports = router;
