const express = require('express');
const { validate, validateParams } = require('../utils/validation');
const { idParamSchema } = require('../utils/validation');
const { SettingsController } = require('../controllers/settings.controller');
const { upload } = require('../middleware/upload');
const { storeSmtpConfigSchema } = require('../validators/smtpConfig.validator');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Routes for company settings
router.get('/settings', SettingsController.getSettings);
router.post(
  '/settings',
  authenticateToken,
  upload.fields([
    { name: 'fav_icon', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
  ]),
  SettingsController.saveCompanySettings
);

// Routes for SMTP configuration
router.get('/smtp-config', authenticateToken, SettingsController.getSmtpConfigs);
router.post('/smtp-config', authenticateToken, validate(storeSmtpConfigSchema), SettingsController.createSmtpConfig
);

// Routes for system alerts
router.get('/system-alert', authenticateToken, SettingsController.getSystemAlerts);
router.delete('/system-alert/:id', authenticateToken, validateParams(idParamSchema), SettingsController.deleteSystemAlert);

module.exports = router;
