const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const authValidator = require('../validators/authValidator');

router.post('/register', authValidator.register, AuthController.register);
router.post('/login', authValidator.login, AuthController.login);
router.get('/me', protect, AuthController.me);
router.post('/refresh', authValidator.refreshToken, AuthController.refreshToken);

module.exports = router;