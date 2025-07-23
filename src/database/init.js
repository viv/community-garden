const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_URL || './data/garden.db';

let db = null;

// Database schema
const TABLES = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'member',
      is_active BOOLEAN DEFAULT 1,
      email_verified BOOLEAN DEFAULT 0,
      profile_image VARCHAR(255),
      preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  
  refresh_tokens: `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `,
  
  gardens: `
    CREATE TABLE IF NOT EXISTS gardens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      size_sqft INTEGER,
      established_date DATE,
      manager_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      rules TEXT,
      amenities TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users (id)
    )
  `,
  
  plots: `
    CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      garden_id INTEGER NOT NULL,
      plot_number VARCHAR(20) NOT NULL,
      assignee_id INTEGER,
      size_sqft DECIMAL(8, 2),
      location_x DECIMAL(8, 2),
      location_y DECIMAL(8, 2),
      soil_type VARCHAR(50),
      sun_exposure VARCHAR(20),
      water_access BOOLEAN DEFAULT 0,
      status VARCHAR(20) DEFAULT 'available',
      assigned_date DATE,
      rental_fee DECIMAL(10, 2),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (garden_id) REFERENCES gardens (id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users (id),
      UNIQUE(garden_id, plot_number)
    )
  `,
  
  plants: `
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      variety VARCHAR(255),
      plant_type VARCHAR(50),
      planted_date DATE,
      expected_harvest_date DATE,
      actual_harvest_date DATE,
      quantity INTEGER DEFAULT 1,
      spacing_inches DECIMAL(4, 2),
      depth_inches DECIMAL(4, 2),
      seed_source VARCHAR(255),
      organic BOOLEAN DEFAULT 0,
      companion_plants TEXT,
      notes TEXT,
      status VARCHAR(20) DEFAULT 'planted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE
    )
  `,
  
  growth_logs: `
    CREATE TABLE IF NOT EXISTS growth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      log_date DATE NOT NULL,
      height_inches DECIMAL(6, 2),
      width_inches DECIMAL(6, 2),
      health_status VARCHAR(20),
      notes TEXT,
      weather_conditions VARCHAR(100),
      pest_issues TEXT,
      disease_issues TEXT,
      fertilizer_applied VARCHAR(255),
      watered BOOLEAN DEFAULT 0,
      photos TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `,
  
  watering_schedules: `
    CREATE TABLE IF NOT EXISTS watering_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL,
      schedule_name VARCHAR(255),
      frequency_days INTEGER NOT NULL,
      time_of_day TIME,
      duration_minutes INTEGER,
      water_amount_gallons DECIMAL(6, 2),
      is_active BOOLEAN DEFAULT 1,
      last_watered DATE,
      next_watering DATE,
      automated BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plot_id) REFERENCES plots (id) ON DELETE CASCADE
    )
  `,
  
  harvests: `
    CREATE TABLE IF NOT EXISTS harvests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id INTEGER NOT NULL,
      harvest_date DATE NOT NULL,
      quantity DECIMAL(8, 2) NOT NULL,
      unit VARCHAR(20) DEFAULT 'lbs',
      quality_rating INTEGER CHECK(quality_rating >= 1 AND quality_rating <= 5),
      notes TEXT,
      photos TEXT,
      harvested_by INTEGER,
      distributed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE,
      FOREIGN KEY (harvested_by) REFERENCES users (id)
    )
  `,
  
  weather_cache: `
    CREATE TABLE IF NOT EXISTS weather_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location VARCHAR(255) NOT NULL,
      weather_data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )
  `,
  
  photos: `
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255),
      file_path VARCHAR(500) NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      width INTEGER,
      height INTEGER,
      uploaded_by INTEGER,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      caption TEXT,
      is_primary BOOLEAN DEFAULT 0,
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )
  `,
  
  activity_logs: `
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `
};

// Indexes for performance optimization
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token)',
  'CREATE INDEX IF NOT EXISTS idx_plots_garden_id ON plots (garden_id)',
  'CREATE INDEX IF NOT EXISTS idx_plots_assignee_id ON plots (assignee_id)',
  'CREATE INDEX IF NOT EXISTS idx_plants_plot_id ON plants (plot_id)',
  'CREATE INDEX IF NOT EXISTS idx_growth_logs_plant_id ON growth_logs (plant_id)',
  'CREATE INDEX IF NOT EXISTS idx_growth_logs_date ON growth_logs (log_date)',
  'CREATE INDEX IF NOT EXISTS idx_watering_schedules_plot_id ON watering_schedules (plot_id)',
  'CREATE INDEX IF NOT EXISTS idx_harvests_plant_id ON harvests (plant_id)',
  'CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests (harvest_date)',
  'CREATE INDEX IF NOT EXISTS idx_weather_cache_location ON weather_cache (location)',
  'CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos (entity_type, entity_id)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at)'
];

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        return reject(err);
      }
      
      console.log('Connected to SQLite database');
      
      // Enable WAL mode for better performance
      db.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) {
          console.error('Error enabling WAL mode:', err);
        } else {
          console.log('WAL mode enabled');
        }
      });
      
      // Enable foreign key constraints
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
        } else {
          console.log('Foreign key constraints enabled');
        }
      });
      
      // Create tables
      const tableNames = Object.keys(TABLES);
      let tablesCreated = 0;
      
      tableNames.forEach((tableName) => {
        db.run(TABLES[tableName], (err) => {
          if (err) {
            console.error(`Error creating table ${tableName}:`, err);
            return reject(err);
          }
          
          tablesCreated++;
          console.log(`Table ${tableName} created/verified`);
          
          if (tablesCreated === tableNames.length) {
            // Create indexes
            let indexesCreated = 0;
            INDEXES.forEach((indexSql) => {
              db.run(indexSql, (err) => {
                if (err) {
                  console.error('Error creating index:', err);
                }
                indexesCreated++;
                if (indexesCreated === INDEXES.length) {
                  console.log('Database initialization completed');
                  resolve(db);
                }
              });
            });
            
            if (INDEXES.length === 0) {
              resolve(db);
            }
          }
        });
      });
      
      if (tableNames.length === 0) {
        resolve(db);
      }
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('Database connection closed');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
};