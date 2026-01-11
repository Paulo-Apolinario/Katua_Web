const express = require('express');
const { validate, validateParams } = require('../utils/validation');
const { idParamSchema } = require('../utils/validation');
const { storeVehicleSchema, updateVehicleSchema } = require('../validators/vehicle.validator');
const { storeMaintenanceLogSchema, updateMaintenanceLogSchema } = require('../validators/maintenanceLog.validator');
const { storeVehicleDocumentSchema, updateVehicleDocumentSchema } = require('../validators/vehicleDocument.validator');
const { VehicleController } = require('../controllers/vehicle.controller');
const { MaintenanceLogController } = require('../controllers/maintenanceLog.controller');
const { VehicleDocumentController } = require('../controllers/vehicleDocument.controller');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

const mapFileToBody = (req, res, next) => {
  if (req.file) {
    req.body.file = req.file.filename;
  } else {
    req.body.file = '';
  }
  next();
};

// Routes for Vehicle
router.get('/vehicles', VehicleController.index);
router.post('/vehicles', validate(storeVehicleSchema), VehicleController.store);
router.get('/vehicles/:id', validateParams(idParamSchema), VehicleController.show);
router.put('/vehicles/:id', validateParams(idParamSchema), validate(updateVehicleSchema), VehicleController.update);
router.delete('/vehicles/:id', validateParams(idParamSchema), VehicleController.destroy);

// Routes for vehicle document
router.get('/vehicle-documents', VehicleDocumentController.index);
router.post('/vehicle-documents', upload.single('file'), mapFileToBody, validate(storeVehicleDocumentSchema), VehicleDocumentController.store);
router.get('/vehicle-documents/:id', validateParams(idParamSchema), VehicleDocumentController.show);
router.post('/vehicle-documents/:id', validateParams(idParamSchema), upload.single('file'), mapFileToBody, validate(updateVehicleDocumentSchema), VehicleDocumentController.update);
router.delete('/vehicle-documents/:id', validateParams(idParamSchema), VehicleDocumentController.destroy);

// Routes for maintenance log
router.get('/maintenance-logs', MaintenanceLogController.index);
router.post('/maintenance-logs', upload.single('file'), mapFileToBody, validate(storeMaintenanceLogSchema), MaintenanceLogController.store);
router.get('/maintenance-logs/:id', validateParams(idParamSchema), MaintenanceLogController.show);
router.post('/maintenance-logs/:id', validateParams(idParamSchema), upload.single('file'), mapFileToBody, validate(updateMaintenanceLogSchema), MaintenanceLogController.update);
router.delete('/maintenance-logs/:id', validateParams(idParamSchema), MaintenanceLogController.destroy);

module.exports = router;
