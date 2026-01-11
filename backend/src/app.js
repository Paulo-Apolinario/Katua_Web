const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sanitizeRequest } = require('./middleware/sanitize');
const { testConnection } = require('./config/db');
const { logSystemAlert } = require('./utils/helpers');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const routeRoutes = require('./routes/route.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const staffRoutes = require('./routes/staff.routes');
const wasteRoutes = require('./routes/waste.routes');
const settingRoutes = require('./routes/settings.routes');
const reportRoutes = require('./routes/reports.routes');

const app = express();

// Test database connection
(async () => {
  await testConnection();
})();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));


app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sanitize body/query/params to mitigate XSS vectors
app.use(sanitizeRequest);

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api', authRoutes);
app.use('/api', settingRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', routeRoutes);
app.use('/api', vehicleRoutes);
app.use('/api', staffRoutes);
app.use('/api', wasteRoutes);
app.use('/api', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(async (error, req, res, next) => {
  console.error('Global error:', error);
  
  // Log system alert
  try {
    await logSystemAlert('error', 'Global error occurred', error.message);
  } catch (logError) {
    console.error('Failed to log system alert:', logError);
  }
  
  // Determine error status
  let statusCode = 500;
  let message = 'Internal server error';
  
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden access';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  }
  
  const response = {
    success: false,
    message: message
  };
  if (process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }
  res.status(statusCode).json(response);
});

module.exports = app;