const { getDb } = require('../config/db');
const { vehicleMaintenanceLogs } = require('../models/vehicleMaintenanceLog.model');
const { vehicles } = require('../models/vehicle.model');
const { eq } = require('drizzle-orm');
const fs = require('fs').promises;
const path = require('path');
const { logSystemAlert } = require('../utils/helpers');

class MaintenanceLogService {
  /**
   * Fetch all maintenance logs with related vehicle information
   */
  static async getAllLogs() {
    try {
      const db = await getDb(); // Get db instance
      const allLogs = await db.select({
        id: vehicleMaintenanceLogs.id,
        vehicle_id: vehicleMaintenanceLogs.vehicle_id,
        maintenance_date: vehicleMaintenanceLogs.maintenance_date,
        maintenance_type: vehicleMaintenanceLogs.maintenance_type,
        cost: vehicleMaintenanceLogs.cost,
        location: vehicleMaintenanceLogs.location,
        performed_by: vehicleMaintenanceLogs.performed_by,
        next_maintenance_date: vehicleMaintenanceLogs.next_maintenance_date,
        file: vehicleMaintenanceLogs.file,
        notes: vehicleMaintenanceLogs.notes,
        status: vehicleMaintenanceLogs.status,
        created_at: vehicleMaintenanceLogs.created_at,
        updated_at: vehicleMaintenanceLogs.updated_at,
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type,
        },
      })
        .from(vehicleMaintenanceLogs)
        .leftJoin(vehicles, eq(vehicleMaintenanceLogs.vehicle_id, vehicles.id)); // Join with vehicles table

      return allLogs;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching maintenance logs', error.message);
      throw new Error('Failed to retrieve maintenance logs');
    }
  }

  /**
   * Fetch a single maintenance log by ID
   */
  static async getLogById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [log] = await db.select().from(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id));
      if (!log) {
        throw new Error('Log not found');
      }
      return log;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching maintenance log', error.message);
      throw new Error('Failed to retrieve maintenance log');
    }
  }

  /**
   * Create a new maintenance log
   */
  static async createLog(data) {
    try {
      const db = await getDb(); // Get db instance
      const [log] = await db.insert(vehicleMaintenanceLogs).values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      });
      return log;
    } catch (error) {
      await logSystemAlert('error', 'Error creating maintenance log', error.message);
      throw new Error('Failed to create maintenance log');
    }
  }

  /**
   * Update an existing maintenance log
   */
  static async updateLog(id, data) {
    try {
      const db = await getDb(); // Get db instance
      const [existingLog] = await db.select().from(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id));
      if (!existingLog) {
        throw new Error('Log not found');
      }

      // Delete old file if new file is uploaded
      if (data.file && existingLog.file) {
        await fs.unlink(path.join('uploads/vehicle_invoice/', existingLog.file)).catch(() => { });
      }

      const updateData = { ...data, updated_at: new Date() }; // Update timestamp

      // Prevent overwriting file path if no new file
      if (!updateData.file) {
        delete updateData.file;
      }

      await db.update(vehicleMaintenanceLogs)
        .set({ ...updateData })
        .where(eq(vehicleMaintenanceLogs.id, id));

      return await this.getLogById(id); // Return updated log
    } catch (error) {
      await logSystemAlert('error', 'Error updating maintenance log', error.message);
      throw new Error('Failed to update maintenance log');
    }
  }

  /**
   * Delete a maintenance log
   */
  static async deleteLog(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingLog] = await db.select().from(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id));
      if (!existingLog) {
        throw new Error('Log not found');
      }

      // Delete associated file
      if (existingLog.file) {
        await fs.unlink(path.join('uploads/vehicle_invoice/', existingLog.file)).catch(() => { });
      }

      await db.delete(vehicleMaintenanceLogs).where(eq(vehicleMaintenanceLogs.id, id)); // Delete log record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting maintenance log', error.message);
      throw new Error('Failed to delete maintenance log');
    }
  }
}

module.exports = { MaintenanceLogService };