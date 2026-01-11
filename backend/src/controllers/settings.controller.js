const { SettingsService } =  require('../services/settings.service');

class SettingsController {
  /**
   * Get all settings
   */
  static async getSettings(req, res) {
    try {
      const settings = await SettingsService.getSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve settings'
      });
    }
  }

  /**
   * Create new settings
   */
  static async saveCompanySettings(req, res) {
    try {
    const { company_name, copy_right } = req.body;
    const data = { company_name, copy_right };

    if (req.files?.fav_icon) {
      data.fav_icon = req.files.fav_icon[0].filename;
    }
    if (req.files?.logo) {
      data.logo = req.files.logo[0].filename;
    }

    const settings = await SettingsService.saveSettings(data);
    return res.status(201).json({ success: true, data: settings, message: 'Saved successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create settings'
      });
    }
  }

  /**
   * Get all SMTP configs
   */
  static async getSmtpConfigs(req, res) {
    try {
      const smtpConfigs = await SettingsService.getSmtpConfig();
      res.status(200).json({ success: true, data: smtpConfigs });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve SMTP configs'
      });
    }
  }

  /**
   * Create new SMTP config
   */
  static async createSmtpConfig(req, res) {
    try {
      const smtpConfigData = req.body;
      await SettingsService.saveSmtpConfig(smtpConfigData);
      res.status(201).json({ success: true, message: 'SMTP config created successfully' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create SMTP config'
      });
    }
  }

  /**
   * Get all system alerts
   */
  static async getSystemAlerts(req, res) {
    try {
      const systemAlerts = await SettingsService.getAllSystemAlerts();
      res.status(200).json({ success: true, data: systemAlerts });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system alerts'
      });
    }
  }
  /**
   * Delete system alert
   */
  static async deleteSystemAlert(req, res) {
    try {
      const { id } = req.params;
      await SettingsService.deleteSystemAlert(id);
      res.status(200).json({
        success: true,
        message: 'System alert deleted successfully'
      });
    } catch (error) {
      if (error.message === 'System alert not found') {
        return res.status(404).json({
          success: false,
          message: 'System alert not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete system alert'
      });
    }
  }
}

module.exports = { SettingsController };
