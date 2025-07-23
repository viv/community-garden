const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, requireRole, logActivity } = require('../middleware/auth');
const { validateUserUpdate, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all users (admin only)
router.get('/',
  authenticateToken,
  requireRole('admin'),
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let whereClause = '1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    // Get total count
    const totalQuery = `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`;
    const total = await new Promise((resolve, reject) => {
      db.get(totalQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    // Get users
    const query = `
      SELECT id, email, first_name, last_name, phone, role, is_active, 
             profile_image, created_at, updated_at
      FROM users 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await new Promise((resolve, reject) => {
      db.all(query, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get user by ID
router.get('/:id',
  authenticateToken,
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, email, first_name, last_name, phone, role, is_active, 
                profile_image, preferences, created_at, updated_at
         FROM users WHERE id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({ user });
  })
);

// Update user
router.put('/:id',
  authenticateToken,
  validateId,
  validateUserUpdate,
  logActivity('user_update', 'user'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    // Users can only update their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const allowedFields = ['email', 'first_name', 'last_name', 'phone', 'preferences'];
    
    // Admin can also update role and is_active
    if (req.user.role === 'admin') {
      allowedFields.push('role', 'is_active');
    }

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    });

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const updatedUser = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('User not found', 404, 'USER_NOT_FOUND'));
          } else {
            // Return updated user
            db.get(
              `SELECT id, email, first_name, last_name, phone, role, is_active, 
                      profile_image, preferences, created_at, updated_at
               FROM users WHERE id = ?`,
              [userId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  })
);

// Deactivate user (soft delete)
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateId,
  logActivity('user_deactivate', 'user'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    // Prevent admin from deactivating themselves
    if (req.user.id === userId) {
      throw new AppError('Cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF');
    }

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('User not found', 404, 'USER_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'User deactivated successfully'
    });
  })
);

// Reactivate user
router.put('/:id/activate',
  authenticateToken,
  requireRole('admin'),
  validateId,
  logActivity('user_activate', 'user'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('User not found', 404, 'USER_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'User activated successfully'
    });
  })
);

// Get user's plots
router.get('/:id/plots',
  authenticateToken,
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    // Users can only view their own plots unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const plots = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, g.name as garden_name, g.location as garden_location
         FROM plots p
         JOIN gardens g ON p.garden_id = g.id
         WHERE p.assignee_id = ?
         ORDER BY g.name, p.plot_number`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ plots });
  })
);

// Get user's activity log
router.get('/:id/activity',
  authenticateToken,
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const userId = parseInt(req.params.id);

    // Users can only view their own activity unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get activity logs
    const activities = await new Promise((resolve, reject) => {
      db.all(
        `SELECT action, entity_type, entity_id, details, created_at
         FROM activity_logs 
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

module.exports = router;