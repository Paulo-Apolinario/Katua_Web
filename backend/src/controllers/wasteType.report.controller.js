const { getDb } = require('../config/db');
const { wastes } = require('../models/waste.model');
const { wasteTypes } = require('../models/wasteType.model');
const { eq, and, count, sum, desc, sql } = require('drizzle-orm');

class WasteTypeReportController {
  /**
   * Get waste type reports with collection data
   */
  static async getWasteTypeReports(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Get all waste types
      const wasteTypeData = await db.select({
        id: wasteTypes.id,
        name: wasteTypes.name,
        status: wasteTypes.status,
        created_at: wasteTypes.created_at,
        updated_at: wasteTypes.updated_at,
      })
      .from(wasteTypes);

      // For each waste type, get collection data
      const wasteTypesWithDetails = await Promise.all(wasteTypeData.map(async (wasteType) => {
        // Get waste collections for this type
        const collections = await db.select({
          id: wastes.id,
          collected_date: wastes.collected_date,
          time_slot: wastes.time_slot,
          quantity: wastes.quantity,
          status: wastes.status,
        })
        .from(wastes)
        .where(eq(wastes.waste_type_id, wasteType.id));


        return {
          ...wasteType,
          collections,
        };
      }));

      return res.status(200).json({
        success: true,
        data: wasteTypesWithDetails,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste type reports',
        error: error.message,
      });
    }
  }

  /**
   * Get waste type distribution
   */
  static async getWasteTypeDistribution(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Get all waste types
      const wasteTypeData = await db.select({
        id: wasteTypes.id,
        name: wasteTypes.name,
        status: wasteTypes.status,
        created_at: wasteTypes.created_at,
        updated_at: wasteTypes.updated_at,
      })
      .from(wasteTypes);

      // For each waste type, calculate total quantity
      const distribution = await Promise.all(wasteTypeData.map(async (wasteType) => {
        const result = await db.select({ total: sum(wastes.quantity) })
          .from(wastes)
          .where(eq(wastes.waste_type_id, wasteType.id));

        return {
          waste_type: wasteType.name,
          total_quantity: result[0].total || 0,
        };
      }));

      // Sort by total quantity in descending order
      distribution.sort((a, b) => b.total_quantity - a.total_quantity);

      return res.status(200).json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste type distribution',
        error: error.message,
      });
    }
  }

  /**
   * Get waste collection trends
   */
  static async getWasteCollectionTrends(req, res) {
    try {
      const db = await getDb(); // Get db instance
      // Get all waste types
      const wasteTypeData = await db.select({
        id: wasteTypes.id,
        name: wasteTypes.name,
        status: wasteTypes.status,
        created_at: wasteTypes.created_at,
        updated_at: wasteTypes.updated_at,
      })
      .from(wasteTypes);

      // For each waste type, get monthly collection data
      const trends = await Promise.all(wasteTypeData.map(async (wasteType) => {
        // to group by month and year properly
        const collections = await db.select({
          collected_date: wastes.collected_date,
          quantity: wastes.quantity,
        })
        .from(wastes)
        .where(eq(wastes.waste_type_id, wasteType.id));

        // Group collections by month
        const monthlyData = {};
        collections.forEach(collection => {
          if (!collection.collected_date) return;
          
          const date = new Date(collection.collected_date);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = 0;
          }
          
          monthlyData[monthYear] += collection.quantity || 0;
        });

        // Convert to array format
        const monthlyTrend = Object.entries(monthlyData).map(([month, quantity]) => ({
          month,
          quantity,
        }));

        // Sort by month
        monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));

        return {
          waste_type: wasteType.name,
          monthly_trend: monthlyTrend,
        };
      }));

      return res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve waste collection trends',
        error: error.message,
      });
    }
  }
}

module.exports = { WasteTypeReportController };