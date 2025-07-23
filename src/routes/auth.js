const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Register new user
router.post('/register', 
  authRateLimiter,
  validateUserRegistration,
  logActivity('user_register', 'user'),
  asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name, phone } = req.body;

    const user = await AuthService.registerUser({
      email,
      password,
      first_name,
      last_name,
      phone
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      code: 'USER_REGISTERED'
    });
  })
);

// Login user
router.post('/login',
  authRateLimiter,
  validateUserLogin,
  logActivity('user_login', 'user'),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await AuthService.loginUser(email, password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      code: 'LOGIN_SUCCESS'
    });
  })
);

// Refresh access token
router.post('/refresh',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      user: result.user,
      code: 'TOKEN_REFRESHED'
    });
  })
);

// Logout user
router.post('/logout',
  authenticateToken,
  logActivity('user_logout', 'user'),
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await AuthService.revokeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logout successful',
      code: 'LOGOUT_SUCCESS'
    });
  })
);

// Logout from all devices
router.post('/logout-all',
  authenticateToken,
  logActivity('user_logout_all', 'user'),
  asyncHandler(async (req, res) => {
    await AuthService.revokeAllUserRefreshTokens(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logged out from all devices successfully',
      code: 'LOGOUT_ALL_SUCCESS'
    });
  })
);

// Get current user profile
router.get('/me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const user = await AuthService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user,
      code: 'USER_PROFILE_RETRIEVED'
    });
  })
);

// Update user profile
router.put('/me',
  authenticateToken,
  logActivity('user_profile_update', 'user'),
  asyncHandler(async (req, res) => {
    const allowedUpdates = ['first_name', 'last_name', 'phone', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedUser = await AuthService.updateUser(req.user.id, updates);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      code: 'PROFILE_UPDATED'
    });
  })
);

// Change password
router.put('/change-password',
  authenticateToken,
  authRateLimiter,
  logActivity('password_change', 'user'),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully',
      code: 'PASSWORD_CHANGED'
    });
  })
);

// Verify token endpoint (for frontend to check if token is valid)
router.get('/verify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      message: 'Token is valid',
      user: req.user,
      code: 'TOKEN_VALID'
    });
  })
);

module.exports = router;