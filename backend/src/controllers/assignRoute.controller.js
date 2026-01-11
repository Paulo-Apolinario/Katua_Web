const { AssignRouteService } = require('../services/assignRoute.service');

class AssignRouteController {
  /**
  * Get all route assignments
  */
  static async index(req, res) {
    try {
      const assignments = await AssignRouteService.getAllRouteAssignments();
      res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve route assignments'
      });
    }
  }
  
  /**
   * Get route assignment by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const assignments = await AssignRouteService.getRouteAssignmentsById(id);
      res.status(200).json({ success: true, data: assignments });

    } catch (error) {
      if (error.message === 'Route assignments not found') {
        return res.status(404).json({
          success: false,
          message: 'route assignments not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve route assignments'
      });
    }
  }

  /**
  * Create new route assignment
  */
  static async create(req, res) {
    try {
      const assignmentData = req.body;
      await AssignRouteService.createRouteAssignment(assignmentData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create route assignment'
      });
    }
  }

  /**
   * Update route assignment
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const assignmentData = req.body;
      await AssignRouteService.updateRouteAssignment(id, assignmentData);
      res.status(200).json({
        success: true,
        message: 'updated successfully'
      });
    } catch (error) {
      if (error.message === 'Route assignment not found') {
        return res.status(404).json({
          success: false,
          message: 'Route assignment not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update route assignment'
      });
    }
  }

  /**
   * Delete route assignment
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await AssignRouteService.deleteRouteAssignment(id);
      res.status(200).json({
        success: true,
        message: 'Route assignment deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Route assignment not found') {
        return res.status(404).json({
          success: false,
          message: 'Route assignment not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete route assignment'
      });
    }
  }
}

module.exports = { AssignRouteController };
