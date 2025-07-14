const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');

// Auth
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Profile
router.get('/me', auth, userController.getUserProfile);
router.put('/me', auth, userController.updateUserProfile);
router.post('/me/avatar', auth, upload.single('avatar'), userController.uploadAvatar);

// Forgot password flow
router.post('/send-otp', userController.sendOTP);
router.post('/verify-otp', userController.verifyOTP);
router.post('/reset-password', userController.resetPassword);

// Change password
router.post('/change-password', auth, userController.changePassword);
router.post('/google-login', userController.googleLogin);

module.exports = router;

const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const googleClient = new OAuth2Client('523944862525-7diln068l6f3jch8o2f9bkvsd1ashaaq.apps.googleusercontent.com');

router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Thiếu idToken' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClient._clientId,
    });

    const payload = ticket.getPayload();
    const { name, email, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: '',
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
});
