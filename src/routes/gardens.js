const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, requireRole, logActivity } = require('../middleware/auth');
const { validateGarden, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all gardens
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : true;

    let whereClause = 'is_active = ?';
    let params = [isActive ? 1 : 0];

    if (search) {
      whereClause += ' AND (name LIKE ? OR location LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM gardens WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get gardens with manager info
    const gardens = await new Promise((resolve, reject) => {
      db.all(
        `SELECT g.*, 
                u.first_name as manager_first_name, 
                u.last_name as manager_last_name,
                u.email as manager_email,
                (SELECT COUNT(*) FROM plots WHERE garden_id = g.id) as total_plots,
                (SELECT COUNT(*) FROM plots WHERE garden_id = g.id AND status = 'assigned') as assigned_plots
         FROM gardens g
         LEFT JOIN users u ON g.manager_id = u.id
         WHERE ${whereClause}
         ORDER BY g.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      gardens,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get garden by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.id);

    const garden = await new Promise((resolve, reject) => {
      db.get(
        `SELECT g.*, 
                u.first_name as manager_first_name, 
                u.last_name as manager_last_name,
                u.email as manager_email,
                (SELECT COUNT(*) FROM plots WHERE garden_id = g.id) as total_plots,
                (SELECT COUNT(*) FROM plots WHERE garden_id = g.id AND status = 'assigned') as assigned_plots,
                (SELECT COUNT(*) FROM plots WHERE garden_id = g.id AND status = 'available') as available_plots
         FROM gardens g
         LEFT JOIN users u ON g.manager_id = u.id
         WHERE g.id = ?`,
        [gardenId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!garden) {
      throw new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND');
    }

    res.json({ garden });
  })
);

// Create new garden
router.post('/',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateGarden,
  logActivity('garden_create', 'garden'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      name,
      description,
      location,
      latitude,
      longitude,
      size_sqft,
      established_date,
      rules,
      amenities
    } = req.body;

    // Default manager to current user if not specified and user is manager
    let managerId = req.body.manager_id;
    if (!managerId && req.user.role === 'manager') {
      managerId = req.user.id;
    }

    const garden = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO gardens 
         (name, description, location, latitude, longitude, size_sqft, 
          established_date, manager_id, rules, amenities) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description, location, latitude, longitude, size_sqft, 
         established_date, managerId, rules, amenities],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created garden
            db.get(
              `SELECT g.*, 
                      u.first_name as manager_first_name, 
                      u.last_name as manager_last_name
               FROM gardens g
               LEFT JOIN users u ON g.manager_id = u.id
               WHERE g.id = ?`,
              [this.lastID],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    res.status(201).json({
      message: 'Garden created successfully',
      garden
    });
  })
);

// Update garden
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateId,
  validateGarden,
  logActivity('garden_update', 'garden'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.id);

    // Check if user can update this garden
    if (req.user.role === 'manager') {
      const garden = await new Promise((resolve, reject) => {
        db.get('SELECT manager_id FROM gardens WHERE id = ?', [gardenId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!garden || garden.manager_id !== req.user.id) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }
    }

    const allowedFields = [
      'name', 'description', 'location', 'latitude', 'longitude', 
      'size_sqft', 'established_date', 'rules', 'amenities', 'is_active'
    ];

    // Admin can also update manager
    if (req.user.role === 'admin') {
      allowedFields.push('manager_id');
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
    values.push(gardenId);

    const updatedGarden = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE gardens SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND'));
          } else {
            // Return updated garden
            db.get(
              `SELECT g.*, 
                      u.first_name as manager_first_name, 
                      u.last_name as manager_last_name
               FROM gardens g
               LEFT JOIN users u ON g.manager_id = u.id
               WHERE g.id = ?`,
              [gardenId],
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
      message: 'Garden updated successfully',
      garden: updatedGarden
    });
  })
);

// Delete garden (soft delete)
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateId,
  logActivity('garden_delete', 'garden'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE gardens SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [gardenId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Garden deleted successfully'
    });
  })
);

// Get garden plots
router.get('/:id/plots',
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = 'garden_id = ?';
    let params = [gardenId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Check if garden exists
    const garden = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM gardens WHERE id = ?', [gardenId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!garden) {
      throw new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND');
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM plots WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get plots with assignee info
    const plots = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                u.first_name as assignee_first_name, 
                u.last_name as assignee_last_name,
                u.email as assignee_email,
                (SELECT COUNT(*) FROM plants WHERE plot_id = p.id) as plant_count
         FROM plots p
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY p.plot_number
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      plots,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get garden statistics
router.get('/:id/stats',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.id);

    // Check if garden exists
    const garden = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM gardens WHERE id = ?', [gardenId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!garden) {
      throw new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND');
    }

    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           COUNT(DISTINCT p.id) as total_plots,
           COUNT(DISTINCT CASE WHEN p.status = 'assigned' THEN p.id END) as assigned_plots,
           COUNT(DISTINCT CASE WHEN p.status = 'available' THEN p.id END) as available_plots,
           COUNT(DISTINCT pl.id) as total_plants,
           COUNT(DISTINCT CASE WHEN pl.status = 'planted' THEN pl.id END) as active_plants,
           COUNT(DISTINCT h.id) as total_harvests,
           COALESCE(SUM(h.quantity), 0) as total_harvest_quantity,
           COUNT(DISTINCT p.assignee_id) as active_gardeners
         FROM plots p
         LEFT JOIN plants pl ON p.id = pl.plot_id
         LEFT JOIN harvests h ON pl.id = h.plant_id
         WHERE p.garden_id = ?`,
        [gardenId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({ stats });
  })
);

module.exports = router;