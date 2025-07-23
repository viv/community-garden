#!/usr/bin/env node

/**
 * Database migration script
 * Run with: npm run db:migrate
 */

require('dotenv').config();
const { initializeDatabase } = require('./init');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    console.log(`Database path: ${process.env.DATABASE_URL || './data/garden.db'}`);
    
    await initializeDatabase();
    
    console.log('✓ Database migration completed successfully!');
    console.log('Tables created and indexes applied.');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Database migration failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };