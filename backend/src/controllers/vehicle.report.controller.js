const { getDb } = require('../config/db');
const { vehicles } = require('../models/vehicle.model');
const { vehicleMaintenanceLogs } = require('../models/vehicleMaintenanceLog.model');
const { vehicleDocuments } = require('../models/vehicleDocument.model');
const { staff } = require('../models/staff.model');
const { eq, and, count, lt, gt, ne } = require('drizzle-orm');

class VehicleReportController {
  /**
   * Get vehicle reports with maintenance logs and staff assignments
   */
  static async getVehicleReports(req, res) {
    try {
      const db = await getDb(); // Get db instance
      const vehicleData = await db.select({
        id: vehicles.id,
        vehicle_number: vehicles.vehicle_number,
        vehicle_type: vehicles.vehicle_type,
        model_brand: vehicles.model_brand,
        zone_id: vehicles.zone_id,
        staff_id: vehicles.staff_id,
        capacity_kg: vehicles.capacity_kg,
        fuel_type: vehicles.fuel_type,
        fuel_efficiency: vehicles.fuel_efficiency,
        status: vehicles.status,
        staff: {
          name: staff.name,
        },
        vehicleMaintenanceLogs: {
          maintenance_date: vehicleMaintenanceLogs.maintenance_date
        }
      })
      .from(vehicles)
      .leftJoin(staff, eq(vehicles.staff_id, staff.id))
      .leftJoin(vehicleMaintenanceLogs, eq(vehicleMaintenanceLogs.vehicle_id, vehicles.id));

      return res.status(200).json({
        success: true,
        data: vehicleData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle reports',
        error: error.message,
      });
    }
  }

  /**
   * Get vehicle statistics
   */
  static async getVehicleStats(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Count total vehicles
      const totalVehicles = await db.select({ count: count() })
        .from(vehicles);

      // Count active vehicles
      const activeVehicles = await db.select({ count: count() })
        .from(vehicles)
        .where(eq(vehicles.status, 'active'));

      // Get current date
      const currentDate = new Date();
      
      // Count vehicles with expired documents
      const expiredDocuments = await db.select({ count: count() })
        .from(vehicleDocuments)
        .where(lt(vehicleDocuments.expiry_date, currentDate));

      // Count out-of-service vehicles
      const inactiveVehicles = await db.select({ count: count() })
        .from(vehicles)
        .where(eq(vehicles.status, 'inactive'));

      return res.status(200).json({
        success: true,
        data: {
          total_vehicles: totalVehicles[0].count,
          active_vehicles: activeVehicles[0].count,
          expired_documents: expiredDocuments[0].count,
          inactive_vehicles: inactiveVehicles[0].count,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle statistics',
        error: error.message,
      });
    }
  }

  /**
   * Get vehicle status distribution
   */
  static async getVehicleStatusDistribution(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Get all possible statuses
      const statuses = ['active', 'inactive', 'maintenance'];
      
      // Count vehicles by status
      const statusCounts = await Promise.all(statuses.map(async (status) => {
        const result = await db.select({ count: count() })
          .from(vehicles)
          .where(eq(vehicles.status, status));
        
        return {
          status,
          count: result[0].count,
        };
      }));

      return res.status(200).json({
        success: true,
        data: statusCounts,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve vehicle status distribution',
        error: error.message,
      });
    }
  }
}

module.exports = { VehicleReportController };