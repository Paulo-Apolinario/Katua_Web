const { MaintenanceLogService } = require('../services/maintenanceLog.service');

class MaintenanceLogController {
  /**
   * Get all maintenance logs
   */
  static async index(req, res) {
    try {
      const logs = await MaintenanceLogService.getAllLogs();
      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      console.error('Error fetching maintenance logs:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve maintenance logs',
      });
    }
  }

  /**
   * Create new maintenance log
   */
  static async store(req, res) {
    try {
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }
      const log = await MaintenanceLogService.createLog(data);
      return res.status(201).json({
        success: true,
        data: log,
        message: 'Created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create maintenance log',
      });
    }
  }

  /**
   * Get maintenance log by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const log = await MaintenanceLogService.getLogById(id);
      return res.status(200).json({ success: true, data: log, message: 'Maintenance log retrieved successfully' });
    } catch (error) {
      return res.status(error.message === 'Log not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Log not found' ? 'Log not found' : 'Failed to retrieve maintenance log',
      });
    }
  }

  /**
   * Update maintenance log
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }

      const log = await MaintenanceLogService.updateLog(id, data);
      return res.status(200).json({
        success: true,
        data: log,
        message: 'Updated successfully',
      });
    } catch (error) {
      return res.status(error.message === 'Log not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Log not found' ? 'Log not found' : 'Failed to update maintenance log',
      });
    }
  }

  /**
   * Delete maintenance log
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await MaintenanceLogService.deleteLog(id);
      return res.status(200).json({
        success: true,
        message: 'Deleted successfully',
      });
    } catch (error) {
      return res.status(error.message === 'Log not found' ? 404 : 500).json({
        success: false,
        message: error.message === 'Log not found' ? 'Log not found' : 'Failed to delete maintenance log',
      });
    }
  }
}

module.exports = { MaintenanceLogController };