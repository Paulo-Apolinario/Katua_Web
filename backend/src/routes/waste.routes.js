const express = require('express');
const { validate, validateParams } = require('../utils/validation.js');
const { wasteSchema } = require('../validators/waste.validator.js');
const { binSchema } = require('../validators/bin.validator.js');
const { wasteTypeSchema } = require('../validators/WasteType.validator.js');
const { idParamSchema } = require('../utils/validation.js');
const { WasteController } = require('../controllers/waste.controller.js');
const { BinController } = require('../controllers/bin.controller.js');
const { WasteTypeController } = require('../controllers/wasteType.controller.js');
const { authenticateToken } = require('../middleware/auth.js');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

//Routes for waste 
router.get('/wastes', WasteController.index);
router.post('/wastes', validate(wasteSchema), WasteController.store);
router.get('/wastes/:id', validateParams(idParamSchema), WasteController.show);
router.put('/wastes/:id', validateParams(idParamSchema), validate(wasteSchema), WasteController.update);
router.delete('/wastes/:id', validateParams(idParamSchema), WasteController.destroy);

//Routes for bin 
router.get('/bins', BinController.index);
router.post('/bins', validate(binSchema), BinController.store);
router.get('/bins/:id', validateParams(idParamSchema), BinController.show);
router.put('/bins/:id', validateParams(idParamSchema), validate(binSchema), BinController.update);
router.delete('/bins/:id', validateParams(idParamSchema), BinController.destroy);

//Routes for waste type 
router.get('/waste-types', WasteTypeController.index);
router.post('/waste-types', validate(wasteTypeSchema), WasteTypeController.store);
router.get('/waste-types/:id', validateParams(idParamSchema), WasteTypeController.show);
router.put('/waste-types/:id', validateParams(idParamSchema), validate(wasteTypeSchema), WasteTypeController.update);
router.delete('/waste-types/:id', validateParams(idParamSchema), WasteTypeController.destroy);

module.exports = router;


