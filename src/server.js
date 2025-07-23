require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { initializeDatabase } = require('./database/init');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gardenRoutes = require('./routes/gardens');
const plotRoutes = require('./routes/plots');
const plantRoutes = require('./routes/plants');
const growthLogRoutes = require('./routes/growthLogs');
const harvestRoutes = require('./routes/harvests');
const weatherRoutes = require('./routes/weather');
const photoRoutes = require('./routes/photos');
const wateringScheduleRoutes = require('./routes/wateringSchedules');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { startBackgroundJobs } = require('./services/backgroundJobs');

const app = express();
const PORT = process.env.PORT || 3001;

// Create necessary directories
const directories = ['./data', './uploads', './logs'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(__dirname, '../logs/access.log'), { flags: 'a' })
  }));
  app.use(morgan('dev'));
}

// Rate limiting
app.use(rateLimiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gardens', gardenRoutes);
app.use('/api/plots', plotRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/growth-logs', growthLogRoutes);
app.use('/api/harvests', harvestRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/watering-schedules', wateringScheduleRoutes);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Community Garden Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      gardens: '/api/gardens',
      plots: '/api/plots',
      plants: '/api/plants',
      growthLogs: '/api/growth-logs',
      harvests: '/api/harvests',
      weather: '/api/weather',
      photos: '/api/photos'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Start background jobs
    if (process.env.NODE_ENV !== 'test') {
      startBackgroundJobs();
      console.log('Background jobs started');
    }
    
    const server = app.listen(PORT, () => {
      console.log(`Community Garden API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api/docs`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;