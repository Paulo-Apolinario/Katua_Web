const { getDb } = require('../config/db');
const { wasteTypes } = require('../models/wasteType.model');
const { logSystemAlert } = require('../utils/helpers');
const { eq, and, desc } = require('drizzle-orm');

class WasteTypeService {
  /**
   * Fetch all waste types
   */
  static async getAllWasteTypes() {
    try {
      const db = await getDb(); // Get db instance
      const allWasteTypes = await db.select().from(wasteTypes);
      return allWasteTypes;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching waste types', error.message); 
      throw new Error('Failed to retrieve waste types');
    }
  }

  /**
   * Fetch a single waste type by ID
   */
  static async getWasteTypeById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [wasteType] = await db.select().from(wasteTypes).where(eq(wasteTypes.id, id));
      if (!wasteType) {
        throw new Error('Waste type not found');
      }
      return wasteType;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching waste type', error.message);
      throw new Error('Failed to retrieve waste type');
    }
  }

  /**
   * Create a new waste type
   */
  static async createWasteType(wasteTypeData) {
    try {
      const db = await getDb(); // Get db instance
      const [newWasteType] = await db.insert(wasteTypes).values({
        ...wasteTypeData,
        created_at: new Date(),
        updated_at: new Date() 
      });
      return newWasteType;
    } catch (error) {
      await logSystemAlert('error', 'Error creating waste type', error.message); 
      throw new Error('Failed to create waste type');
    }
  }

  /**
   * Update an existing waste type
   */
  static async updateWasteType(id, wasteTypeData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingWasteType] = await db.select().from(wasteTypes).where(eq(wasteTypes.id, id));
      if (!existingWasteType) {
        throw new Error('Waste type not found');
      }

      await db.update(wasteTypes)
        .set({
          ...wasteTypeData,
          updated_at: new Date()
        })
        .where(eq(wasteTypes.id, id));

      return await this.getWasteTypeById(id); // Return updated waste type
    } catch (error) {
      await logSystemAlert('error', 'Error updating waste type', error.message); 
      throw new Error('Failed to update waste type');
    }
  }

  /**
   * Delete a waste type
   */
  static async deleteWasteType(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingWasteType] = await db.select().from(wasteTypes).where(eq(wasteTypes.id, id));
      if (!existingWasteType) {
        throw new Error('Waste type not found');
      }

      await db.delete(wasteTypes).where(eq(wasteTypes.id, id)); // Delete waste type record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting waste type', error.message);
      throw new Error('Failed to delete waste type');
    }
  }
}

module.exports = { WasteTypeService };