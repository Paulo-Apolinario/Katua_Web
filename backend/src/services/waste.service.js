const { getDb } = require('../config/db');
const { wastes } = require('../models/waste.model');
const { bins } = require('../models/bin.model');
const { wasteTypes } = require('../models/wasteType.model');
const { zones } = require('../models/zone.model');
const { vehicles } = require('../models/vehicle.model');
const { staff } = require('../models/staff.model');
const { eq, and, desc } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');

class WasteService {
  /**
   * Fetch all waste records with related information
   */
  static async getAllWastes() {
    try {
      const db = await getDb(); // Get db instance
      const allWastes = await db.select({
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
          name: zones.name
        },
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type
        },
        staff: {
          id: staff.id,
          name: staff.name,
          phone: staff.phone
        },
        waste_type: {
          id: wasteTypes.id,
          name: wasteTypes.name
        },
        bin: {
          id: bins.id,
          bin_id: bins.bin_id,
          location: bins.location
        }
      })
        .from(wastes)
        .leftJoin(zones, eq(wastes.zone_id, zones.id)) // Join with zones table
        .leftJoin(vehicles, eq(wastes.vehicle_id, vehicles.id)) // Join with vehicles table
        .leftJoin(staff, eq(wastes.staff_id, staff.id)) // Join with staff table
        .leftJoin(wasteTypes, eq(wastes.waste_type_id, wasteTypes.id)) // Join with waste types table
        .leftJoin(bins, eq(wastes.bin_id, bins.id)) // Join with bins table
        .orderBy(desc(wastes.created_at)); // Sort by creation date in descending order

      return allWastes;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching wastes', error.message);
      throw new Error('Failed to retrieve wastes');
    }
  }

  /**
   * Fetch a single waste record by ID
   */
  static async getWasteById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [waste] = await db.select().from(wastes).where(eq(wastes.id, id));
      if (!waste) {
        throw new Error('Waste not found');
      }
      return waste;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching waste', error.message);
      throw new Error('Failed to retrieve waste');
    }
  }

  /**
   * Create a new waste record
   */
  static async createWaste(wasteData) {
    try {
      const db = await getDb(); // Get db instance
      const [newWaste] = await db.insert(wastes).values({
        ...wasteData,
        created_at: new Date(), 
        updated_at: new Date() 
      });
      return newWaste;
    } catch (error) {
      await logSystemAlert('error', 'Error creating waste', error.message); 
      throw new Error('Failed to create waste');
    }
  }

  /**
   * Update an existing waste record
   */
  static async updateWaste(id, wasteData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingWaste] = await db.select().from(wastes).where(eq(wastes.id, id));
      if (!existingWaste) {
        throw new Error('Waste not found');
      }

      await db.update(wastes)
        .set({
          ...wasteData,
          updated_at: new Date()
        })
        .where(eq(wastes.id, id));

      return await this.getWasteById(id); // Return updated waste
    } catch (error) {
      await logSystemAlert('error', 'Error updating waste', error.message);
      throw new Error('Failed to update waste');
    }
  }

  /**
   * Delete a waste record
   */
  static async deleteWaste(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingWaste] = await db.select().from(wastes).where(eq(wastes.id, id));
      if (!existingWaste) {
        throw new Error('Waste not found');
      }

      await db.delete(wastes).where(eq(wastes.id, id)); // Delete waste record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting waste', error.message); 
      throw new Error('Failed to delete waste');
    }
  }
}

module.exports = { WasteService };