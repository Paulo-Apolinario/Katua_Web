const express = require('express');
const { DashboardController } = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Dashboard routes
router.get('/dashboard-stats', DashboardController.dashboardStats);
router.get('/waste-collected-per-zone', DashboardController.wasteCollectedPerZone);
router.get('/waste-distribution', DashboardController.wasteDistribution);
router.get('/recent-wastes', DashboardController.recentWastes);
router.get('/system-alerts', DashboardController.systemAlerts);
router.get('/menu-links', DashboardController.searchMenu);

module.exports = router;