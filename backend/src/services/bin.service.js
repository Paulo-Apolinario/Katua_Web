const { getDb } = require('../config/db');
const { bins } = require('../models/bin.model');
const { zones } = require('../models/zone.model');
const { vehicles } = require('../models/vehicle.model');
const { logSystemAlert } = require('../utils/helpers');
const { eq, and, desc } = require('drizzle-orm');

class BinService {
  /**
   * Fetch all bins with related zone and vehicle information
   */
  static async getAllBins() {
    try {
      const db = await getDb(); // Get db instance
      const allBins = await db.select({
        id: bins.id,
        bin_id: bins.bin_id,
        location: bins.location,
        status: bins.status,
        bin_type: bins.bin_type,
        last_collection_date: bins.last_collection_date,
        created_at: bins.created_at,
        updated_at: bins.updated_at,
        zone: {
          id: zones.id,
          name: zones.name
        },
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number
        }
      })
        .from(bins)
        .leftJoin(zones, eq(bins.zone_id, zones.id)) // Join with zones table
        .leftJoin(vehicles, eq(bins.vehicle_id, vehicles.id)); // Join with vehicles table

      return allBins;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching bins', error.message);
      throw new Error('Failed to retrieve bins');
    }
  }

  /**
   * Fetch a single bin by ID
   */
  static async getBinById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [bin] = await db.select().from(bins).where(eq(bins.id, id));
      if (!bin) {
        throw new Error('Bin not found');
      }
      return bin;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching bin', error.message); 
      throw new Error('Failed to retrieve bin');
    }
  }

  /**
   * Create a new bin
   */
  static async createBin(binData) {
    try {
      const db = await getDb(); // Get db instance
      const [newBin] = await db.insert(bins).values({
        ...binData,
        created_at: new Date(), 
        updated_at: new Date() 
      });
      return newBin;
    } catch (error) {
      await logSystemAlert('error', 'Error creating bin', error.message); 
      throw new Error('Failed to create bin');
    }
  }

  /**
   * Update an existing bin
   */
  static async updateBin(id, binData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingBin] = await db.select().from(bins).where(eq(bins.id, id));
      if (!existingBin) {
        throw new Error('Bin not found');
      }

      await db.update(bins)
        .set({
          ...binData,
          updated_at: new Date()
        })
        .where(eq(bins.id, id));

      return await this.getBinById(id); // Return updated bin
    } catch (error) {
      await logSystemAlert('error', 'Error updating bin', error.message); 
      throw new Error('Failed to update bin');
    }
  }

  /**
   * Delete a bin
   */
  static async deleteBin(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingBin] = await db.select().from(bins).where(eq(bins.id, id));
      if (!existingBin) {
        throw new Error('Bin not found');
      }

      await db.delete(bins).where(eq(bins.id, id)); // Delete bin record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting bin', error.message);
      throw new Error('Failed to delete bin');
    }
  }
}

module.exports = { BinService };