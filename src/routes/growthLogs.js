const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, checkOwnership, logActivity } = require('../middleware/auth');
const { validateGrowthLog, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all growth logs (with filtering)
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const plantId = req.query.plant_id;
    const plotId = req.query.plot_id;
    const healthStatus = req.query.health_status;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    let whereClause = '1=1';
    let params = [];

    if (plantId) {
      whereClause += ' AND gl.plant_id = ?';
      params.push(parseInt(plantId));
    }

    if (plotId) {
      whereClause += ' AND pl.plot_id = ?';
      params.push(parseInt(plotId));
    }

    if (healthStatus) {
      whereClause += ' AND gl.health_status = ?';
      params.push(healthStatus);
    }

    if (startDate) {
      whereClause += ' AND gl.log_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND gl.log_date <= ?';
      params.push(endDate);
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total 
         FROM growth_logs gl 
         JOIN plants pl ON gl.plant_id = pl.id 
         WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get growth logs with plant and plot info
    const growthLogs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT gl.*, 
                pl.name as plant_name,
                pl.variety as plant_variety,
                p.plot_number,
                g.name as garden_name,
                u.first_name as created_by_first_name,
                u.last_name as created_by_last_name
         FROM growth_logs gl
         JOIN plants pl ON gl.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON gl.created_by = u.id
         WHERE ${whereClause}
         ORDER BY gl.log_date DESC, gl.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
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

// Get growth log by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const logId = parseInt(req.params.id);

    const growthLog = await new Promise((resolve, reject) => {
      db.get(
        `SELECT gl.*, 
                pl.name as plant_name,
                pl.variety as plant_variety,
                pl.planted_date,
                p.plot_number,
                p.assignee_id,
                g.name as garden_name,
                u.first_name as created_by_first_name,
                u.last_name as created_by_last_name
         FROM growth_logs gl
         JOIN plants pl ON gl.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON gl.created_by = u.id
         WHERE gl.id = ?`,
        [logId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!growthLog) {
      throw new AppError('Growth log not found', 404, 'GROWTH_LOG_NOT_FOUND');
    }

    res.json({ growthLog });
  })
);

// Create new growth log
router.post('/',
  authenticateToken,
  validateGrowthLog,
  checkOwnership('plant', 'plant_id'),
  logActivity('growth_log_create', 'growth_log'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      plant_id,
      log_date,
      height_inches,
      width_inches,
      health_status,
      notes,
      weather_conditions,
      pest_issues,
      disease_issues,
      fertilizer_applied,
      watered,
      photos
    } = req.body;

    const growthLog = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO growth_logs 
         (plant_id, log_date, height_inches, width_inches, health_status, notes,
          weather_conditions, pest_issues, disease_issues, fertilizer_applied, 
          watered, photos, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plant_id, log_date, height_inches, width_inches, health_status, notes,
         weather_conditions, pest_issues, disease_issues, fertilizer_applied,
         watered ? 1 : 0, photos, req.user.id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created growth log with plant info
            db.get(
              `SELECT gl.*, 
                      pl.name as plant_name,
                      p.plot_number,
                      g.name as garden_name
               FROM growth_logs gl
               JOIN plants pl ON gl.plant_id = pl.id
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE gl.id = ?`,
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
      message: 'Growth log created successfully',
      growthLog
    });
  })
);

// Update growth log
router.put('/:id',
  authenticateToken,
  validateId,
  validateGrowthLog,
  checkOwnership('growth_log'),
  logActivity('growth_log_update', 'growth_log'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const logId = parseInt(req.params.id);

    const allowedFields = [
      'log_date', 'height_inches', 'width_inches', 'health_status', 'notes',
      'weather_conditions', 'pest_issues', 'disease_issues', 'fertilizer_applied',
      'watered', 'photos'
    ];

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (key === 'watered') {
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

    values.push(logId);

    const updatedGrowthLog = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE growth_logs SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Growth log not found', 404, 'GROWTH_LOG_NOT_FOUND'));
          } else {
            // Return updated growth log
            db.get(
              `SELECT gl.*, 
                      pl.name as plant_name,
                      p.plot_number,
                      g.name as garden_name
               FROM growth_logs gl
               JOIN plants pl ON gl.plant_id = pl.id
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE gl.id = ?`,
              [logId],
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
      message: 'Growth log updated successfully',
      growthLog: updatedGrowthLog
    });
  })
);

// Delete growth log
router.delete('/:id',
  authenticateToken,
  validateId,
  checkOwnership('growth_log'),
  logActivity('growth_log_delete', 'growth_log'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const logId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM growth_logs WHERE id = ?',
        [logId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Growth log not found', 404, 'GROWTH_LOG_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Growth log deleted successfully'
    });
  })
);

// Get growth trends for a plant
router.get('/plant/:plantId/trends',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const plantId = parseInt(req.params.plantId);
    const days = parseInt(req.query.days) || 30;

    // Check if plant exists
    const plant = await new Promise((resolve, reject) => {
      db.get('SELECT id, name FROM plants WHERE id = ?', [plantId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!plant) {
      throw new AppError('Plant not found', 404, 'PLANT_NOT_FOUND');
    }

    // Get growth trends
    const trends = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           log_date,
           height_inches,
           width_inches,
           health_status,
           watered,
           weather_conditions
         FROM growth_logs
         WHERE plant_id = ? AND log_date >= date('now', '-' || ? || ' days')
         ORDER BY log_date ASC`,
        [plantId, days],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Calculate growth statistics
    const stats = {
      total_logs: trends.length,
      growth_rate: 0,
      health_distribution: {},
      watering_frequency: 0
    };

    if (trends.length > 0) {
      // Calculate growth rate (height change over time)
      const firstLog = trends[0];
      const lastLog = trends[trends.length - 1];
      
      if (firstLog.height_inches && lastLog.height_inches) {
        const heightDiff = lastLog.height_inches - firstLog.height_inches;
        const daysDiff = Math.max(1, (new Date(lastLog.log_date) - new Date(firstLog.log_date)) / (1000 * 60 * 60 * 24));
        stats.growth_rate = heightDiff / daysDiff;
      }

      // Health distribution
      trends.forEach(log => {
        if (log.health_status) {
          stats.health_distribution[log.health_status] = (stats.health_distribution[log.health_status] || 0) + 1;
        }
      });

      // Watering frequency
      const wateredCount = trends.filter(log => log.watered).length;
      stats.watering_frequency = wateredCount / trends.length;
    }

    res.json({
      plant: { id: plant.id, name: plant.name },
      trends,
      stats,
      period_days: days
    });
  })
);

// Get health status summary for all plants
router.get('/health-summary',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = req.query.garden_id;
    const plotId = req.query.plot_id;

    let whereClause = '1=1';
    let params = [];

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    if (plotId) {
      whereClause += ' AND pl.plot_id = ?';
      params.push(parseInt(plotId));
    }

    const healthSummary = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           pl.id,
           pl.name,
           pl.variety,
           p.plot_number,
           g.name as garden_name,
           gl.health_status,
           gl.log_date,
           gl.pest_issues,
           gl.disease_issues
         FROM plants pl
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN (
           SELECT plant_id, health_status, log_date, pest_issues, disease_issues,
                  ROW_NUMBER() OVER (PARTITION BY plant_id ORDER BY log_date DESC) as rn
           FROM growth_logs
         ) gl ON pl.id = gl.plant_id AND gl.rn = 1
         WHERE ${whereClause}
         ORDER BY g.name, p.plot_number, pl.name`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Group by health status
    const summary = {
      excellent: [],
      good: [],
      fair: [],
      poor: [],
      dead: [],
      unknown: []
    };

    healthSummary.forEach(plant => {
      const status = plant.health_status || 'unknown';
      summary[status].push(plant);
    });

    res.json({ healthSummary: summary });
  })
);

module.exports = router;