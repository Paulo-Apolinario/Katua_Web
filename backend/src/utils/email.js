const nodemailer = require("nodemailer");
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/db');
const { desc } = require('drizzle-orm');
const { getSmtpConfig, logSystemAlert } = require('./helpers');
const { settings } = require('../models/settings.model');

/**
 * Create a nodemailer transporter using SMTP configuration
 */
async function createTransporter() {
  try {
    const host = await getSmtpConfig('host', process.env.MAIL_HOST);
    const port = parseInt(await getSmtpConfig('port', process.env.MAIL_PORT)) || 587;
    const user = await getSmtpConfig('username', process.env.MAIL_USERNAME);
    const pass = await getSmtpConfig('password', process.env.MAIL_PASSWORD);
    const encryption = await getSmtpConfig('encryption', process.env.MAIL_ENCRYPTION || 'tls');
    
    return nodemailer.createTransport({
      host,
      port,
      secure: encryption === 'ssl',
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    await logSystemAlert('error', 'Failed to create email transporter', error.message);
    throw new Error('Failed to create email transporter');
  }
}

/**
 * Send an email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (without extension)
 * @param {Object} options.data - Data to pass to the template
 */
async function sendEmail({ to, subject, template, data }) {
  try {
    const transporter = await createTransporter();
    
    // Get from email and name from SMTP config
    const fromEmail = await getSmtpConfig('mail_from_address', process.env.MAIL_FROM_ADDRESS);
    const fromName = await getSmtpConfig('mail_from_name', process.env.MAIL_FROM_NAME);
    
    // Read template file
    const templatePath = path.join(__dirname, '..', 'views', 'emails', `${template}.ejs`);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Render template with EJS
    const html = ejs.render(templateContent, data);
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html
    });
    
    return info;
  } catch (error) {
    await logSystemAlert('error', 'Failed to send email', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {string} resetUrl - Password reset URL
 */
async function sendPasswordResetEmail(email, name, resetUrl) {
  try {

    const db = await getDb(); // Get db instance

    // Get company settings with error handling
    let settingsData;
    try {
      const result = await db.select().from(settings).orderBy(desc(settings.created_at)).limit(1);
      settingsData = result[0];
    } catch (settingsError) {
      settingsData = null;
    }

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    
    // Get company settings with fallbacks
    const logoUrl = settingsData?.logo ? `${baseUrl}/uploads/logo/${settingsData.logo}` : '';
    const copyRightText = settingsData?.copy_right || `© ${new Date().getFullYear()} Your Company. All rights reserved.`;
    
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      template: 'reset-password',
      data: {
        user_name: name,
        user_email: email,
        reset_url: resetUrl,
        logo_url: logoUrl,
        copy_right_text: copyRightText
      }
    });
    
    return true;
  } catch (error) {
    console.log(error);
    await logSystemAlert('error', 'Failed to send password reset email', error.message);
    throw new Error('Failed to send password reset email');
  }
}

module.exports = { sendEmail, sendPasswordResetEmail };