const { StaffService } = require('../services/staff.service');

class StaffController {
  /**
   * Get all staff
   */
  static async index(req, res) {
    try {
      const staff = await StaffService.getAllStaff();
      res.status(200).json({ success: true, data: staff });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff'
      });
    }
  }

  /**
   * Create new staff
   */
  static async store(req, res) {
    try {
      const staffData = req.body;
      if (req.file) {
        staffData.file = req.file.filename;
      }

      await StaffService.createStaff(staffData);
      res.status(201).json({ success: true, message: 'Created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create staff'
      });
    }
  }

  /**
   * Get staff by ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;
      const staffMember = await StaffService.getStaffById(id);
      res.status(200).json({ success: true, data: staffMember });
    } catch (error) {
      if (error.message === 'Staff not found') {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff'
      });
    }
  }

  /**
   * Update staff
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (req.file) {
        data.file = req.file.filename;
      }

      const updatedStaff = await StaffService.updateStaff(id, data);
      res.status(200).json({
        success: true,
        data: updatedStaff,
        message: 'Updated successfully'
      });
    } catch (error) {
      if (error.message === 'Staff not found') {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update staff'
      });
    }
  }

  /**
   * Delete staff
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      
      await StaffService.deleteStaff(id);
      res.status(200).json({
        success: true,
        message: 'Deleted successfully'
      });
    } catch (error) {
      console.log(error);
      if (error.message === 'Staff not found') {
        return res.status(404).json({
          success: false,
          message: 'Staff not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete staff'
      });
    }
  }
}

module.exports = { StaffController };
