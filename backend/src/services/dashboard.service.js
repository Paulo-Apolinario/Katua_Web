const { getDb } = require('../config/db');
const { wastes } = require('../models/waste.model');
const { vehicles } = require('../models/vehicle.model');
const { bins } = require('../models/bin.model');
const { staff } = require('../models/staff.model');
const { systemAlerts } = require('../models/systemAlert.model');
const { wasteTypes } = require('../models/wasteType.model');
const { zones } = require('../models/zone.model');
const { menus } = require('../models/menu.model');
const { eq, and, count, sum, like, desc, gte, lte } = require('drizzle-orm');

class DashboardService {

  // Returns dashboard statistics such as total waste collected, number of vehicles, bins, and staff
  static async getDashboardStats() {
    const db = await getDb(); 
    // Get total collected waste quantity
    const wasteCollectedResult = await db.select({ total: sum(wastes.quantity) }).from(wastes).where(eq(wastes.status, 'collected'));
    const wasteCollected = wasteCollectedResult[0]?.total || 0;

    // Get total and active vehicles
    const totalVehicles = await db.select({ count: count() }).from(vehicles);
    const activeVehicles = await db.select({ count: count() }).from(vehicles).where(eq(vehicles.status, 'active'));

    // Get active bins
    const activeBins = await db.select({ count: count() }).from(bins).where(eq(bins.status, 'active'));

    // Get total and active staff
    const totalStaff = await db.select({ count: count() }).from(staff);
    const activeStaff = await db.select({ count: count() }).from(staff).where(eq(staff.status, 'active'));

    // Return structured dashboard stats
    return {
      waste_collected: Number(wasteCollected).toFixed(2),
      vehicles: {
        active: activeVehicles[0].count,
        total: totalVehicles[0].count,
      },
      bins: {
        active: activeBins[0].count,
      },
      staff: {
        active: activeStaff[0].count,
        total: totalStaff[0].count,
      },
    };
  }

  // Returns waste collection data grouped by zone and month for a given time range
  static async getWasteCollectedPerZone(timeRange) {
    const db = await getDb(); 
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let startDate = new Date(currentYear, 0, 1);

    // Adjust start date based on selected time range
    if (timeRange === '6months') {
      startDate = new Date(currentDate);
      startDate.setMonth(currentDate.getMonth() - 6);
    } else if (timeRange === '3months') {
      startDate = new Date(currentDate);
      startDate.setMonth(currentDate.getMonth() - 3);
    } else if (timeRange === '1month') {
      startDate = new Date(currentDate);
      startDate.setMonth(currentDate.getMonth() - 1);
    }

    // Query waste data grouped by month and zone
    const wasteData = await db.select({
      collected_date: wastes.collected_date,
      zone_id: wastes.zone_id,
      quantity: wastes.quantity,
      zone_name: zones.name,
    })
    .from(wastes)
    .leftJoin(zones, eq(wastes.zone_id, zones.id))
    .where(
      and(
        eq(wastes.status, 'collected'),
        gte(wastes.collected_date, startDate),
        lte(wastes.collected_date, currentDate)
      )
    );

    // Group the data by month and zone
    const monthlyData = {};
    wasteData.forEach(waste => {
      const collectedDate = new Date(waste.collected_date);
      const monthName = collectedDate.toLocaleString('default', { month: 'short' });
      const zoneId = waste.zone_id || 'unknown';

      if (!monthlyData[monthName]) {
        monthlyData[monthName] = {
          month: monthName,
          total_quantity: 0,
          zones: {},
        };
      }

      if (!monthlyData[monthName].zones[zoneId]) {
        monthlyData[monthName].zones[zoneId] = {
          id: zoneId,
          name: waste.zone_name || 'Unknown',
          quantity: 0,
        };
      }

      // Add quantity to month's total
      monthlyData[monthName].total_quantity += Number(waste.quantity);

      // Add quantity to zone's total
      monthlyData[monthName].zones[zoneId].quantity += Number(waste.quantity);
    });

    // Format the grouped data into an array
    const result = Object.values(monthlyData).map(month => ({
      month: month.month,
      total_quantity: month.total_quantity,
      zones: Object.values(month.zones),
    }));

    // Sort results in calendar month order
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    result.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    return result;
  }

  // Returns total collected quantity per waste type
  static async getWasteDistribution() {
    const db = await getDb();
    // Get all waste types
    const wasteTypeData = await db.select().from(wasteTypes);

    // For each waste type, calculate the total collected quantity
    const distribution = await Promise.all(wasteTypeData.map(async (wasteType) => {
      const result = await db.select({ total: sum(wastes.quantity) })
        .from(wastes)
        .where(
          and(
            eq(wastes.waste_type_id, wasteType.id),
            eq(wastes.status, 'collected')
          )
        );

      return {
        waste_type: wasteType.name,
        total_quantity: result[0].total || 0,
      };
    }));

    // Return only waste types that have a non-zero quantity
    return distribution.filter(item => item.total_quantity > 0);
  }

  // Returns a limited list of recently collected waste records
  static async getRecentWastes(limit) {
    const db = await getDb(); 
    return await db.select({
      id: wastes.id,
      collected_date: wastes.collected_date,
      quantity: wastes.quantity,
      status: wastes.status,
      waste_type: wasteTypes.name,
      zone_name: zones.name,
    })
    .from(wastes)
    .leftJoin(wasteTypes, eq(wastes.waste_type_id, wasteTypes.id))
    .leftJoin(zones, eq(wastes.zone_id, zones.id))
    .orderBy(desc(wastes.collected_date))
    .limit(limit);
  }

  // Returns a limited number of recent system alerts
  static async getSystemAlerts(limit) {
    const db = await getDb(); 
    return await db.select({
      id: systemAlerts.id,
      type: systemAlerts.type,
      title: systemAlerts.title,
      message: systemAlerts.message,
      created_at: systemAlerts.created_at,
    })
    .from(systemAlerts)
    .orderBy(desc(systemAlerts.created_at))
    .limit(limit);
  }

  // Search menu items by name, or return a default limited list
  static async searchMenu(search) {
    const db = await getDb(); 
    let query = db.select({
      name: menus.name,
      path: menus.path,
    })
    .from(menus);

    if (search) {
      query = query.where(like(menus.name, `%${search}%`));
    } else {
      query = query.limit(4);
    }

    return await query.orderBy(menus.name);
  }
}

module.exports = { DashboardService };