const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercent: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model('PromoCode', promoCodeSchema, 'vouchers');
