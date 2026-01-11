const { getDb } = require('../config/db');
const { staff } = require('../models/staff.model');
const { vehicles } = require('../models/vehicle.model');
const { logSystemAlert } = require('../utils/helpers');
const { eq } = require('drizzle-orm');
const fs = require('fs').promises;
const path = require('path');

class StaffService {
  /**
   * Fetch all staff members with related vehicle information
   */
  static async getAllStaff() {
    try {
      const db = await getDb(); // Get db instance
      const allStaff = await db.select({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        gender: staff.gender,
        date_of_birth: staff.date_of_birth,
        nid_or_passport: staff.nid_or_passport,
        address: staff.address,
        file: staff.file,
        role: staff.role,
        joining_date: staff.joining_date,
        status: staff.status,
        created_at: staff.created_at,
        updated_at: staff.updated_at,
        vehicle: {
          id: vehicles.id,
          vehicle_number: vehicles.vehicle_number,
          vehicle_type: vehicles.vehicle_type,
          model_brand: vehicles.model_brand,
          status: vehicles.status
        }
      })
      .from(staff)
      .leftJoin(vehicles, eq(staff.vehicle_id, vehicles.id)); // Join with vehicles table

      return allStaff;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching staff', error.message);
      throw new Error('Failed to retrieve staff');
    }
  }

  /**
   * Fetch a single staff member by ID
   */
  static async getStaffById(id) {
    try {
      const db = await getDb(); // Get db instance
      const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
      if (!staffMember) {
        throw new Error('Staff not found');
      }
      return staffMember;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching staff', error.message); 
      throw new Error('Failed to retrieve staff');
    }
  }

  /**
   * Create a new staff member
   */
  static async createStaff(staffData) {
    try {
      const db = await getDb(); // Get db instance
      const [newStaff] = await db.insert(staff).values({
        ...staffData,
        created_at: new Date(),
        updated_at: new Date() 
      });
      return newStaff;
    } catch (error) {
      await logSystemAlert('error', 'Error creating staff', error.message);
      throw new Error('Failed to create staff');
    }
  }

  /**
   * Update an existing staff member
   */
  static async updateStaff(id, data) {
    try {
      const db = await getDb(); // Get db instance
      const [existingStaff] = await db.select().from(staff).where(eq(staff.id, id));
      if (!existingStaff) {
        throw new Error('Staff not found');
      }

      // Delete old file if new file is uploaded
      if (data.file && existingStaff.file) {
        await fs.unlink(path.join('uploads/staff_image/', existingStaff.file)).catch(() => { });
      }

      const updateData = { ...data, updated_at: new Date() };

      // Prevent overwriting file path if no new file
      if (!updateData.file) {
        delete updateData.file;
      }

      await db.update(staff)
        .set({ ...updateData })
        .where(eq(staff.id, id));

      return await this.getStaffById(id); // Return updated staff
    } catch (error) {
      await logSystemAlert('error', 'Error updating staff', error.message); 
      throw new Error('Failed to update staff');
    }
  }

  /**
   * Delete a staff member
   */
  static async deleteStaff(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingStaff] = await db.select().from(staff).where(eq(staff.id, id));

      if (!existingStaff) {
        throw new Error('Staff not found');
      }
      
      // Delete file if exists
      if (existingStaff.file) {
         await fs.unlink(path.join('uploads/staff_image/', existingStaff.file)).catch(() => { });
      }

      await db.delete(staff).where(eq(staff.id, id)); // Delete staff record
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting staff', error.message); 
      throw new Error('Failed to delete staff');
    }
  }

}

module.exports = { StaffService };