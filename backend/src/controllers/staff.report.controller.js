const { getDb } = require('../config/db');
const { staff } = require('../models/staff.model');
const { vehicles } = require('../models/vehicle.model');
const { assignToRoutes } = require('../models/assignToRoute.model');
const { routes } = require('../models/route.model');
const { eq, and, count, desc } = require('drizzle-orm');

class StaffReportController {
  /**
   * Get staff reports with vehicle and route assignments
   */
  static async getStaffReports(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Fetch staff with vehicle information
      const staffData = await db.select({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_role: staff.role,
        staff_status: staff.status,
        vehicle_number: vehicles.vehicle_number,
      })
      .from(staff)
      .leftJoin(vehicles, eq(staff.vehicle_id, vehicles.id));

      // Handle case where no staff data is found
      if (!staffData || staffData.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'No staff records found',
        });
      }

      // staff data and fetch assignments separately
      const formattedData = await Promise.all(staffData.map(async (staffMember, index) => {
        // Fetch the latest assignment for this staff member
        const [latestAssignment] = await db.select({
          assign_id: assignToRoutes.id,
          route_id: assignToRoutes.route_id,
          status: assignToRoutes.status,
          created_at: assignToRoutes.created_at,
          route_name: routes.name,
        })
        .from(assignToRoutes)
        .leftJoin(routes, eq(assignToRoutes.route_id, routes.id))
        .where(eq(assignToRoutes.staff_id, staffMember.staff_id))
        .orderBy(desc(assignToRoutes.created_at))
        .limit(1);

        // Count completed routes for this staff member
        const completedRoutesCount = await db.select({ count: count() })
          .from(assignToRoutes)
          .where(
            and(
              eq(assignToRoutes.staff_id, staffMember.staff_id),
              eq(assignToRoutes.status, 'completed')
            )
          );

        return {
          sn: index + 1,
          name: staffMember.staff_name,
          role: staffMember.staff_role,
          routes_completed: completedRoutesCount[0]?.count || 0,
          assigned_route: latestAssignment ? latestAssignment.route_name : 'N/A',
          vehicle_number: staffMember.vehicle_number || 'N/A',
          status: staffMember.staff_status,
        };
      }));

      return res.status(200).json({
        success: true,
        data: formattedData,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff list',
        error: error.message,
      });
    }
  }

  static async getStaffList(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Query staff with their vehicle and route assignments
      const staffData = await db.select({
        staff_id: staff.id,
        staff_name: staff.name,
        staff_role: staff.role,
        staff_status: staff.status,
        vehicle_number: vehicles.vehicle_number,
        assignToRoutes: db.select({
          assign_id: assignToRoutes.id,
          route_id: assignToRoutes.route_id,
          status: assignToRoutes.status,
          created_at: assignToRoutes.created_at,
          route_name: routes.name,
        })
          .from(assignToRoutes)
          .leftJoin(routes, eq(assignToRoutes.route_id, routes.id))
          .where(eq(assignToRoutes.staff_id, staff.id))
          .as('assignToRoutes'),
      })
      .from(staff)
      .leftJoin(vehicles, eq(staff.vehicle_id, vehicles.id));

      // Process the data to match the Laravel output
      const formattedData = staffData.map((staffMember, index) => {
        // Sort assignments by created_at in descending order and get the latest
        const latestAssignment = staffMember.assignToRoutes
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        // Count completed routes
        const routesCompleted = staffMember.assignToRoutes.filter(
          assignment => assignment.status === 'completed'
        ).length;

        return {
          sn: index + 1,
          name: staffMember.staff_name,
          role: staffMember.staff_role,
          routes_completed: routesCompleted,
          assigned_route: latestAssignment ? latestAssignment.route_name : 'N/A',
          vehicle_number: staffMember.vehicle_number || 'N/A',
          status: staffMember.staff_status,
        };
      });

      return res.status(200).json({
        success: true,
        data: formattedData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff list',
        error: error.message,
      });
    }
  }

  /**
   * Get staff statistics
   */
  static async getStaffStats(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Count total staff
      const totalStaff = await db.select({ count: count() })
        .from(staff);

      // Count active staff
      const activeStaff = await db.select({ count: count() })
        .from(staff)
        .where(eq(staff.status, 'active'));

      // Count completed routes
      const completedRoutes = await db.select({ count: count() })
        .from(assignToRoutes)
        .where(eq(assignToRoutes.status, 'completed'));

      return res.status(200).json({
        success: true,
        data: {
          total_staff: totalStaff[0].count,
          active_staff: activeStaff[0].count,
          completed_routes: completedRoutes[0].count,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff statistics',
        error: error.message,
      });
    }
  }
}

module.exports = { StaffReportController };