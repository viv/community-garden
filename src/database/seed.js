#!/usr/bin/env node

/**
 * Database seeding script
 * Run with: npm run db:seed
 */

require('dotenv').config();
const { getDatabase, initializeDatabase } = require('./init');
const AuthService = require('../services/authService');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Ensure database is initialized
    await initializeDatabase();
    const db = getDatabase();

    // Create admin user
    console.log('Creating admin user...');
    try {
      const adminUser = await AuthService.registerUser({
        email: 'admin@communitygarden.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        phone: '+1234567890'
      });

      // Update role to admin
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET role = "admin" WHERE id = ?',
          [adminUser.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log('✓ Admin user created (admin@communitygarden.com / admin123)');
    } catch (error) {
      if (error.code === 'USER_EXISTS') {
        console.log('- Admin user already exists');
      } else {
        throw error;
      }
    }

    // Create manager user
    console.log('Creating manager user...');
    try {
      const managerUser = await AuthService.registerUser({
        email: 'manager@communitygarden.com',
        password: 'manager123',
        first_name: 'Garden',
        last_name: 'Manager',
        phone: '+1234567891'
      });

      // Update role to manager
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET role = "manager" WHERE id = ?',
          [managerUser.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log('✓ Manager user created (manager@communitygarden.com / manager123)');
    } catch (error) {
      if (error.code === 'USER_EXISTS') {
        console.log('- Manager user already exists');
      } else {
        throw error;
      }
    }

    // Create member users
    console.log('Creating member users...');
    const members = [
      { email: 'alice@example.com', first_name: 'Alice', last_name: 'Johnson' },
      { email: 'bob@example.com', first_name: 'Bob', last_name: 'Smith' },
      { email: 'carol@example.com', first_name: 'Carol', last_name: 'Davis' }
    ];

    for (const member of members) {
      try {
        await AuthService.registerUser({
          ...member,
          password: 'member123',
          phone: `+123456780${members.indexOf(member) + 2}`
        });
        console.log(`✓ Member user created (${member.email} / member123)`);
      } catch (error) {
        if (error.code === 'USER_EXISTS') {
          console.log(`- Member user ${member.email} already exists`);
        } else {
          throw error;
        }
      }
    }

    // Create sample garden
    console.log('Creating sample garden...');
    const gardenResult = await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO gardens 
         (name, description, location, latitude, longitude, size_sqft, manager_id, established_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Downtown Community Garden',
          'A vibrant community space in the heart of downtown, featuring organic plots and shared amenities.',
          '123 Main Street, Anytown, USA',
          40.7128,
          -74.0060,
          5000,
          2, // manager user ID
          '2023-01-01'
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    if (gardenResult) {
      console.log('✓ Sample garden created');

      // Create sample plots
      console.log('Creating sample plots...');
      const plots = [
        { plot_number: 'A1', size_sqft: 100, assignee_id: 3, soil_type: 'loamy', sun_exposure: 'full_sun' },
        { plot_number: 'A2', size_sqft: 150, assignee_id: 4, soil_type: 'clay', sun_exposure: 'partial_sun' },
        { plot_number: 'A3', size_sqft: 120, assignee_id: 5, soil_type: 'sandy', sun_exposure: 'full_sun' },
        { plot_number: 'B1', size_sqft: 80, assignee_id: null, soil_type: 'loamy', sun_exposure: 'partial_shade' },
        { plot_number: 'B2', size_sqft: 200, assignee_id: null, soil_type: 'loamy', sun_exposure: 'full_sun' }
      ];

      for (const plot of plots) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO plots 
             (garden_id, plot_number, size_sqft, soil_type, sun_exposure, assignee_id, status, assigned_date, rental_fee)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              1, // garden ID
              plot.plot_number,
              plot.size_sqft,
              plot.soil_type,
              plot.sun_exposure,
              plot.assignee_id,
              plot.assignee_id ? 'assigned' : 'available',
              plot.assignee_id ? '2024-01-15' : null,
              25.0
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('✓ Sample plots created');

      // Create sample plants
      console.log('Creating sample plants...');
      const plants = [
        { plot_id: 1, name: 'Tomato', variety: 'Cherokee Purple', plant_type: 'vegetable', planted_date: '2024-03-15' },
        { plot_id: 1, name: 'Basil', variety: 'Sweet Genovese', plant_type: 'herb', planted_date: '2024-03-20' },
        { plot_id: 2, name: 'Lettuce', variety: 'Buttercrunch', plant_type: 'vegetable', planted_date: '2024-04-01' },
        { plot_id: 2, name: 'Carrot', variety: 'Nantes', plant_type: 'vegetable', planted_date: '2024-04-05' },
        { plot_id: 3, name: 'Sunflower', variety: 'Mammoth', plant_type: 'flower', planted_date: '2024-03-25' }
      ];

      for (const plant of plants) {
        const expectedHarvest = new Date(plant.planted_date);
        expectedHarvest.setDate(expectedHarvest.getDate() + 90); // 90 days later

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO plants 
             (plot_id, name, variety, plant_type, planted_date, expected_harvest_date, quantity, organic)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              plant.plot_id,
              plant.name,
              plant.variety,
              plant.plant_type,
              plant.planted_date,
              expectedHarvest.toISOString().split('T')[0],
              Math.floor(Math.random() * 5) + 1, // 1-5 plants
              Math.random() > 0.5 ? 1 : 0 // random organic status
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('✓ Sample plants created');

      // Create sample watering schedules
      console.log('Creating sample watering schedules...');
      const schedules = [
        { plot_id: 1, frequency_days: 2, time_of_day: '07:00', duration_minutes: 15 },
        { plot_id: 2, frequency_days: 1, time_of_day: '18:30', duration_minutes: 20 },
        { plot_id: 3, frequency_days: 3, time_of_day: '06:30', duration_minutes: 10 }
      ];

      for (const schedule of schedules) {
        const nextWatering = new Date();
        nextWatering.setDate(nextWatering.getDate() + schedule.frequency_days);

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO watering_schedules 
             (plot_id, schedule_name, frequency_days, time_of_day, duration_minutes, 
              water_amount_gallons, next_watering)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              schedule.plot_id,
              `Plot ${schedule.plot_id} Watering`,
              schedule.frequency_days,
              schedule.time_of_day,
              schedule.duration_minutes,
              2.0,
              nextWatering.toISOString().split('T')[0]
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('✓ Sample watering schedules created');
    } else {
      console.log('- Sample garden already exists');
    }

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nTest accounts created:');
    console.log('- Admin: admin@communitygarden.com / admin123');
    console.log('- Manager: manager@communitygarden.com / manager123');
    console.log('- Members: alice@example.com, bob@example.com, carol@example.com / member123');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Database seeding failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };