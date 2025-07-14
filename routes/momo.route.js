const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
require('dotenv').config();
const Order = require('../models/order.model'); // điều chỉnh path nếu khác

// 🎯 B1. Tạo thanh toán
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const redirectUrl = process.env.MOMO_RETURN_URL;
    const ipnUrl = process.env.MOMO_NOTIFY_URL;
    const requestType = 'captureWallet';
    const orderInfo = 'ThanhToanBurgerKing';
    const requestId = `${orderId}-${Date.now()}`;
    const extraData = '';
    const lang = 'vi';

    const rawSignature = 
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang,
    };

    console.log('\n========== [MoMo Payment Request] ==========');
    console.log('🔐 rawSignature:', rawSignature);
    console.log('🧾 signature:', signature);
    console.log('📦 full body:', body);

    const response = await axios.post(process.env.MOMO_ENDPOINT, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    return res.status(200).json({ payUrl: response.data.payUrl });
  } catch (err) {
    console.error('❌ [MoMo] Lỗi tạo thanh toán:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Tạo thanh toán thất bại', detail: err.message });
  }
});


router.post('/ipn', async (req, res) => {
  try {
    const data = req.body;

    const rawSignature =
      `accessKey=${process.env.MOMO_ACCESS_KEY}` +
      `&amount=${data.amount}` +
      `&extraData=${data.extraData}` +
      `&message=${data.message}` +
      `&orderId=${data.orderId}` +
      `&orderInfo=${data.orderInfo}` +
      `&orderType=${data.orderType}` +
      `&partnerCode=${data.partnerCode}` +
      `&payType=${data.payType}` +
      `&requestId=${data.requestId}` +
      `&responseTime=${data.responseTime}` +
      `&resultCode=${data.resultCode}` +
      `&transId=${data.transId}`;

    const signature = crypto
      .createHmac('sha256', process.env.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest('hex');

    if (signature !== data.signature) {
      console.error('[IPN] ❌ Sai chữ ký');
      return res.status(400).send('Invalid signature');
    }

    if (data.resultCode === 0) {
      // ✅ Đơn hàng đã thanh toán
      await Order.updateOne(
        { orderId: data.orderId }, // hoặc { orderCode: data.orderId } nếu chưa đổi tên
        { $set: { isPaid: true } }
      );
      console.log(`[IPN] ✅ Cập nhật đơn ${data.orderId} -> Đã thanh toán`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[IPN] ❌ Lỗi:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
