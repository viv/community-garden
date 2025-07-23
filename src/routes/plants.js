const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, checkOwnership, logActivity } = require('../middleware/auth');
const { validatePlant, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all plants (with filtering)
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const plotId = req.query.plot_id;
    const status = req.query.status;
    const plantType = req.query.plant_type;
    const search = req.query.search || '';

    let whereClause = '1=1';
    let params = [];

    if (plotId) {
      whereClause += ' AND pl.plot_id = ?';
      params.push(parseInt(plotId));
    }

    if (status) {
      whereClause += ' AND pl.status = ?';
      params.push(status);
    }

    if (plantType) {
      whereClause += ' AND pl.plant_type = ?';
      params.push(plantType);
    }

    if (search) {
      whereClause += ' AND (pl.name LIKE ? OR pl.variety LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total 
         FROM plants pl 
         JOIN plots p ON pl.plot_id = p.id 
         WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get plants with plot and garden info
    const plants = await new Promise((resolve, reject) => {
      db.all(
        `SELECT pl.*, 
                p.plot_number,
                p.assignee_id,
                g.name as garden_name,
                u.first_name as gardener_first_name,
                u.last_name as gardener_last_name,
                (SELECT COUNT(*) FROM growth_logs WHERE plant_id = pl.id) as growth_log_count,
                (SELECT COUNT(*) FROM harvests WHERE plant_id = pl.id) as harvest_count,
                (SELECT COALESCE(SUM(quantity), 0) FROM harvests WHERE plant_id = pl.id) as total_harvested
         FROM plants pl
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY pl.planted_date DESC, pl.name
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

// Get plant by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);

    const plant = await new Promise((resolve, reject) => {
      db.get(
        `SELECT pl.*, 
                p.plot_number,
                p.assignee_id,
                p.size_sqft as plot_size,
                p.soil_type,
                p.sun_exposure,
                g.name as garden_name,
                g.location as garden_location,
                u.first_name as gardener_first_name,
                u.last_name as gardener_last_name,
                u.email as gardener_email,
                (SELECT COUNT(*) FROM growth_logs WHERE plant_id = pl.id) as growth_log_count,
                (SELECT COUNT(*) FROM harvests WHERE plant_id = pl.id) as harvest_count,
                (SELECT COALESCE(SUM(quantity), 0) FROM harvests WHERE plant_id = pl.id) as total_harvested
         FROM plants pl
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE pl.id = ?`,
        [plantId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!plant) {
      throw new AppError('Plant not found', 404, 'PLANT_NOT_FOUND');
    }

    res.json({ plant });
  })
);

// Create new plant
router.post('/',
  authenticateToken,
  validatePlant,
  checkOwnership('plot', 'plot_id'),
  logActivity('plant_create', 'plant'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      plot_id,
      name,
      variety,
      plant_type,
      planted_date,
      expected_harvest_date,
      quantity,
      spacing_inches,
      depth_inches,
      seed_source,
      organic,
      companion_plants,
      notes
    } = req.body;

    const plant = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO plants 
         (plot_id, name, variety, plant_type, planted_date, expected_harvest_date,
          quantity, spacing_inches, depth_inches, seed_source, organic, 
          companion_plants, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plot_id, name, variety, plant_type, planted_date, expected_harvest_date,
         quantity || 1, spacing_inches, depth_inches, seed_source, organic ? 1 : 0,
         companion_plants, notes],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created plant with plot info
            db.get(
              `SELECT pl.*, 
                      p.plot_number,
                      g.name as garden_name
               FROM plants pl
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE pl.id = ?`,
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
      message: 'Plant created successfully',
      plant
    });
  })
);

// Update plant
router.put('/:id',
  authenticateToken,
  validateId,
  validatePlant,
  checkOwnership('plant'),
  logActivity('plant_update', 'plant'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);

    const allowedFields = [
      'name', 'variety', 'plant_type', 'planted_date', 'expected_harvest_date',
      'actual_harvest_date', 'quantity', 'spacing_inches', 'depth_inches',
      'seed_source', 'organic', 'companion_plants', 'notes', 'status'
    ];

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (key === 'organic') {
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
    values.push(plantId);

    const updatedPlant = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE plants SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plant not found', 404, 'PLANT_NOT_FOUND'));
          } else {
            // Return updated plant
            db.get(
              `SELECT pl.*, 
                      p.plot_number,
                      g.name as garden_name
               FROM plants pl
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE pl.id = ?`,
              [plantId],
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
      message: 'Plant updated successfully',
      plant: updatedPlant
    });
  })
);

// Delete plant
router.delete('/:id',
  authenticateToken,
  validateId,
  checkOwnership('plant'),
  logActivity('plant_delete', 'plant'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM plants WHERE id = ?',
        [plantId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Plant not found', 404, 'PLANT_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Plant deleted successfully'
    });
  })
);

// Get plant growth logs
router.get('/:id/growth-logs',
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if plant exists
    const plant = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM plants WHERE id = ?', [plantId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plant) {
      throw new AppError('Plant not found', 404, 'PLANT_NOT_FOUND');
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as total FROM growth_logs WHERE plant_id = ?',
        [plantId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get growth logs
    const growthLogs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT gl.*, 
                u.first_name as created_by_first_name,
                u.last_name as created_by_last_name
         FROM growth_logs gl
         LEFT JOIN users u ON gl.created_by = u.id
         WHERE gl.plant_id = ?
         ORDER BY gl.log_date DESC
         LIMIT ? OFFSET ?`,
        [plantId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      growthLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get plant harvests
router.get('/:id/harvests',
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if plant exists
    const plant = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM plants WHERE id = ?', [plantId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plant) {
      throw new AppError('Plant not found', 404, 'PLANT_NOT_FOUND');
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as total FROM harvests WHERE plant_id = ?',
        [plantId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get harvests
    const harvests = await new Promise((resolve, reject) => {
      db.all(
        `SELECT h.*, 
                u.first_name as harvested_by_first_name,
                u.last_name as harvested_by_last_name
         FROM harvests h
         LEFT JOIN users u ON h.harvested_by = u.id
         WHERE h.plant_id = ?
         ORDER BY h.harvest_date DESC
         LIMIT ? OFFSET ?`,
        [plantId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      harvests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get plant statistics
router.get('/:id/stats',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.id);

    // Check if plant exists
    const plant = await new Promise((resolve, reject) => {
      db.get('SELECT planted_date FROM plants WHERE id = ?', [plantId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plant) {
      throw new AppError('Plant not found', 404, 'PLANT_NOT_FOUND');
    }

    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           COUNT(DISTINCT gl.id) as total_growth_logs,
           COUNT(DISTINCT h.id) as total_harvests,
           COALESCE(SUM(h.quantity), 0) as total_harvest_quantity,
           COALESCE(AVG(h.quality_rating), 0) as average_quality_rating,
           MAX(gl.height_inches) as max_height,
           MAX(gl.width_inches) as max_width,
           julianday('now') - julianday(?) as days_since_planted
         FROM plants p
         LEFT JOIN growth_logs gl ON p.id = gl.plant_id
         LEFT JOIN harvests h ON p.id = h.plant_id
         WHERE p.id = ?`,
        [plant.planted_date, plantId],
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