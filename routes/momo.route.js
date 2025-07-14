const express = require('express');
const crypto = require('crypto');
const https = require('https');
const router = express.Router();
require('dotenv').config();
const Order = require('../models/order.model');

// Tạo thanh toán MoMo
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const redirectUrl = `${process.env.MOMO_RETURN_URL}?orderId=${orderId}`;
    const ipnUrl = process.env.MOMO_NOTIFY_URL;
    const requestId = `${orderId}-${Date.now()}`;
    const requestType = 'payWithMethod';
    const extraData = '';
    const lang = 'vi';
    const autoCapture = true;
    const orderInfo = 'Thanh toán Burger King';
    const partnerName = 'Burger King';
    const storeId = 'BK_STORE_01';
    const orderGroupId = '';

    const rawSignature = 
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName,
      storeId,
      requestId,
      amount: amount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId,
      signature,
    });

    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const momoReq = https.request(options, momoRes => {
      let data = '';
      momoRes.on('data', chunk => data += chunk);
      momoRes.on('end', () => {
        const result = JSON.parse(data);
        console.log('✅ [MoMo] Response:', result);
        res.status(200).json({ payUrl: result.payUrl });
      });
    });

    momoReq.on('error', err => {
      console.error('❌ [MoMo] HTTPS Error:', err.message);
      res.status(500).json({ error: 'Tạo thanh toán thất bại' });
    });

    momoReq.write(requestBody);
    momoReq.end();
  } catch (err) {
    console.error('❌ [MoMo] Exception:', err.message);
    res.status(500).json({ error: 'Tạo thanh toán thất bại' });
  }
});

// Xử lý IPN từ MoMo
router.post('/ipn', async (req, res) => {
  try {
    const data = req.body;
    console.log('📥 [IPN] Dữ liệu MoMo:', data);

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

    const genSig = crypto
      .createHmac('sha256', process.env.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest('hex');

    if (genSig !== data.signature) {
      console.error('❌ [IPN] Sai chữ ký!');
      console.log('[DEBUG] Gen:', genSig);
      console.log('[DEBUG] MoMo:', data.signature);
      return res.status(400).send('Invalid signature');
    }

    if (parseInt(data.resultCode) === 0) {
      const order = await Order.findOne({ orderId: data.orderId });
      if (!order) {
        console.warn(`⚠️ [IPN] Không tìm thấy đơn hàng ${data.orderId}`);
        return res.status(404).send('Order not found');
      }

      if (parseInt(data.amount) !== order.total) {
        console.warn(`⚠️ [IPN] Số tiền không khớp cho ${data.orderId}`);
        return res.status(400).send('Wrong amount');
      }

      order.isPaid = true;
      order.momoTransId = data.transId;
      order.paidAt = new Date();
      await order.save();

      console.log(`✅ [IPN] Đơn hàng ${data.orderId} đã thanh toán`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ [IPN] Lỗi xử lý:', err.message);
    res.status(500).send('Server error');
  }
});

// Trang xác nhận khi redirect từ MoMo
router.get('/return', (req, res) => {
 
  res.send(`
    <h2>🎉 Thanh toán thành công!</h2>
    <p>Bạn có thể đóng trình duyệt và quay lại ứng dụng.</p>
    
  `);
});

module.exports = router;
