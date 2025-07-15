const express = require('express');
const crypto = require('crypto');
const https = require('https');
const router = express.Router();
require('dotenv').config();
const Order = require('../models/order.model');

// 🎯 Route: Tạo thanh toán MoMo
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const baseReturnUrl = process.env.MOMO_RETURN_URL;
    const ipnUrl = process.env.MOMO_NOTIFY_URL;
    const redirectUrl = `${baseReturnUrl}?orderId=${orderId}`;

    const requestId = `${orderId}-${Date.now()}`;
    const requestType = 'payWithMethod';
    const extraData = '';
    const lang = 'vi';
    const autoCapture = true;
    const orderInfo = 'Thanh toán đơn hàng Burger King';
    const partnerName = 'Burger King';
    const storeId = 'BK_STORE_01';
    const orderGroupId = '';

    // rawSignature theo chuẩn payWithMethod
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
        console.log('✅ [MoMo] Tạo thanh toán:', result);
        return res.status(200).json({ payUrl: result.payUrl });
      });
    });

    momoReq.on('error', err => {
      console.error('❌ [MoMo] Lỗi HTTPS:', err.message);
      return res.status(500).json({ error: 'Tạo thanh toán thất bại' });
    });

    momoReq.write(requestBody);
    momoReq.end();
  } catch (err) {
    console.error('❌ [MoMo] Exception:', err.message);
    res.status(500).json({ error: 'Tạo thanh toán thất bại' });
  }
});

router.get('/return', (req, res) => {
  const orderId = req.query.orderId || 'N/A';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Đang chuyển hướng...</title>
      <script>
        window.location.href = "burgerking://payment-success?orderId=${orderId}";
      </script>
    </head>
    <body>
    </body>
    </html>
  `);
});


// ✅ IPN: vẫn giữ nguyên nếu sau này muốn dùng lại app MoMo
router.post('/ipn', async (req, res) => {
  try {
    const data = req.body;
    console.log('📥 [IPN MoMo] Nhận:', data);

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
      return res.status(400).send('Invalid signature');
    }

    if (parseInt(data.resultCode) === 0) {
      const result = await Order.updateOne(
        { orderId: data.orderId },
        { $set: { isPaid: true, momoTransId: data.transId } }
      );

      console.log('📦 [IPN] Đã cập nhật đơn hàng:', result);

      if (result.modifiedCount > 0) {
        console.log(`✅ Đơn hàng ${data.orderId} đã thanh toán`);
      } else {
        console.warn(`⚠️ Không tìm thấy đơn hàng ${data.orderId}`);
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ [IPN] Lỗi xử lý:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
