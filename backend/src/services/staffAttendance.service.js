const { getDb } = require('../config/db');
const { staffAttendances } = require('../models/staffAttendance.model');
const { staff } = require('../models/staff.model');
const { routes } = require('../models/route.model');
const { eq } = require('drizzle-orm');

class StaffAttendanceService {
  /**
   * Fetch all attendance records
   */
  static async getAllAttendances() {
    const db = await getDb(); // Get db instance
    return await db.select({
      id: staffAttendances.id,
      staff_id: staffAttendances.staff_id,
      route_id: staffAttendances.route_id,
      attendance_date: staffAttendances.attendance_date,
      role: staffAttendances.role,
      attendance_status: staffAttendances.attendance_status,
      leave_type: staffAttendances.leave_type,
      check_in_time: staffAttendances.check_in_time,
      check_out_time: staffAttendances.check_out_time,
      created_at: staffAttendances.created_at,
      updated_at: staffAttendances.updated_at,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
      },
      route: {
        id: routes.id,
        name: routes.name,
      },
    })
    .from(staffAttendances)
    .leftJoin(staff, eq(staffAttendances.staff_id, staff.id)) // Join staff table
    .leftJoin(routes, eq(staffAttendances.route_id, routes.id)); // Join routes table
  }

  /**
   * Fetch attendance by ID
   */
  static async getAttendanceById(id) {
    const db = await getDb(); // Get db instance
    const [attendance] = await db.select().from(staffAttendances).where(eq(staffAttendances.id, id));
    if (!attendance) {
      throw new Error('Attendance not found');
    }
    return attendance;
  }

  /**
   * Create new attendance record
   */
  static async createAttendance(data) {
    const db = await getDb(); // Get db instance
    return (await db.insert(staffAttendances).values({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    }));
  }

  /**
   * Update attendance record
   */
  static async updateAttendance(id, data) {
    const db = await getDb(); // Get db instance
    const [existingAttendance] = await db.select().from(staffAttendances).where(eq(staffAttendances.id, id));
    if (!existingAttendance) {
      throw new Error('Attendance not found');
    }

    await db.update(staffAttendances)
      .set({ ...data, updated_at: new Date() })
      .where(eq(staffAttendances.id, id));

    return await this.getAttendanceById(id); // Return updated record
  }

  /**
   * Delete attendance record
   */
  static async deleteAttendance(id) {
    const db = await getDb(); // Get db instance
    const [existingAttendance] = await db.select().from(staffAttendances).where(eq(staffAttendances.id, id));
    if (!existingAttendance) {
      throw new Error('Attendance not found');
    }

    await db.delete(staffAttendances).where(eq(staffAttendances.id, id)); // Delete record
    return true;
  }
}

module.exports = { StaffAttendanceService };