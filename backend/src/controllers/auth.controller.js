const { AuthService } = require('../services/auth.service');

class AuthController {
  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid login credentials'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'An error occurred during login',
        error: error.message
      });
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: { email: ['The selected email is invalid.'] }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to send reset link',
        error: error.message
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req, res) {
    try {
      const { token, email, password } = req.body;
      const result = await AuthService.resetPassword(token, email, password);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Invalid token' || error.message === 'User not found') {
        return res.status(400).json({
          success: false,
          message: 'Invalid token or email'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const data = req.body;
      if (req.file) {
        data.image = req.file.filename;
      }
      const result = await AuthService.updateProfile(userId, data);
    
      return res.status(200).json({
        success: true,
        message: 'Update Successfully',
        user: result
      });
    } catch (error) {
      if (error.message === 'Email already taken') {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: { email: ['The email has already been taken.'] }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  /**
   * Update password
   */
  static async updatePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { current_password, password } = req.body;
      const result = await AuthService.updatePassword(userId, current_password, password);
      
      res.status(200).json(result);
    } catch (error) {
      if (error.message === 'Current password is incorrect') {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: { current_password: ['The current password is incorrect.'] }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update password',
        error: error.message
      });
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.userId;
      const user = await AuthService.getCurrentUser(userId);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get current user',
        error: error.message
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: 'Successfully logged out'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to logout',
        error: error.message
      });
    }
  }
}

module.exports = { AuthController };