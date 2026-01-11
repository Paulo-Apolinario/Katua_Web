const { getDb } = require('../config/db');
const { vehicles } = require('../models/vehicle.model');
const { zones } = require('../models/zone.model');
const { staff } = require('../models/staff.model');
const { eq } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');

class VehicleService {
/**
 * Get all vehicles with zone and staff information
 */
static async getAllVehicles() {
  try {
    const db = await getDb(); // Get db instance
    const allVehicles = await db.select({
      id: vehicles.id,
      vehicle_number: vehicles.vehicle_number,
      vehicle_type: vehicles.vehicle_type,
      model_brand: vehicles.model_brand,
      capacity_kg: vehicles.capacity_kg,
      fuel_type: vehicles.fuel_type,
      fuel_efficiency: vehicles.fuel_efficiency,
      status: vehicles.status,
      created_at: vehicles.created_at,
      updated_at: vehicles.updated_at,
      zone: {
        id: zones.id,
        name: zones.name,
        status: zones.status
      },
      staff: {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role
      }
    })
    .from(vehicles)
    .leftJoin(zones, eq(vehicles.zone_id, zones.id))
    .leftJoin(staff, eq(vehicles.staff_id, staff.id));

    return allVehicles;
  } catch (error) {
    await logSystemAlert('error', 'Error fetching vehicles', error.message);
    throw new Error('Failed to retrieve vehicles');
  }
}

/**
 * Get vehicle by ID with zone and staff information
 */
static async getVehicleById(id) {
  try {
    const db = await getDb(); // Get db instance
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  } catch (error) {
    await logSystemAlert('error', 'Error fetching vehicle', error.message);
    throw new Error('Failed to retrieve vehicle');
  }
}

  /**
   * Create new vehicle
   */
  static async createVehicle(vehicleData) {
    try {
      const db = await getDb(); // Get db instance
      const [newVehicle] = await db.insert(vehicles).values({
        ...vehicleData,
        created_at: new Date(),
        updated_at: new Date()
      });

      return newVehicle;
    } catch (error) {
      await logSystemAlert('error', 'Error creating vehicle', error.message);
      throw new Error('Failed to create vehicle');
    }
  }

  /**
   * Update vehicle
   */
  static async updateVehicle(id, vehicleData) {
    try {
      const db = await getDb(); // Get db instance
      const [existingVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
      
      if (!existingVehicle) {
        throw new Error('Vehicle not found');
      }

      await db.update(vehicles)
        .set({
          ...vehicleData,
          updated_at: new Date()
        })
        .where(eq(vehicles.id, id));

      // Get updated vehicle with relationships
      const updatedVehicle = await this.getVehicleById(id);
      return updatedVehicle;
    } catch (error) {
      await logSystemAlert('error', 'Error updating vehicle', error.message);
      throw new Error('Failed to update vehicle');
    }
  }

  /**
   * Delete vehicle
   */
  static async deleteVehicle(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
      
      if (!existingVehicle) {
        throw new Error('Vehicle not found');
      }

      await db.delete(vehicles).where(eq(vehicles.id, id));
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting vehicle', error.message);
      throw new Error('Failed to delete vehicle');
    }
  }

}

module.exports = { VehicleService };
