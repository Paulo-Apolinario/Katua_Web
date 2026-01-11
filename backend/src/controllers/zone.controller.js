const { ZoneService } = require('../services/zone.service');

class ZoneController {
  /**
  * Get all zones
  */
  static async index(req, res) {
    try {
      const zones = await ZoneService.getAllZones();
      res.status(200).json({ success: true, data: zones });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve zones'
      });
    }
  }
  /**
  * Get zone by ID
  */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const zones = await ZoneService.getZoneById(id);
      res.status(200).json({ success: true, data: zones });

    } catch (error) {
      if (error.message === 'Zone not found') {
        return res.status(404).json({
          success: false,
          message: 'Zone not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve route assignments'
      });
    }
  }
  /**
  * Create new zone
  */
  static async create(req, res) {
    try {
      const zoneData = req.body;
      await ZoneService.createZone(zoneData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create zone'
      });
    }
  }
  /**
   * Update zone
  */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const zoneData = req.body;
      await ZoneService.updateZone(id, zoneData);
      res.status(200).json({
        success: true,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Zone not found') {
        return res.status(404).json({
          success: false,
          message: 'Zone not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update zone'
      });
    }
  }
  /**
   * Delete zone
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await ZoneService.deleteZone(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Zone not found') {
        return res.status(404).json({
          success: false,
          message: 'Zone not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete zone'
      });
    }
  }
}

module.exports = { ZoneController };
