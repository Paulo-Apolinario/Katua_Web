const { WasteService } = require('../services/waste.service');

class WasteController {
  /**
   * Get all wastes
  */
  static async index(req, res) {
    try {
      const wastes = await WasteService.getAllWastes();
      res.status(200).json({ success: true, data:wastes  });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve wastes'
      });
    }
  }

  /**
   * Create new waste
  */
  static async store(req, res) {
    try {
      const wasteData = req.body;
      await WasteService.createWaste(wasteData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create waste'
      });
    }
  }

  /**
   * Get waste by ID
  */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const waste = await WasteService.getWasteById(id);
      res.status(200).json({ success: true, data: waste });
    } catch (error) {
      if (error.message === 'Waste not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste'
      });
    }
  }

  /**
   * Update waste
  */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const wasteData = req.body;
      const updatedWaste = await WasteService.updateWaste(id, wasteData);
      res.status(200).json({
        success: true,
        data: updatedWaste,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Waste not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update waste'
      });
    }
  }

  /**
   * Delete waste
  */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await WasteService.deleteWaste(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Waste not found') {
        return res.status(404).json({
          success: false,
          message: 'Waste not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete waste'
      });
    }
  }
}

module.exports = { WasteController };
