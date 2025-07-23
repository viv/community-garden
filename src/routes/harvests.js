const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, checkOwnership, logActivity } = require('../middleware/auth');
const { validateHarvest, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all harvests (with filtering)
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const plantId = req.query.plant_id;
    const plotId = req.query.plot_id;
    const gardenId = req.query.garden_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const harvestedBy = req.query.harvested_by;

    let whereClause = '1=1';
    let params = [];

    if (plantId) {
      whereClause += ' AND h.plant_id = ?';
      params.push(parseInt(plantId));
    }

    if (plotId) {
      whereClause += ' AND pl.plot_id = ?';
      params.push(parseInt(plotId));
    }

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    if (startDate) {
      whereClause += ' AND h.harvest_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND h.harvest_date <= ?';
      params.push(endDate);
    }

    if (harvestedBy) {
      whereClause += ' AND h.harvested_by = ?';
      params.push(parseInt(harvestedBy));
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total 
         FROM harvests h 
         JOIN plants pl ON h.plant_id = pl.id 
         JOIN plots p ON pl.plot_id = p.id
         WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get harvests with plant and plot info
    const harvests = await new Promise((resolve, reject) => {
      db.all(
        `SELECT h.*, 
                pl.name as plant_name,
                pl.variety as plant_variety,
                p.plot_number,
                g.name as garden_name,
                u.first_name as harvested_by_first_name,
                u.last_name as harvested_by_last_name
         FROM harvests h
         JOIN plants pl ON h.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON h.harvested_by = u.id
         WHERE ${whereClause}
         ORDER BY h.harvest_date DESC, h.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
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

// Get harvest by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const harvestId = parseInt(req.params.id);

    const harvest = await new Promise((resolve, reject) => {
      db.get(
        `SELECT h.*, 
                pl.name as plant_name,
                pl.variety as plant_variety,
                pl.planted_date,
                p.plot_number,
                p.assignee_id,
                g.name as garden_name,
                u.first_name as harvested_by_first_name,
                u.last_name as harvested_by_last_name
         FROM harvests h
         JOIN plants pl ON h.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON h.harvested_by = u.id
         WHERE h.id = ?`,
        [harvestId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!harvest) {
      throw new AppError('Harvest not found', 404, 'HARVEST_NOT_FOUND');
    }

    res.json({ harvest });
  })
);

// Create new harvest
router.post('/',
  authenticateToken,
  validateHarvest,
  checkOwnership('plant', 'plant_id'),
  logActivity('harvest_create', 'harvest'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      plant_id,
      harvest_date,
      quantity,
      unit,
      quality_rating,
      notes,
      photos,
      distributed
    } = req.body;

    const harvest = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO harvests 
         (plant_id, harvest_date, quantity, unit, quality_rating, notes, photos, 
          distributed, harvested_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plant_id, harvest_date, quantity, unit || 'lbs', quality_rating, notes, 
         photos, distributed ? 1 : 0, req.user.id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created harvest with plant info
            db.get(
              `SELECT h.*, 
                      pl.name as plant_name,
                      p.plot_number,
                      g.name as garden_name
               FROM harvests h
               JOIN plants pl ON h.plant_id = pl.id
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE h.id = ?`,
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

    // Update plant harvest date if this is the first harvest
    db.run(
      `UPDATE plants 
       SET actual_harvest_date = COALESCE(actual_harvest_date, ?), 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [harvest_date, plant_id],
      (err) => {
        if (err) {
          console.error('Error updating plant harvest date:', err);
        }
      }
    );

    res.status(201).json({
      message: 'Harvest recorded successfully',
      harvest
    });
  })
);

// Update harvest
router.put('/:id',
  authenticateToken,
  validateId,
  validateHarvest,
  checkOwnership('harvest', 'id'),
  logActivity('harvest_update', 'harvest'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const harvestId = parseInt(req.params.id);

    const allowedFields = [
      'harvest_date', 'quantity', 'unit', 'quality_rating', 'notes', 
      'photos', 'distributed'
    ];

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (key === 'distributed') {
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

    values.push(harvestId);

    const updatedHarvest = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE harvests SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Harvest not found', 404, 'HARVEST_NOT_FOUND'));
          } else {
            // Return updated harvest
            db.get(
              `SELECT h.*, 
                      pl.name as plant_name,
                      p.plot_number,
                      g.name as garden_name
               FROM harvests h
               JOIN plants pl ON h.plant_id = pl.id
               JOIN plots p ON pl.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE h.id = ?`,
              [harvestId],
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
      message: 'Harvest updated successfully',
      harvest: updatedHarvest
    });
  })
);

// Delete harvest
router.delete('/:id',
  authenticateToken,
  validateId,
  checkOwnership('harvest', 'id'),
  logActivity('harvest_delete', 'harvest'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const harvestId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM harvests WHERE id = ?',
        [harvestId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Harvest not found', 404, 'HARVEST_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Harvest deleted successfully'
    });
  })
);

// Get harvest statistics
router.get('/stats/summary',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = req.query.garden_id;
    const plotId = req.query.plot_id;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const year = req.query.year || new Date().getFullYear();

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

    if (startDate && endDate) {
      whereClause += ' AND h.harvest_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else {
      whereClause += ' AND strftime("%Y", h.harvest_date) = ?';
      params.push(year.toString());
    }

    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           COUNT(h.id) as total_harvests,
           COUNT(DISTINCT h.plant_id) as plants_harvested,
           COUNT(DISTINCT pl.plot_id) as plots_with_harvests,
           COALESCE(SUM(h.quantity), 0) as total_quantity,
           COALESCE(AVG(h.quantity), 0) as average_quantity,
           COALESCE(AVG(h.quality_rating), 0) as average_quality,
           MAX(h.quantity) as largest_harvest,
           MIN(h.harvest_date) as first_harvest,
           MAX(h.harvest_date) as last_harvest
         FROM harvests h
         JOIN plants pl ON h.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get harvest breakdown by plant type
    const plantTypeBreakdown = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           COALESCE(pl.plant_type, 'Unknown') as plant_type,
           COUNT(h.id) as harvest_count,
           COALESCE(SUM(h.quantity), 0) as total_quantity,
           COALESCE(AVG(h.quality_rating), 0) as average_quality
         FROM harvests h
         JOIN plants pl ON h.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         WHERE ${whereClause}
         GROUP BY pl.plant_type
         ORDER BY total_quantity DESC`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get monthly harvest trend
    const monthlyTrend = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           strftime('%Y-%m', h.harvest_date) as month,
           COUNT(h.id) as harvest_count,
           COALESCE(SUM(h.quantity), 0) as total_quantity,
           COUNT(DISTINCT h.plant_id) as unique_plants
         FROM harvests h
         JOIN plants pl ON h.plant_id = pl.id
         JOIN plots p ON pl.plot_id = p.id
         WHERE ${whereClause}
         GROUP BY strftime('%Y-%m', h.harvest_date)
         ORDER BY month`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      stats,
      plantTypeBreakdown,
      monthlyTrend,
      period: startDate && endDate ? { startDate, endDate } : { year }
    });
  })
);

// Get top performing plants
router.get('/stats/top-performers',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const limit = parseInt(req.query.limit) || 10;
    const metric = req.query.metric || 'quantity'; // quantity, quality, frequency
    const gardenId = req.query.garden_id;

    let whereClause = '1=1';
    let params = [];

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    let orderBy;
    switch (metric) {
      case 'quality':
        orderBy = 'average_quality DESC, total_quantity DESC';
        break;
      case 'frequency':
        orderBy = 'harvest_count DESC, total_quantity DESC';
        break;
      default:
        orderBy = 'total_quantity DESC';
    }

    const topPerformers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           pl.id,
           pl.name,
           pl.variety,
           pl.plant_type,
           pl.planted_date,
           p.plot_number,
           g.name as garden_name,
           COUNT(h.id) as harvest_count,
           COALESCE(SUM(h.quantity), 0) as total_quantity,
           COALESCE(AVG(h.quantity), 0) as average_quantity,
           COALESCE(AVG(h.quality_rating), 0) as average_quality,
           MAX(h.harvest_date) as last_harvest_date,
           MIN(h.harvest_date) as first_harvest_date
         FROM plants pl
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         JOIN harvests h ON pl.id = h.plant_id
         WHERE ${whereClause}
         GROUP BY pl.id
         ORDER BY ${orderBy}
         LIMIT ?`,
        [...params, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ topPerformers, metric, limit });
  })
);

// Get harvest predictions based on historical data
router.get('/predictions',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = req.query.garden_id;
    const plotId = req.query.plot_id;
    const days = parseInt(req.query.days) || 30;

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

    // Get plants that should be ready for harvest soon
    const predictions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           pl.id,
           pl.name,
           pl.variety,
           pl.plant_type,
           pl.planted_date,
           pl.expected_harvest_date,
           p.plot_number,
           g.name as garden_name,
           u.first_name as gardener_first_name,
           u.last_name as gardener_last_name,
           julianday(pl.expected_harvest_date) - julianday('now') as days_to_harvest,
           (SELECT COUNT(*) FROM harvests WHERE plant_id = pl.id) as harvest_count,
           (SELECT AVG(julianday(h.harvest_date) - julianday(pl.planted_date))
            FROM harvests h 
            JOIN plants p2 ON h.plant_id = p2.id 
            WHERE p2.name = pl.name AND p2.variety = pl.variety) as avg_days_to_harvest
         FROM plants pl
         JOIN plots p ON pl.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
           AND pl.status = 'planted'
           AND (pl.expected_harvest_date IS NULL 
                OR julianday(pl.expected_harvest_date) - julianday('now') <= ?)
         ORDER BY days_to_harvest ASC`,
        [...params, days],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({ 
      predictions,
      period_days: days,
      generated_at: new Date().toISOString()
    });
  })
);

module.exports = router;