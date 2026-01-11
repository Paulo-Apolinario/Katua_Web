const { DashboardService } = require('../services/dashboard.service');

class DashboardController {
  /**
   * Get dashboard statistics
   */
  static async dashboardStats(req, res) {
    try {
      const stats = await DashboardService.getDashboardStats();
      return res.status(200).json(stats);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard statistics',
        error: error.message,
      });
    }
  }

  /**
   * Get waste collected per zone
   */
  static async wasteCollectedPerZone(req, res) {
    try {
      const timeRange = req.query.time_range || 'year';
      const result = await DashboardService.getWasteCollectedPerZone(timeRange);
      return res.status(200).json({ data: result });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste collected per zone',
        error: error.message,
      });
    }
  }

  /**
   * Get waste distribution by type
   */
  static async wasteDistribution(req, res) {
    try {
      const distribution = await DashboardService.getWasteDistribution();
      return res.status(200).json({ data: distribution });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste distribution',
        error: error.message,
      });
    }
  }

  /**
   * Get recent wastes
   */
  static async recentWastes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 8;
      const recentWastes = await DashboardService.getRecentWastes(limit);
      return res.status(200).json(recentWastes);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve recent wastes',
        error: error.message,
      });
    }
  }

  /**
   * Get system alerts
   */
  static async systemAlerts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 3;
      const alerts = await DashboardService.getSystemAlerts(limit);
      return res.status(200).json(alerts);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system alerts',
        error: error.message,
      });
    }
  }

  /**
   * Search menu
   */
  static async searchMenu(req, res) {
    try {
      const search = req.query.search;
      const menuItems = await DashboardService.searchMenu(search);
      return res.status(200).json(menuItems);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to search menu',
        error: error.message,
      });
    }
  }
}

module.exports = { DashboardController };