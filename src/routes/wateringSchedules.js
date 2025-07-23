const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database/init');
const { authenticateToken, checkOwnership, logActivity } = require('../middleware/auth');
const { validateWateringSchedule, validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Get all watering schedules
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const plotId = req.query.plot_id;
    const gardenId = req.query.garden_id;
    const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : true;
    const dueToday = req.query.due_today === 'true';

    let whereClause = 'ws.is_active = ?';
    let params = [isActive ? 1 : 0];

    if (plotId) {
      whereClause += ' AND ws.plot_id = ?';
      params.push(parseInt(plotId));
    }

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    if (dueToday) {
      whereClause += ' AND (ws.next_watering <= date("now") OR ws.next_watering IS NULL)';
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total 
         FROM watering_schedules ws
         JOIN plots p ON ws.plot_id = p.id
         WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get watering schedules with plot and garden info
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ws.*, 
                p.plot_number,
                p.assignee_id,
                g.name as garden_name,
                g.location as garden_location,
                u.first_name as assignee_first_name,
                u.last_name as assignee_last_name,
                CASE 
                  WHEN ws.next_watering <= date('now') THEN 'overdue'
                  WHEN ws.next_watering = date('now', '+1 day') THEN 'due_tomorrow'
                  WHEN ws.next_watering <= date('now', '+7 days') THEN 'due_this_week'
                  ELSE 'future'
                END as status
         FROM watering_schedules ws
         JOIN plots p ON ws.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY 
           CASE WHEN ws.next_watering <= date('now') THEN 0 ELSE 1 END,
           ws.next_watering ASC,
           g.name, p.plot_number
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      schedules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get watering schedule by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const scheduleId = parseInt(req.params.id);

    const schedule = await new Promise((resolve, reject) => {
      db.get(
        `SELECT ws.*, 
                p.plot_number,
                p.assignee_id,
                p.size_sqft,
                g.name as garden_name,
                g.location as garden_location,
                u.first_name as assignee_first_name,
                u.last_name as assignee_last_name,
                u.email as assignee_email
         FROM watering_schedules ws
         JOIN plots p ON ws.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ws.id = ?`,
        [scheduleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!schedule) {
      throw new AppError('Watering schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    res.json({ schedule });
  })
);

// Create new watering schedule
router.post('/',
  authenticateToken,
  validateWateringSchedule,
  checkOwnership('plot', 'plot_id'),
  logActivity('watering_schedule_create', 'watering_schedule'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const {
      plot_id,
      schedule_name,
      frequency_days,
      time_of_day,
      duration_minutes,
      water_amount_gallons,
      automated,
      notes
    } = req.body;

    // Calculate next watering date
    const nextWatering = new Date();
    nextWatering.setDate(nextWatering.getDate() + frequency_days);
    const nextWateringStr = nextWatering.toISOString().split('T')[0];

    const schedule = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO watering_schedules 
         (plot_id, schedule_name, frequency_days, time_of_day, duration_minutes,
          water_amount_gallons, automated, notes, next_watering) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plot_id, schedule_name, frequency_days, time_of_day, duration_minutes,
         water_amount_gallons, automated ? 1 : 0, notes, nextWateringStr],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return created schedule with plot info
            db.get(
              `SELECT ws.*, 
                      p.plot_number,
                      g.name as garden_name
               FROM watering_schedules ws
               JOIN plots p ON ws.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE ws.id = ?`,
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
      message: 'Watering schedule created successfully',
      schedule
    });
  })
);

// Update watering schedule
router.put('/:id',
  authenticateToken,
  validateId,
  validateWateringSchedule,
  checkOwnership('watering_schedule', 'id'),
  logActivity('watering_schedule_update', 'watering_schedule'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const scheduleId = parseInt(req.params.id);

    const allowedFields = [
      'schedule_name', 'frequency_days', 'time_of_day', 'duration_minutes',
      'water_amount_gallons', 'is_active', 'automated', 'notes'
    ];

    const updates = [];
    const values = [];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        if (key === 'is_active' || key === 'automated') {
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

    // If frequency changed, recalculate next watering date
    if (req.body.frequency_days) {
      const nextWatering = new Date();
      nextWatering.setDate(nextWatering.getDate() + req.body.frequency_days);
      updates.push('next_watering = ?');
      values.push(nextWatering.toISOString().split('T')[0]);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(scheduleId);

    const updatedSchedule = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE watering_schedules SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Watering schedule not found', 404, 'SCHEDULE_NOT_FOUND'));
          } else {
            // Return updated schedule
            db.get(
              `SELECT ws.*, 
                      p.plot_number,
                      g.name as garden_name
               FROM watering_schedules ws
               JOIN plots p ON ws.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE ws.id = ?`,
              [scheduleId],
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
      message: 'Watering schedule updated successfully',
      schedule: updatedSchedule
    });
  })
);

// Mark watering as completed
router.post('/:id/complete',
  authenticateToken,
  validateId,
  checkOwnership('watering_schedule', 'id'),
  logActivity('watering_completed', 'watering_schedule'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const scheduleId = parseInt(req.params.id);
    const { notes } = req.body;

    // Get current schedule to calculate next watering date
    const currentSchedule = await new Promise((resolve, reject) => {
      db.get(
        'SELECT frequency_days FROM watering_schedules WHERE id = ?',
        [scheduleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!currentSchedule) {
      throw new AppError('Watering schedule not found', 404, 'SCHEDULE_NOT_FOUND');
    }

    // Calculate next watering date
    const nextWatering = new Date();
    nextWatering.setDate(nextWatering.getDate() + currentSchedule.frequency_days);
    const nextWateringStr = nextWatering.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const updatedSchedule = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE watering_schedules 
         SET last_watered = ?, next_watering = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [today, nextWateringStr, scheduleId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Return updated schedule
            db.get(
              `SELECT ws.*, 
                      p.plot_number,
                      g.name as garden_name
               FROM watering_schedules ws
               JOIN plots p ON ws.plot_id = p.id
               JOIN gardens g ON p.garden_id = g.id
               WHERE ws.id = ?`,
              [scheduleId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    // Log the watering activity in growth logs if there are plants in the plot
    db.all(
      'SELECT id FROM plants WHERE plot_id = ? AND status = "planted"',
      [updatedSchedule.plot_id],
      (err, plants) => {
        if (!err && plants.length > 0) {
          plants.forEach(plant => {
            db.run(
              `INSERT INTO growth_logs 
               (plant_id, log_date, watered, notes, created_by)
               VALUES (?, ?, 1, ?, ?)`,
              [plant.id, today, notes || 'Scheduled watering completed', req.user.id],
              (err) => {
                if (err) {
                  console.error('Error creating growth log for watering:', err);
                }
              }
            );
          });
        }
      }
    );

    res.json({
      message: 'Watering marked as completed',
      schedule: updatedSchedule
    });
  })
);

// Delete watering schedule
router.delete('/:id',
  authenticateToken,
  validateId,
  checkOwnership('watering_schedule', 'id'),
  logActivity('watering_schedule_delete', 'watering_schedule'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const scheduleId = parseInt(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM watering_schedules WHERE id = ?',
        [scheduleId],
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Watering schedule not found', 404, 'SCHEDULE_NOT_FOUND'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({
      message: 'Watering schedule deleted successfully'
    });
  })
);

// Get watering calendar for a date range
router.get('/calendar/:startDate/:endDate',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { startDate, endDate } = req.params;
    const gardenId = req.query.garden_id;
    const plotId = req.query.plot_id;

    let whereClause = 'ws.is_active = 1 AND ws.next_watering BETWEEN ? AND ?';
    let params = [startDate, endDate];

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    if (plotId) {
      whereClause += ' AND ws.plot_id = ?';
      params.push(parseInt(plotId));
    }

    const calendar = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ws.id, ws.schedule_name, ws.next_watering, ws.time_of_day,
                ws.duration_minutes, ws.water_amount_gallons,
                p.plot_number, g.name as garden_name,
                u.first_name as assignee_first_name, u.last_name as assignee_last_name
         FROM watering_schedules ws
         JOIN plots p ON ws.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY ws.next_watering, ws.time_of_day`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Group by date
    const calendarByDate = {};
    calendar.forEach(item => {
      const date = item.next_watering;
      if (!calendarByDate[date]) {
        calendarByDate[date] = [];
      }
      calendarByDate[date].push(item);
    });

    res.json({
      calendar: calendarByDate,
      period: { start: startDate, end: endDate }
    });
  })
);

// Get overdue watering schedules
router.get('/overdue/summary',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = req.query.garden_id;

    let whereClause = 'ws.is_active = 1 AND ws.next_watering < date("now")';
    let params = [];

    if (gardenId) {
      whereClause += ' AND p.garden_id = ?';
      params.push(parseInt(gardenId));
    }

    const overdueSchedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ws.*, 
                p.plot_number,
                p.assignee_id,
                g.name as garden_name,
                u.first_name as assignee_first_name,
                u.last_name as assignee_last_name,
                u.email as assignee_email,
                julianday('now') - julianday(ws.next_watering) as days_overdue
         FROM watering_schedules ws
         JOIN plots p ON ws.plot_id = p.id
         JOIN gardens g ON p.garden_id = g.id
         LEFT JOIN users u ON p.assignee_id = u.id
         WHERE ${whereClause}
         ORDER BY days_overdue DESC, g.name, p.plot_number`,
        params,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Group by assignee for notification purposes
    const byAssignee = {};
    overdueSchedules.forEach(schedule => {
      const assigneeId = schedule.assignee_id;
      if (assigneeId) {
        if (!byAssignee[assigneeId]) {
          byAssignee[assigneeId] = {
            assignee: {
              id: assigneeId,
              first_name: schedule.assignee_first_name,
              last_name: schedule.assignee_last_name,
              email: schedule.assignee_email
            },
            schedules: []
          };
        }
        byAssignee[assigneeId].schedules.push(schedule);
      }
    });

    res.json({
      overdueSchedules,
      byAssignee: Object.values(byAssignee),
      total: overdueSchedules.length
    });
  })
);

// Bulk update watering schedules (for batch operations)
router.post('/bulk-update',
  authenticateToken,
  logActivity('watering_schedule_bulk_update', 'watering_schedule'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { schedule_ids, updates } = req.body;

    if (!schedule_ids || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
      throw new AppError('Schedule IDs array is required', 400, 'MISSING_SCHEDULE_IDS');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new AppError('Updates object is required', 400, 'MISSING_UPDATES');
    }

    const allowedFields = [
      'frequency_days', 'time_of_day', 'duration_minutes',
      'water_amount_gallons', 'is_active', 'automated'
    ];

    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'is_active' || key === 'automated') {
          updateFields.push(`${key} = ?`);
          values.push(updates[key] ? 1 : 0);
        } else {
          updateFields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid update fields provided', 400, 'NO_VALID_UPDATES');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Verify ownership of all schedules (non-admin users)
    if (req.user.role !== 'admin') {
      const ownershipCheck = await new Promise((resolve, reject) => {
        const placeholders = schedule_ids.map(() => '?').join(',');
        db.all(
          `SELECT ws.id, p.assignee_id
           FROM watering_schedules ws
           JOIN plots p ON ws.plot_id = p.id
           WHERE ws.id IN (${placeholders})`,
          schedule_ids,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const unauthorizedSchedules = ownershipCheck.filter(s => s.assignee_id !== req.user.id);
      if (unauthorizedSchedules.length > 0) {
        throw new AppError('Access denied for some schedules', 403, 'ACCESS_DENIED');
      }
    }

    // Perform bulk update
    const placeholders = schedule_ids.map(() => '?').join(',');
    const updatedCount = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE watering_schedules 
         SET ${updateFields.join(', ')} 
         WHERE id IN (${placeholders})`,
        [...values, ...schedule_ids],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({
      message: `${updatedCount} watering schedules updated successfully`,
      updated_count: updatedCount
    });
  })
);

module.exports = router;