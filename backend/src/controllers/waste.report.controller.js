const { getDb } = require('../config/db');
const { wastes } = require('../models/waste.model');
const { wasteTypes } = require('../models/wasteType.model');
const { zones } = require('../models/zone.model');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { bins } = require('../models/bin.model');
const { eq, and, count, sum, avg } = require('drizzle-orm');

class WasteReportController {
  /**
   * Get waste reports with associated data
  */
  static async getWasteReports(req, res) {
    try {
      const db = await getDb(); // Get db instance
      const wasteData = await db.select({
        id: wastes.id,
        collected_date: wastes.collected_date,
        time_slot: wastes.time_slot,
        quantity: wastes.quantity,
        special_instructions: wastes.special_instructions,
        status: wastes.status,
        created_at: wastes.created_at,
        updated_at: wastes.updated_at,
        zone: {
          id: zones.id,
          name: zones.name,
          area_names: zones.area_names,
          zone_type: zones.zone_type,
        },
        waste_type: {
          id: wasteTypes.id,
          name: wasteTypes.name,
          status: wasteTypes.status,
        },
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type,
        },
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
        },
        bin: {
          id: bins.id,
          bin_id: bins.bin_id,
          location: bins.location,
          bin_type: bins.bin_type,
        },
      })
      .from(wastes)
      .leftJoin(zones, eq(wastes.zone_id, zones.id))
      .leftJoin(wasteTypes, eq(wastes.waste_type_id, wasteTypes.id))
      .leftJoin(vehicles, eq(wastes.vehicle_id, vehicles.id))
      .leftJoin(staff, eq(wastes.staff_id, staff.id))
      .leftJoin(bins, eq(wastes.bin_id, bins.id));

      // Format the data for display
      const formattedData = wasteData.map(waste => ({
        id: waste.id,
        collected_date: waste.collected_date,
        time_slot: waste.time_slot,
        quantity: waste.quantity,
        special_instructions: waste.special_instructions,
        status: waste.status,
        created_at: waste.created_at,
        updated_at: waste.updated_at,
        zone: waste.zone,
        waste_type: waste.waste_type,
        vehicle: waste.vehicle,
        staff: waste.staff,
        bin: waste.bin,
      }));

      return res.status(200).json({
        success: true,
        data: formattedData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste reports',
        error: error.message,
      });
    }
  }

  /**
   * Get waste statistics
   */
  static async getWasteStats(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Count total collections
      const totalCollections = await db.select({ count: count() })
        .from(wastes);

      // Calculate total quantity of waste
      const totalQuantity = await db.select({ total: sum(wastes.quantity) })
        .from(wastes);

      // Calculate monthly average quantity
      const monthlyAverage = await db.select({ average: avg(wastes.quantity) })
        .from(wastes);

      return res.status(200).json({
        success: true,
        data: {
          total_collections: totalCollections[0].count,
          total_quantity: totalQuantity[0].total || 0,
          monthly_average: monthlyAverage[0].average || 0,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste statistics',
        error: error.message,
      });
    }
  }
}

module.exports = { WasteReportController };