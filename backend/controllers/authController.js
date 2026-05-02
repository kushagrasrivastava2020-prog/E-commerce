const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

const authController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, password, first_name, last_name, role, phone } = req.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered.',
        });
      }

      const allowedRole = (role === 'merchant') ? 'merchant' : 'user';

      const user = await UserModel.create({
        email, password, first_name, last_name, role: allowedRole, phone,
      });

      const tokens = generateTokens(user.id, user.role);

      res.status(201).json({
        success: true,
        message: 'Registration successful.',
        data: {
          user,
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Contact support.',
        });
      }

      const isMatch = await UserModel.comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      const tokens = generateTokens(user.id, user.role);

      const { password_hash, ...userData } = user;

      res.json({
        success: true,
        message: 'Login successful.',
        data: {
          user: userData,
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/auth/me
  async getMe(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/auth/profile
  async updateProfile(req, res, next) {
    try {
      const { first_name, last_name, phone, avatar_url } = req.body;
      const user = await UserModel.updateProfile(req.user.id, {
        first_name, last_name, phone, avatar_url,
      });

      res.json({
        success: true,
        message: 'Profile updated.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/auth/change-password
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;

      const user = await UserModel.findByEmail(req.user.email);
      const isMatch = await UserModel.comparePassword(current_password, user.password_hash);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      await UserModel.updatePassword(req.user.id, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/refresh
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required.',
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await UserModel.findById(decoded.userId);

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token.',
        });
      }

      const tokens = generateTokens(user.id, user.role);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }
  },
};

module.exports = authController;