const { VehicleService } = require('../services/vehicle.service');

class VehicleController {
  /**
   * Get all vehicles
   */
  static async index(req, res) {
    try {
      const vehicles = await VehicleService.getAllVehicles();
      res.status(200).json({ success: true, data: vehicles });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicles',
      });
    }
  }

  /**
   * Create new vehicle
   */
  static async store(req, res) {
    try {
      const vehicleData = req.body;
      await VehicleService.createVehicle(vehicleData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create vehicle'
      });
    }
  }

  /**
   * Get vehicle by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const vehicle = await VehicleService.getVehicleById(id);
      res.status(200).json({ success: true, data: vehicle });
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle'
      });
    }
  }

  /**
   * Update vehicle
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const vehicleData = req.body;
      const updatedVehicle = await VehicleService.updateVehicle(id, vehicleData);
      res.status(200).json({
        success: true,
        data: updatedVehicle,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle'
      });
    }
  }

  /**
   * Delete vehicle
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await VehicleService.deleteVehicle(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Vehicle not found') {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete vehicle'
      });
    }
  }
}

module.exports = { VehicleController };
