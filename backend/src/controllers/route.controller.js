const { RouteService } =  require('../services/route.service');

class RouteController {
  /**
   * Get all routes
   */
  static async index(req, res) {
    try {
      const routes = await RouteService.getAllRoutes();
      res.status(200).json({ success: true, data: routes });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve routes'
      });
    }
  }

  /**
   * Create new route
   */
  static async store(req, res) {
    try {
      const routeData = req.body;
      await RouteService.createRoute(routeData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create route'
      });
    }
  }

  /**
   * Get route by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const route = await RouteService.getRouteById(id);
      res.status(200).json({ success: true, data: route });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve route'
      });
    }
  }

  /**
   * Update route
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const routeData = req.body;
      const updatedRoute = await RouteService.updateRoute(id, routeData);
      res.status(200).json({
        success: true,
        data: updatedRoute,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Route not found') {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update route'
      });
    }
  }

  /**
   * Delete route
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await RouteService.deleteRoute(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Route not found') {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete route'
      });
    }
  }
}

module.exports = { RouteController };
