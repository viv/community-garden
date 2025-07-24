const cron = require('node-cron');
const { getDatabase } = require('../database/init');
const AuthService = require('./authService');

class BackgroundJobService {
  static jobs = new Map();

  static startBackgroundJobs() {
    console.log('Starting background jobs...');

    // Clean up expired refresh tokens (daily at 2 AM)
    this.scheduleJob('cleanup-refresh-tokens', '0 2 * * *', async () => {
      try {
        await AuthService.cleanupExpiredTokens();
        console.log('Completed: Refresh token cleanup');
      } catch (error) {
        console.error('Error in refresh token cleanup:', error);
      }
    });

    // Update watering schedules (daily at 1 AM)
    this.scheduleJob('update-watering-schedules', '0 1 * * *', async () => {
      try {
        await this.updateWateringSchedules();
        console.log('Completed: Watering schedule updates');
      } catch (error) {
        console.error('Error updating watering schedules:', error);
      }
    });

    // Clean up expired weather cache (every 6 hours)
    this.scheduleJob('cleanup-weather-cache', '0 */6 * * *', async () => {
      try {
        await this.cleanupWeatherCache();
        console.log('Completed: Weather cache cleanup');
      } catch (error) {
        console.error('Error cleaning weather cache:', error);
      }
    });

    // Generate harvest predictions (daily at 3 AM)
    this.scheduleJob('harvest-predictions', '0 3 * * *', async () => {
      try {
        await this.updateHarvestPredictions();
        console.log('Completed: Harvest predictions update');
      } catch (error) {
        console.error('Error updating harvest predictions:', error);
      }
    });

    // Clean up old activity logs (weekly on Sunday at 4 AM)
    this.scheduleJob('cleanup-activity-logs', '0 4 * * 0', async () => {
      try {
        await this.cleanupActivityLogs();
        console.log('Completed: Activity logs cleanup');
      } catch (error) {
        console.error('Error cleaning activity logs:', error);
      }
    });

    // Update plant statuses (daily at 5 AM)
    this.scheduleJob('update-plant-statuses', '0 5 * * *', async () => {
      try {
        await this.updatePlantStatuses();
        console.log('Completed: Plant status updates');
      } catch (error) {
        console.error('Error updating plant statuses:', error);
      }
    });

    // Database maintenance (weekly on Monday at 1 AM)
    this.scheduleJob('database-maintenance', '0 1 * * 1', async () => {
      try {
        await this.performDatabaseMaintenance();
        console.log('Completed: Database maintenance');
      } catch (error) {
        console.error('Error in database maintenance:', error);
      }
    });

    console.log(`Started ${this.jobs.size} background jobs`);
  }

  static scheduleJob(name, schedule, task) {
    const job = cron.schedule(schedule, task, {
      scheduled: true,
      timezone: 'America/New_York' // Adjust timezone as needed
    });

    this.jobs.set(name, {
      job,
      schedule,
      lastRun: null,
      nextRun: null // Will be set when job runs
    });
  }

  static async updateWateringSchedules() {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      // Update schedules where next_watering is today or overdue
      db.run(
        `UPDATE watering_schedules 
         SET next_watering = date(last_watered, '+' || frequency_days || ' days')
         WHERE is_active = 1 
           AND last_watered IS NOT NULL 
           AND (next_watering <= date('now') OR next_watering IS NULL)`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Updated ${this.changes} watering schedules`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async cleanupWeatherCache() {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM weather_cache WHERE expires_at <= datetime("now")',
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Cleaned up ${this.changes} expired weather cache entries`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async updateHarvestPredictions() {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      // Update expected harvest dates based on historical data
      db.run(
        `UPDATE plants 
         SET expected_harvest_date = date(planted_date, '+' || 
           COALESCE((
             SELECT CAST(AVG(julianday(h.harvest_date) - julianday(p2.planted_date)) AS INTEGER)
             FROM harvests h 
             JOIN plants p2 ON h.plant_id = p2.id 
             WHERE p2.name = plants.name AND p2.variety = plants.variety
           ), 90) || ' days')
         WHERE status = 'planted' 
           AND expected_harvest_date IS NULL 
           AND planted_date IS NOT NULL`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Updated harvest predictions for ${this.changes} plants`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async cleanupActivityLogs() {
    const db = getDatabase();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM activity_logs WHERE created_at < ?',
        [sixMonthsAgo.toISOString()],
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Cleaned up ${this.changes} old activity log entries`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async updatePlantStatuses() {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Mark plants as mature if they're past expected harvest date
        db.run(
          `UPDATE plants 
           SET status = 'mature' 
           WHERE status = 'planted' 
             AND expected_harvest_date IS NOT NULL 
             AND expected_harvest_date <= date('now')`,
          function(err) {
            if (err) {
              console.error('Error updating mature plant statuses:', err);
            } else {
              console.log(`Marked ${this.changes} plants as mature`);
            }
          }
        );

        // Mark plants as harvested if they have harvest records
        db.run(
          `UPDATE plants 
           SET status = 'harvested', actual_harvest_date = (
             SELECT MIN(harvest_date) 
             FROM harvests 
             WHERE plant_id = plants.id
           )
           WHERE status IN ('planted', 'mature') 
             AND id IN (SELECT DISTINCT plant_id FROM harvests)`,
          function(err) {
            if (err) {
              console.error('Error updating harvested plant statuses:', err);
              reject(err);
            } else {
              console.log(`Marked ${this.changes} plants as harvested`);
              resolve();
            }
          }
        );
      });
    });
  }

  static async performDatabaseMaintenance() {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // VACUUM to reclaim space
        db.run('VACUUM', (err) => {
          if (err) {
            console.error('Error during VACUUM:', err);
          } else {
            console.log('Database VACUUM completed');
          }
        });

        // ANALYZE to update query planner statistics
        db.run('ANALYZE', (err) => {
          if (err) {
            console.error('Error during ANALYZE:', err);
          } else {
            console.log('Database ANALYZE completed');
          }
        });

        // Clean up orphaned photos
        db.run(
          `DELETE FROM photos 
           WHERE entity_type = 'plant' 
             AND entity_id NOT IN (SELECT id FROM plants)`,
          function(err) {
            if (err) {
              console.error('Error cleaning orphaned plant photos:', err);
            } else {
              console.log(`Cleaned up ${this.changes} orphaned plant photos`);
            }
          }
        );

        db.run(
          `DELETE FROM photos 
           WHERE entity_type = 'plot' 
             AND entity_id NOT IN (SELECT id FROM plots)`,
          function(err) {
            if (err) {
              console.error('Error cleaning orphaned plot photos:', err);
            } else {
              console.log(`Cleaned up ${this.changes} orphaned plot photos`);
            }
          }
        );

        db.run(
          `DELETE FROM photos 
           WHERE entity_type = 'garden' 
             AND entity_id NOT IN (SELECT id FROM gardens)`,
          function(err) {
            if (err) {
              console.error('Error cleaning orphaned garden photos:', err);
              reject(err);
            } else {
              console.log(`Cleaned up ${this.changes} orphaned garden photos`);
              resolve();
            }
          }
        );
      });
    });
  }

  static getJobStatus() {
    const jobStatuses = {};
    
    for (const [name, jobInfo] of this.jobs.entries()) {
      jobStatuses[name] = {
        schedule: jobInfo.schedule,
        running: jobInfo.job.options?.scheduled || false,
        lastRun: jobInfo.lastRun,
        nextRun: jobInfo.nextRun
      };
    }
    
    return jobStatuses;
  }

  static stopJob(jobName) {
    const jobInfo = this.jobs.get(jobName);
    if (jobInfo) {
      jobInfo.job.stop();
      return true;
    }
    return false;
  }

  static startJob(jobName) {
    const jobInfo = this.jobs.get(jobName);
    if (jobInfo) {
      jobInfo.job.start();
      return true;
    }
    return false;
  }

  static stopAllJobs() {
    for (const [name, jobInfo] of this.jobs.entries()) {
      jobInfo.job.stop();
    }
    console.log('All background jobs stopped');
  }

  static async runJobNow(jobName) {
    const jobInfo = this.jobs.get(jobName);
    if (!jobInfo) {
      throw new Error(`Job '${jobName}' not found`);
    }

    // Execute the job's task function
    try {
      switch (jobName) {
        case 'cleanup-refresh-tokens':
          await AuthService.cleanupExpiredTokens();
          break;
        case 'update-watering-schedules':
          await this.updateWateringSchedules();
          break;
        case 'cleanup-weather-cache':
          await this.cleanupWeatherCache();
          break;
        case 'harvest-predictions':
          await this.updateHarvestPredictions();
          break;
        case 'cleanup-activity-logs':
          await this.cleanupActivityLogs();
          break;
        case 'update-plant-statuses':
          await this.updatePlantStatuses();
          break;
        case 'database-maintenance':
          await this.performDatabaseMaintenance();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      
      jobInfo.lastRun = new Date().toISOString();
      return true;
    } catch (error) {
      console.error(`Error running job '${jobName}':`, error);
      throw error;
    }
  }

  // Notification system for critical events
  static async sendNotification(type, message, data = {}) {
    console.log(`NOTIFICATION [${type}]: ${message}`, data);
    
    // In a production environment, you would integrate with:
    // - Email service (SendGrid, AWS SES, etc.)
    // - Push notification service
    // - Slack/Discord webhook
    // - SMS service
    
    // For now, just log to console and optionally store in database
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO activity_logs 
         (action, entity_type, details, created_at) 
         VALUES (?, ?, ?, ?)`,
        ['system_notification', type, JSON.stringify({ message, ...data }), new Date().toISOString()],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Health check for background jobs
  static getSystemHealth() {
    const jobStatuses = this.getJobStatus();
    const totalJobs = Object.keys(jobStatuses).length;
    const runningJobs = Object.values(jobStatuses).filter(job => job.running).length;
    
    return {
      status: runningJobs === totalJobs ? 'healthy' : 'degraded',
      total_jobs: totalJobs,
      running_jobs: runningJobs,
      stopped_jobs: totalJobs - runningJobs,
      jobs: jobStatuses,
      last_check: new Date().toISOString()
    };
  }
}

// Export functions for manual execution and testing
const startBackgroundJobs = () => BackgroundJobService.startBackgroundJobs();
const stopAllJobs = () => BackgroundJobService.stopAllJobs();
const getJobStatus = () => BackgroundJobService.getJobStatus();
const runJobNow = (jobName) => BackgroundJobService.runJobNow(jobName);
const getSystemHealth = () => BackgroundJobService.getSystemHealth();

module.exports = {
  startBackgroundJobs,
  stopAllJobs,
  getJobStatus,
  runJobNow,
  getSystemHealth,
  BackgroundJobService
};