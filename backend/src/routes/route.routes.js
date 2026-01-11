const express = require('express');
const { validate, validateParams } = require('../utils/validation');
const { idParamSchema } = require('../utils/validation');
const { storeRouteSchema, updateRouteSchema } = require('../validators/route.validator');
const { storeZoneSchema, updateZoneSchema } = require('../validators/zone.validator');
const { storeAssignToRouteSchema, updateAssignToRouteSchema } = require('../validators/assignRoute.validator');
const { RouteController } = require('../controllers/route.controller');
const { ZoneController } = require('../controllers/zone.controller');
const { AssignRouteController } = require('../controllers/assignRoute.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Routes 
router.get('/routes', RouteController.index);
router.post('/routes', validate(storeRouteSchema), RouteController.store); 
router.get('/routes/:id', validateParams(idParamSchema), RouteController.show); 
router.put('/routes/:id', validateParams(idParamSchema), validate(updateRouteSchema), RouteController.update); 
router.delete('/routes/:id', validateParams(idParamSchema), RouteController.destroy); 

// Routes for zones 
router.get('/zones', ZoneController.index); 
router.post('/zones', validate(storeZoneSchema), ZoneController.create); 
router.get('/zones/:id', validateParams(idParamSchema), ZoneController.show); 
router.put('/zones/:id', validateParams(idParamSchema), validate(updateZoneSchema), ZoneController.update); 
router.delete('/zones/:id', validateParams(idParamSchema), ZoneController.delete); 

// Routes for route assignments 
router.get('/route-assignments', AssignRouteController.index); 
router.post('/route-assignments', validate(storeAssignToRouteSchema), AssignRouteController.create); 
router.get('/route-assignments/:id', validateParams(idParamSchema), AssignRouteController.show); 
router.put('/route-assignments/:id', validateParams(idParamSchema), validate(updateAssignToRouteSchema), AssignRouteController.update); 
router.delete('/route-assignments/:id', validateParams(idParamSchema), AssignRouteController.delete);

module.exports = router;
