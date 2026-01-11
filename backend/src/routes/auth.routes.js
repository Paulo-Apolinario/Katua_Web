const express = require('express');
const { validate } = require('../utils/validation');
const { 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema 
} = require('../validators/auth.validator');
const { AuthController } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

function mapFileToBody(req, res, next) {
  if (req.file) {
    req.body.file = req.file.filename;
  } else {
    req.body.file = ''; 
  }
  next();
}

// Public routes
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

// Protected routes
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/profile/update', authenticateToken, upload.single('image'), mapFileToBody, validate(updateProfileSchema), AuthController.updateProfile);
router.post('/password/update', authenticateToken, validate(updatePasswordSchema), AuthController.updatePassword);
router.post('/logout', authenticateToken, AuthController.logout);

module.exports = router;