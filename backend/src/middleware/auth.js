require('dotenv').config()
const jwt = require('jsonwebtoken');
const { logSystemAlert } = require('../utils/helpers');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logSystemAlert('error', 'JWT verification failed', error.message);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

module.exports = { authenticateToken };