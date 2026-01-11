const express = require('express');
const { validate, validateParams } = require('../utils/validation');
const { idParamSchema } = require('../utils/validation');
const { storeStaffSchema, updateStaffSchema } = require('../validators/staff.validator');
const { storeStaffAttendanceSchema, updateStaffAttendanceSchema } = require('../validators/staffAttendance.validator');
const { storeStaffDocumentSchema, updateStaffDocumentSchema } = require('../validators/staffDocument.validator');
const { StaffController } = require('../controllers/staff.controller');
const { StaffAttendanceController } = require('../controllers/staffAttendance.controller');
const { StaffDocumentController } = require('../controllers/staffDocument.controller');
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

// Routes for staff
router.get('/staff', StaffController.index);
router.post('/staff', upload.single('file'), mapFileToBody, validate(storeStaffSchema), StaffController.store);
router.get('/staff/:id', validateParams(idParamSchema), StaffController.show);
router.post('/staff/:id', validateParams(idParamSchema), upload.single('file'), mapFileToBody, validate(updateStaffSchema), StaffController.update);
router.delete('/staff/:id', validateParams(idParamSchema), StaffController.destroy);

// Routes for staff attendance
router.get('/staff-attendance', StaffAttendanceController.index);
router.post('/staff-attendance', validate(storeStaffAttendanceSchema), StaffAttendanceController.store);
router.get('/staff-attendance/:id', validateParams(idParamSchema), StaffAttendanceController.show);
router.put('/staff-attendance/:id', validateParams(idParamSchema), validate(updateStaffAttendanceSchema), StaffAttendanceController.update);
router.delete('/staff-attendance/:id', validateParams(idParamSchema), StaffAttendanceController.destroy);

// Routes for staff document
router.get('/staff-documents', StaffDocumentController.index);
router.post('/staff-documents', upload.single('file'), mapFileToBody, validate(storeStaffDocumentSchema), StaffDocumentController.store);
router.get('/staff-documents/:id', validateParams(idParamSchema), StaffDocumentController.show);
router.post('/staff-documents/:id', validateParams(idParamSchema), upload.single('file'), mapFileToBody, validate(updateStaffDocumentSchema), StaffDocumentController.update);
router.delete('/staff-documents/:id', validateParams(idParamSchema), StaffDocumentController.destroy);

module.exports = router;
module.exports.mapFileToBody = mapFileToBody;
