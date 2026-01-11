const { getDb } = require('../config/db');
const { assignToRoutes } = require('../models/assignToRoute.model');
const { routes } = require('../models/route.model');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { eq, and, desc } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');

class AssignRouteService {
  /**
   * Fetch all route assignments with related staff, route, and vehicle information
   */
  static async getAllRouteAssignments() {
    try {
      const db = await getDb(); // Get db instance
      const assignments = await db.select({
        id: assignToRoutes.id,
        role: assignToRoutes.role,
        assignment_start_at: assignToRoutes.assignment_start_at,
        shift: assignToRoutes.shift,
        status: assignToRoutes.status,
        created_at: assignToRoutes.created_at,
        updated_at: assignToRoutes.updated_at,
        staff: {
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role
        },
        route: {
          id: routes.id,
          name: routes.name,
          status: routes.status
        },
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type
        }
      })
        .from(assignToRoutes)
        .leftJoin(staff, eq(assignToRoutes.staff_id, staff.id)) // Join with staff table
        .leftJoin(routes, eq(assignToRoutes.route_id, routes.id)) // Join with routes table
        .leftJoin(vehicles, eq(assignToRoutes.vehicle_id, vehicles.id)) // Join with vehicles table
        .orderBy(desc(assignToRoutes.created_at)); // Sort by creation date in descending order

      return assignments;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching route assignments', error.message); 
      throw new Error('Failed to retrieve route assignments');
    }
  }

  /**
   * Fetch a single route assignment by ID
   */
  static async getRouteAssignmentsById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [assignment] = await db.select().from(assignToRoutes).where(eq(assignToRoutes.id, id));
      if (!assignment) {
        throw new Error('Route assignment not found');
      }
      return assignment;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching route assignment', error.message);
      throw new Error('Failed to retrieve route assignment');
    }
  }

  /**
   * Create a new route assignment
   */
  static async createRouteAssignment(assignmentData) {
    try {
      const db = await getDb(); // Get db instance
      const [newAssignment] = await db.insert(assignToRoutes).values({
        ...assignmentData,
        created_at: new Date(),
        updated_at: new Date() 
      });
      return newAssignment;
    } catch (error) {
      await logSystemAlert('error', 'Error creating route assignment', error.message);
      throw new Error('Failed to create route assignment');
    }
  }

  /**
   * Update an existing route assignment
   */
  static async updateRouteAssignment(id, assignmentData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingAssignment] = await db.select().from(assignToRoutes).where(eq(assignToRoutes.id, id));
      if (!existingAssignment) {
        throw new Error('Route assignment not found');
      }

      await db.update(assignToRoutes)
        .set({
          ...assignmentData,
          updated_at: new Date()
        })
        .where(eq(assignToRoutes.id, id));

      return await this.getRouteAssignmentsById(id); // Return updated assignment
    } catch (error) {
      await logSystemAlert('error', 'Error updating route assignment', error.message); 
      throw new Error('Failed to update route assignment');
    }
  }

  /**
   * Delete a route assignment
   */
  static async deleteRouteAssignment(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingAssignment] = await db.select().from(assignToRoutes).where(eq(assignToRoutes.id, id));
      if (!existingAssignment) {
        throw new Error('Route assignment not found');
      }

      await db.delete(assignToRoutes).where(eq(assignToRoutes.id, id)); // Delete route assignment record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting route assignment', error.message);
      throw new Error('Failed to delete route assignment');
    }
  }
}

module.exports = { AssignRouteService };