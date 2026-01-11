const { WasteTypeService } = require('../services/wasteType.service');

class WasteTypeController {
  /**
   * Get all waste types
   */
  static async index(req, res) {
    try {
      const wasteTypes = await WasteTypeService.getAllWasteTypes();
      res.status(200).json({ success: true, data: wasteTypes });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste types'
      });
    }
  }

  /**
   * Create a new waste type
   */
  static async store(req, res) {
    try {
      const wasteTypeData = req.body;
      await WasteTypeService.createWasteType(wasteTypeData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create waste type'
      });
    }
  }

  /**
   * Get waste type by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const wasteType = await WasteTypeService.getWasteTypeById(id);
      res.status(200).json({ success: true, data: wasteType });
    } catch (error) {
      if (error.message === 'Waste type not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste type not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste type'
      });
    }
  }

  /**
   * Update waste type
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const wasteTypeData = req.body;
      const updatedWasteType = await WasteTypeService.updateWasteType(id, wasteTypeData);
      res.status(200).json({
        success: true,
        data: updatedWasteType,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Waste type not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste type not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update waste type'
      });
    }
  }

  /**
   * Delete waste type
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await WasteTypeService.deleteWasteType(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Waste type not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste type not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete waste type'
      });
    }
  }
}

module.exports = { WasteTypeController };
