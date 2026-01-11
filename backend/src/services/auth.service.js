const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { eq, and } = require('drizzle-orm');
const fs = require('fs/promises');
const path = require('path');
const { getDb } = require('../config/db');
const { users } = require('../models/user.model');
const { passwordResetTokens } = require('../models/passwordResetToken.model');
const { sendPasswordResetEmail } = require('../utils/email');
const { logSystemAlert, generatePasswordResetUrl } = require('../utils/helpers');

class AuthService {

  static async login(email, password) {
    try {
      const db = await getDb(); // Get db instance
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle forgot password request
   */
  static async forgotPassword(email) {
    try {
      const db = await getDb(); // Get db instance
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        throw new Error('User not found');
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

      await db.insert(passwordResetTokens).values({
        email: user.email,
        token: resetToken,
        created_at: new Date()
      });

      // Generate reset URL
      const resetUrl = generatePasswordResetUrl(resetToken, email);

      // Send password reset email
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      return {
        success: true,
        message: 'Password reset link sent to your email'
      };
    } catch (error) {
      console.log(error);
      await logSystemAlert('error', 'Failed to send reset link', error.message);
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token, email, password) {
    try {
      const db = await getDb(); // Get db instance
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.email !== email) {
        throw new Error('Invalid token');
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        throw new Error('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user password
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Delete reset token
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.email, email));

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      await logSystemAlert('error', 'Failed to reset password', error.message);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, data) {
    try {
      const db = await getDb(); // Get db instance
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Delete old profile image if a new one is provided
      if (data.image && existingUser.image) {
        await fs.unlink(path.join('uploads/profile/', existingUser.image)).catch(() => {});
      }

      const updatedData = {
        name: data.name,
        email: data.email,
        image: data.image || existingUser.image,
        updatedAt: new Date(),
      };

      await db.update(users)
        .set(updatedData)
        .where(eq(users.id, userId));

      const [updatedUser] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, userId));

      return updatedUser;
    } catch (error) {
      await logSystemAlert('error', 'Failed to update profile', error.message);
      throw error;
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(userId, currentPassword, newPassword) {
    try {
      const db = await getDb(); // Get db instance
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      await logSystemAlert('error', 'Failed to update password', error.message);
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(userId) {
    try {
      const db = await getDb(); // Get db instance
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        throw new Error('User not found');
      }

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      await logSystemAlert('error', 'Failed to get current user', error.message);
      throw error;
    }
  }

  static async isEmailUnique(email, excludeId) {
    try {
      const db = await getDb(); // Get db instance
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.email, email));
      
      return !existingUser || existingUser.id === excludeId;
    } catch (error) {
      await logSystemAlert('error', 'Error checking email uniqueness', error.message);
      throw error;
    }
  }
}

module.exports = {AuthService};