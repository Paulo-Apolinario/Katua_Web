const { desc } = require('drizzle-orm');
const { getDb } = require('../config/db');
const { systemAlerts } = require('../models/systemAlert.model');
const { smtpConfigs } = require('../models/smtpConfig.model');

/**
 * Log system alert
 * @param {string} type - Alert type (error, warning, info)
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 */
async function logSystemAlert(type, title, message) {
    try {
        // Validate required fields
        if (!type || !title) {
            console.error('System alert validation failed: type and title are required');
            return;
        }

        const db = await getDb(); // Get db instance
        await db.insert(systemAlerts).values({
            type,
            title,
            message: message || '',
            created_at: new Date(),
            updated_at: new Date(),
        });
    } catch (error) {
        console.error('Failed to log system alert to database:', error.message);
    }
}

/**
 * Get SMTP configuration
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if key not found
 * @returns {any} Configuration value
 */
async function getSmtpConfig(key, defaultValue = null) {
    try {
        const db = await getDb(); // Get db instance
        const [config] = await db
            .select()
            .from(smtpConfigs)
            .orderBy(desc(smtpConfigs.created_at))
            .limit(1);
        
        if (config && config[key]) {
            return config[key];
        } else {
            return defaultValue;
        }
    } catch (error) {
        await logSystemAlert('error', 'Failed to retrieve SMTP config', error.message);
        return defaultValue;
    }
}

/**
 * Generate a frontend URL for password reset
 * @param {string} token - Reset token
 * @param {string} email - User email
 * @returns {string} Reset URL
 */
function generatePasswordResetUrl(token, email) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const encodedEmail = encodeURIComponent(email);
    const encodedToken = encodeURIComponent(token);
    
    return `${baseUrl}/reset-password?token=${encodedToken}&email=${encodedEmail}`;
}

module.exports = {
    logSystemAlert,
    getSmtpConfig,
    generatePasswordResetUrl
};