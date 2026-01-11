const { BinService } = require('../services/bin.service');

class BinController {
  /**
   * Get all bins
   */
  static async index(req, res) {
    try {
      const bins = await BinService.getAllBins();
      res.status(200).json({ success: true, data: bins });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bins'
      });
    }
  }

  /**
   * Create new bin
   */
  static async store(req, res) {
    try {
      const binData = req.body;
      await BinService.createBin(binData);
      res.status(201).json({ success: true, message: 'Bin created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create bin'
      });
    }
  }

  /**
   * Get bin by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const bin = await BinService.getBinById(id);
      res.status(200).json({ success: true, data: bin });
    } catch (error) {
      if (error.message === 'Bin not found') {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bin'
      });
    }
  }

  /**
   * Update bin
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const binData = req.body;
      const updatedBin = await BinService.updateBin(id, binData);
      res.status(200).json({
        success: true,
        data: updatedBin,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Bin not found') {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update bin'
      });
    }
  }

  /**
   * Delete bin
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await BinService.deleteBin(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Bin not found') {
        return res.status(404).json({
          success: false,
          message: 'Bin not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete bin'
      });
    }
  }
}

module.exports = { BinController };
