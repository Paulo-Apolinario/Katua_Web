const { getDb } = require('../config/db');
const { settings } = require('../models/settings.model');
const { smtpConfigs } = require('../models/smtpConfig.model');
const { systemAlerts } = require('../models/systemAlert.model');
const { eq, desc } = require('drizzle-orm');
const { logSystemAlert } = require('../utils/helpers');
const fs = require('fs').promises;
const path = require('path');

class SettingsService {
  /**
   * Get settings
   */
  static async getSettings() {
    try {
      const db = await getDb(); // Get db instance
      const companySettings = await db.select().from(settings).limit(1);
      return companySettings[0] || {};
    } catch (error) {
      throw new Error('Failed to retrieve settings');
    }
  }

  /**
   * save settings
   */
  static async saveSettings(data) {
    try {
      const db = await getDb(); // Get db instance
      const existing = await db.select().from(settings).limit(1);

      // Delete old files if they exist
      if (existing[0]) {
        if (data.fav_icon && existing[0].fav_icon) {
          await fs.unlink(path.join('uploads/logo/', existing[0].fav_icon)).catch(() => { });
        }
        if (data.logo && existing[0].logo) {
          await fs.unlink(path.join('uploads/logo/', existing[0].logo)).catch(() => { });
        }
      }

      // Check if the record exists
      if (existing[0]) {
        // Update the existing record
        await db.update(settings).set(data).where({ id: existing[0].id });

        // Fetch the updated record
        return await db.select().from(settings).where({ id: existing[0].id }).limit(1);
      } else {
        // Insert the new record
        const [newRecord] = await db.insert(settings).values(data);

        return newRecord;
      }
    } catch (error) {
      console.log(error);
      await logSystemAlert('error', 'Error creating settings', error.message);
      throw new Error('Failed to create settings');
    }
  }

  /**
   * Get SMTP configs
  */
  static async getSmtpConfig() {
    try {
      const db = await getDb(); // Get db instance
      const config = await db.select().from(smtpConfigs).limit(1);
      return config[0] || {};
    } catch (error) {
      await logSystemAlert('error', 'Error fetching SMTP configs', error.message);
      throw new Error('Failed to retrieve SMTP configs');
    }
  }

  /**
   * Save SMTP config
   */
  static async saveSmtpConfig(data) {
    try {
      const db = await getDb(); // Get db instance
      const existing = await db.select().from(smtpConfigs).limit(1);
      if (existing[0]) {
        return (await db.update(smtpConfigs).set(data));
      }
      return (await db.insert(smtpConfigs).values(data));
    } catch (error) {
      console.log(error);
      await logSystemAlert('error', 'Error creating SMTP config', error.message);
      throw new Error('Failed to create SMTP config');
    }
  }

  /**
   * Get all system alerts
   */
  static async getAllSystemAlerts() {
    try {
      const db = await getDb(); // Get db instance
      const allSystemAlerts = await db.select().from(systemAlerts).orderBy(desc(systemAlerts.created_at));
      return allSystemAlerts;
    } catch (error) {
      await logSystemAlert('error', 'Error fetching system alerts', error.message);
      throw new Error('Failed to retrieve system alerts');
    }
  }

  /**
   * Delete system alert
   */
  static async deleteSystemAlert(id) {
    try {
      const db = await getDb(); // Get db instance
      const [existingAlert] = await db.select().from(systemAlerts).where(eq(systemAlerts.id, id));

      if (!existingAlert) {
        throw new Error('System alert not found');
      }

      await db.delete(systemAlerts).where(eq(systemAlerts.id, id));
      return true;
    } catch (error) {
      await logSystemAlert('error', 'Error deleting system alert', error.message);
      throw new Error('Failed to delete system alert');
    }
  }
}

module.exports = { SettingsService };
