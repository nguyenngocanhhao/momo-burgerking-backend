const User = require('../models/user.model');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email đã tồn tại' });

    const hashed = await bcryptjsjs.hash(password, 10);
    const newUser = new User({ name, email, password: hashed, phone });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  const isMatch = await bcryptjs.compare(password, user.password);
if (!user || !isMatch) {
  return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
}

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

res.json({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
  },
});

};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Không lấy được thông tin' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.userId,
      { name, phone },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Không cập nhật được thông tin' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được chọn' });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.userId, { avatar: imageUrl });
    res.status(200).json({ message: 'Upload thành công', avatar: imageUrl });
  } catch {
    res.status(500).json({ message: 'Lỗi khi upload ảnh' });
  }
};

const nodemailer = require('nodemailer');

// Gửi mã OTP qua email
exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Thiếu email' });

  // Tạo mã OTP ngẫu nhiên
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Lưu tạm otp vào RAM (tạm thời), bạn nên lưu vào DB hoặc Redis
  global.otpStore = global.otpStore || {};
  global.otpStore[email] = otp;

  // Gửi email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: `Burger King App <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Mã OTP xác thực',
    text: `Mã OTP của bạn là: ${otp} (có hiệu lực trong 5 phút)`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP đã được gửi tới email' });
  } catch (err) {
    console.error('❌ Lỗi gửi mail:', err);
    res.status(500).json({ error: 'Lỗi gửi mail' });
  }
};

exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = global.otpStore?.[email];

  if (storedOtp && storedOtp === otp) {
    // Xác thực thành công → cho phép đổi mật khẩu
    res.json({ success: true, message: 'OTP hợp lệ' });
  } else {
    res.status(400).json({ success: false, message: 'OTP không đúng' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
  }

  const storedOtp = global.otpStore?.[email];
  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ error: 'OTP không hợp lệ' });
  }

  try {
    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    // Xóa OTP sau khi dùng
    delete global.otpStore[email];

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json({ message: '✅ Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('❌ Lỗi reset mật khẩu:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

    const isMatch = await bcryptjs.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });

    const hashed = await bcryptjs.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    res.status(500).json({ error: 'Đã có lỗi xảy ra khi đổi mật khẩu' });
  }
  console.log(req.body);
};



const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('523944862525-7diln068l6f3jch8o2f9bkvsd1ashaaq.apps.googleusercontent.com'); // Web Client ID

exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Thiếu idToken' });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: client._clientId,
    });

    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: '', // Không có password
        phone: '',
        avatar: picture || '',
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('[Google Login] ❌', err.message);
    res.status(401).json({ error: 'Đăng nhập Google thất bại' });
  }
};
