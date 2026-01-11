const express = require('express');
const { StaffReportController } = require('../controllers/staff.report.controller');
const { VehicleReportController } = require('../controllers/vehicle.report.controller');
const { WasteReportController } = require('../controllers/waste.report.controller');
const { WasteTypeReportController } = require('../controllers/wasteType.report.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes for Staff report 
router.get('/staff-reports', StaffReportController.getStaffReports);
router.get('/staff-stats', StaffReportController.getStaffStats);

// Routes for vehicle report 
router.get('/vehicle-reports', VehicleReportController.getVehicleReports);
router.get('/vehicle-stats', VehicleReportController.getVehicleStats);
router.get('/vehicle-status-distribution', VehicleReportController.getVehicleStatusDistribution);

// Routes for waste report 
router.get('/waste-reports', WasteReportController.getWasteReports);
router.get('/waste-stats', WasteReportController.getWasteStats);

// Routes for waste type report 
router.get('/waste-type-reports', WasteTypeReportController.getWasteTypeReports);
router.get('/waste-type-distribution', WasteTypeReportController.getWasteTypeDistribution);
router.get('/waste-collection-trends', WasteTypeReportController.getWasteCollectionTrends);

module.exports = router;