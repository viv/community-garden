const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, requireRole, checkOwnership, logActivity } = require('../middleware/auth');
const { validatePlot, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all plots
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const gardenId = req.query.garden_id;
    const status = req.query.status;
    const assigneeId = req.query.assignee_id;

    let whereClause = '1=1';
    let params = [];

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (assigneeId) {
      whereClause += ' AND p.assignee_id = ?';
      params.push(parseInt(assigneeId));
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM plots p WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get plots with garden and assignee info
    const plots = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                g.name as garden_name, 
                g.location as garden_location,
                u.first_name as assignee_first_name, 
                u.last_name as assignee_last_name,
                u.email as assignee_email,
                (SELECT COUNT(*) FROM plants WHERE plot_id = p.id) as plant_count,
                (SELECT COUNT(*) FROM plants WHERE plot_id = p.id AND status = 'planted') as active_plants
         FROM plots p
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY g.name, p.plot_number
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

// Get plot by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);

    const plot = await new Promise((resolve, reject) => {
      db.get(
        `SELECT p.*, 
                g.name as garden_name, 
                g.location as garden_location,
                g.manager_id as garden_manager_id,
                u.first_name as assignee_first_name, 
                u.last_name as assignee_last_name,
                u.email as assignee_email,
                (SELECT COUNT(*) FROM plants WHERE plot_id = p.id) as plant_count,
                (SELECT COUNT(*) FROM plants WHERE plot_id = p.id AND status = 'planted') as active_plants
         FROM plots p
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE p.id = ?`,
        [plotId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!plot) {
      throw new AppError('Plot not found', 404, 'PLOT_NOT_FOUND');
    }

    res.json({ plot });
  })
);

// Create new plot
router.post('/',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validatePlot,
  logActivity('plot_create', 'plot'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      garden_id,
      plot_number,
      size_sqft,
      location_x,
      location_y,
      soil_type,
      sun_exposure,
      water_access,
      rental_fee,
      notes
    } = req.body;

    // Check if user can create plots in this garden
    if (req.user.role === 'manager') {
      const garden = await new Promise((resolve, reject) => {
        db.get('SELECT manager_id FROM gardens WHERE id = ?', [garden_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!garden || garden.manager_id !== req.user.id) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }
    }

    const plot = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO plots 
         (garden_id, plot_number, size_sqft, location_x, location_y, 
          soil_type, sun_exposure, water_access, rental_fee, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [garden_id, plot_number, size_sqft, location_x, location_y, 
         soil_type, sun_exposure, water_access ? 1 : 0, rental_fee, notes],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created plot
            db.get(
              `SELECT p.*, g.name as garden_name
               FROM plots p
               JOIN gardens g ON p.garden_id = g.id
               WHERE p.id = ?`,
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
      message: 'Plot created successfully',
      plot
    });
  })
);

// Update plot
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateId,
  validatePlot,
  logActivity('plot_update', 'plot'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);

    // Check if user can update this plot
    if (req.user.role === 'manager') {
      const plot = await new Promise((resolve, reject) => {
        db.get(
          `SELECT g.manager_id 
           FROM plots p 
           JOIN gardens g ON p.garden_id = g.id 
           WHERE p.id = ?`,
          [plotId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!plot || plot.manager_id !== req.user.id) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }
    }

    const allowedFields = [
      'plot_number', 'size_sqft', 'location_x', 'location_y', 
      'soil_type', 'sun_exposure', 'water_access', 'status', 
      'rental_fee', 'notes'
    ];

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (key === 'water_access') {
          updates.push(`${key} = ?`);
          values.push(req.body[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          values.push(req.body[key]);
        }
      }
    });

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(plotId);

    const updatedPlot = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE plots SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plot not found', 404, 'PLOT_NOT_FOUND'));
          } else {
            // Return updated plot
            db.get(
              `SELECT p.*, g.name as garden_name
               FROM plots p
               JOIN gardens g ON p.garden_id = g.id
               WHERE p.id = ?`,
              [plotId],
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
      message: 'Plot updated successfully',
      plot: updatedPlot
    });
  })
);

// Assign plot to user
router.put('/:id/assign',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateId,
  logActivity('plot_assign', 'plot'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);
    const { assignee_id } = req.body;

    if (!assignee_id) {
      throw new AppError('Assignee ID is required', 400, 'MISSING_ASSIGNEE_ID');
    }

    // Check if user can assign this plot
    if (req.user.role === 'manager') {
      const plot = await new Promise((resolve, reject) => {
        db.get(
          `SELECT g.manager_id 
           FROM plots p 
           JOIN gardens g ON p.garden_id = g.id 
           WHERE p.id = ?`,
          [plotId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!plot || plot.manager_id !== req.user.id) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }
    }

    // Verify assignee exists and is active
    const assignee = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
        [assignee_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!assignee) {
      throw new AppError('Assignee not found or inactive', 404, 'ASSIGNEE_NOT_FOUND');
    }

    const updatedPlot = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE plots 
         SET assignee_id = ?, status = 'assigned', assigned_date = date('now'), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [assignee_id, plotId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plot not found', 404, 'PLOT_NOT_FOUND'));
          } else {
            // Return updated plot
            db.get(
              `SELECT p.*, g.name as garden_name, u.first_name, u.last_name
               FROM plots p
               JOIN gardens g ON p.garden_id = g.id
               JOIN users u ON p.assignee_id = u.id
               WHERE p.id = ?`,
              [plotId],
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
      message: 'Plot assigned successfully',
      plot: updatedPlot
    });
  })
);

// Unassign plot
router.put('/:id/unassign',
  authenticateToken,
  requireRole(['admin', 'manager']),
  validateId,
  logActivity('plot_unassign', 'plot'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);

    // Check if user can unassign this plot
    if (req.user.role === 'manager') {
      const plot = await new Promise((resolve, reject) => {
        db.get(
          `SELECT g.manager_id 
           FROM plots p 
           JOIN gardens g ON p.garden_id = g.id 
           WHERE p.id = ?`,
          [plotId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!plot || plot.manager_id !== req.user.id) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }
    }

    const updatedPlot = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE plots 
         SET assignee_id = NULL, status = 'available', assigned_date = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [plotId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plot not found', 404, 'PLOT_NOT_FOUND'));
          } else {
            // Return updated plot
            db.get(
              `SELECT p.*, g.name as garden_name
               FROM plots p
               JOIN gardens g ON p.garden_id = g.id
               WHERE p.id = ?`,
              [plotId],
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
      message: 'Plot unassigned successfully',
      plot: updatedPlot
    });
  })
);

// Get plot plants
router.get('/:id/plants',
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = 'plot_id = ?';
    let params = [plotId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Check if plot exists
    const plot = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM plots WHERE id = ?', [plotId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plot) {
      throw new AppError('Plot not found', 404, 'PLOT_NOT_FOUND');
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM plants WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get plants
    const plants = await new Promise((resolve, reject) => {
      db.all(
        `SELECT *, 
                (SELECT COUNT(*) FROM growth_logs WHERE plant_id = plants.id) as growth_log_count,
                (SELECT COUNT(*) FROM harvests WHERE plant_id = plants.id) as harvest_count
         FROM plants
         WHERE ${whereClause}
         ORDER BY planted_date DESC, name
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      plants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Delete plot
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validateId,
  logActivity('plot_delete', 'plot'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plotId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM plots WHERE id = ?',
        [plotId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plot not found', 404, 'PLOT_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Plot deleted successfully'
    });
  })
);

module.exports = router;