const { getDb } = require('../config/db');
const { routes } = require('../models/route.model');
const { zones } =  require('../models/zone.model');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { eq, and, desc } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');

class RouteService {
  /**
   * Fetch all routes with related zone, vehicle, and staff information
   */
  static async getAllRoutes() {
    try {
      const db = await getDb(); // Get db instance
      const allRoutes = await db.select({
        id: routes.id,
        name: routes.name,
        start_location: routes.start_location,
        end_location: routes.end_location,
        waypoints: routes.waypoints,
        estimated_distance: routes.estimated_distance,
        estimated_time: routes.estimated_time,
        special_instructions: routes.special_instructions,
        status: routes.status,
        created_at: routes.created_at,
        updated_at: routes.updated_at,
        zone: {
          id: zones.id,
          name: zones.name,
          status: zones.status
        },
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type
        },
        staff: {
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role
        }
      })
        .from(routes)
        .leftJoin(zones, eq(routes.zone_id, zones.id)) // Join with zones table
        .leftJoin(vehicles, eq(routes.vehicle_id, vehicles.id)) // Join with vehicles table
        .leftJoin(staff, eq(routes.staff_id, staff.id)) // Join with staff table
        .orderBy(desc(routes.created_at)); // Sort by creation date in descending order

      return allRoutes;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching routes', error.message);
      throw new Error('Failed to retrieve routes');
    }
  }

  /**
   * Fetch a single route by ID
   */
  static async getRouteById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [route] = await db.select().from(routes).where(eq(routes.id, id));
      if (!route) {
        throw new Error('Route not found');
      }
      return route;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching route', error.message);
      throw new Error('Failed to retrieve route');
    }
  }

  /**
   * Create a new route
   */
  static async createRoute(routeData) {
    try {
      const db = await getDb(); // Get db instance
      const [newRoute] = await db.insert(routes).values({
        ...routeData,
        created_at: new Date(),
        updated_at: new Date()
      });
      return newRoute;
    } catch (error) {
      await logSystemAlert('error', 'Error creating route', error.message);
      throw new Error('Failed to create route');
    }
  }

  /**
   * Update an existing route
   */
  static async updateRoute(id, routeData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingRoute] = await db.select().from(routes).where(eq(routes.id, id));
      if (!existingRoute) {
        throw new Error('Route not found');
      }

      await db.update(routes)
        .set({
          ...routeData,
          updated_at: new Date()
        })
        .where(eq(routes.id, id));

      return await this.getRouteById(id); // Return updated route
    } catch (error) {
      await logSystemAlert('error', 'Error updating route', error.message);
      throw new Error('Failed to update route');
    }
  }

  /**
   * Delete a route
   */
  static async deleteRoute(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingRoute] = await db.select().from(routes).where(eq(routes.id, id));
      if (!existingRoute) {
        throw new Error('Route not found');
      }

      await db.delete(routes).where(eq(routes.id, id)); // Delete route record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting route', error.message);
      throw new Error('Failed to delete route');
    }
  }
}

module.exports = { RouteService };