const { StaffAttendanceService } = require('../services/staffAttendance.service');

class StaffAttendanceController {
  /**
   * Get all staff attendances
   */
  static async index(req, res) {
    try {
      const attendances = await StaffAttendanceService.getAllAttendances();
      return res.status(200).json({ success: true, data: attendances });
    } catch (error) {
      console.error('Error fetching staff attendances:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff attendances',
      });
    }
  }

  /**
   * Create new staff attendance
   */
  static async store(req, res) {
    try {

      const attendance = await StaffAttendanceService.createAttendance(req.body);
      return res.status(201).json({
        success: true,
        message: 'Created successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create staff attendance',
      });
    }
  }

  /**
   * Get staff attendance by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const attendance = await StaffAttendanceService.getAttendanceById(id);
      return res.status(200).json({ success: true, data: attendance });
    } catch (error) {
      if (error.message === 'Attendance not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendance not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff attendance'
      });
    }
  }

  /**
   * Update staff attendance
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const attendance = await StaffAttendanceService.updateAttendance(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Updated successfully',
      });
    } catch (error) {
     if (error.message === 'Attendance not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendance not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff attendance'
      });
    }
  }

  /**
   * Delete staff attendance
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      await StaffAttendanceService.deleteAttendance(id);
      return res.status(200).json({
        success: true,
        message: 'Deleted successfully',
      });
    } catch (error) {
     if (error.message === 'Attendance not found') {
        return res.status(404).json({
          success: false,
          message: 'Attendance not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff attendance'
      });
    }
  }
}

module.exports = { StaffAttendanceController };