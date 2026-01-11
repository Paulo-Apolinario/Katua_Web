const { getDb } = require('../config/db');
const { zones } = require('../models/zone.model');
const { staff } = require('../models/staff.model');
const { eq, and, desc } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');

class ZoneService {
  /**
   * Fetch all zones with related staff information and optional filters
   */
  static async getAllZones(filters = {}) {
    try {
      const db = await getDb(); // Get db instance
      let query = db.select({
        id: zones.id,
        name: zones.name,
        area_names: zones.area_names,
        zone_type: zones.zone_type,
        description: zones.description,
        status: zones.status,
        created_at: zones.created_at,
        updated_at: zones.updated_at,
        staff: {
          id: staff.id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role
        }
      })
        .from(zones)
        .leftJoin(staff, eq(zones.staff_id, staff.id)); // Join with staff table

      // Apply filters if provided
      if (filters.status) {
        query = query.where(eq(zones.status, filters.status));
      }
      if (filters.zone_type) {
        query = query.where(eq(zones.zone_type, filters.zone_type));
      }
      if (filters.name) {
        query = query.where(eq(zones.name, filters.name));
      }

      // Sort by creation date in descending order
      query = query.orderBy(desc(zones.created_at));

      const allZones = await query;
      return allZones;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching zones', error.message);
      throw new Error('Failed to retrieve zones');
    }
  }

  /**
   * Fetch a single zone by ID
   */
  static async getZoneById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [zone] = await db.select().from(zones).where(eq(zones.id, id));
      if (!zone) {
        throw new Error('Zone not found');
      }
      return zone;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching zone', error.message);
      throw new Error('Failed to retrieve zone');
    }
  }

  /**
   * Create a new zone
   */
  static async createZone(zoneData) {
    try {
      const db = await getDb(); // Get db instance
      const [newZone] = await db.insert(zones).values({
        ...zoneData,
        created_at: new Date(),
        updated_at: new Date() 
      });
      return newZone;
    } catch (error) {
      await logSystemAlert('error', 'Error creating zone', error.message); 
      throw new Error('Failed to create zone');
    }
  }

  /**
   * Update an existing zone
   */
  static async updateZone(id, zoneData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingZone] = await db.select().from(zones).where(eq(zones.id, id));
      if (!existingZone) {
        throw new Error('Zone not found');
      }

      await db.update(zones)
        .set({
          ...zoneData,
          updated_at: new Date() 
        })
        .where(eq(zones.id, id));

      return await this.getZoneById(id); // Return updated zone
    } catch (error) {
      await logSystemAlert('error', 'Error updating zone', error.message);
      throw new Error('Failed to update zone');
    }
  }

  /**
   * Delete a zone
   */
  static async deleteZone(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingZone] = await db.select().from(zones).where(eq(zones.id, id));
      if (!existingZone) {
        throw new Error('Zone not found');
      }

      await db.delete(zones).where(eq(zones.id, id)); // Delete zone record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting zone', error.message);
      throw new Error('Failed to delete zone');
    }
  }
}

module.exports = { ZoneService };