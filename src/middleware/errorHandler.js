const fs = require('fs');
const path = require('path');

const errorHandler = (err, req, res, next) => {
  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : null,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    body: req.body,
    params: req.params,
    query: req.query
  };

  // Write to error log file
  const logPath = path.join(__dirname, '../../logs/error.log');
  fs.appendFileSync(logPath, JSON.stringify(errorLog) + '\n');

  // Console log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  // Handle specific error types
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors,
      timestamp: new Date().toISOString()
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    };
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    };
  }

  // SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    statusCode = 400;
    
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      errorResponse = {
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        timestamp: new Date().toISOString()
      };
    } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      errorResponse = {
        error: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
        timestamp: new Date().toISOString()
      };
    } else {
      errorResponse = {
        error: 'Database constraint violation',
        code: 'DATABASE_CONSTRAINT',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorResponse = {
      error: 'File too large',
      code: 'FILE_TOO_LARGE',
      maxSize: process.env.MAX_FILE_SIZE || '5MB',
      timestamp: new Date().toISOString()
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    errorResponse = {
      error: 'Unexpected file field',
      code: 'UNEXPECTED_FILE',
      timestamp: new Date().toISOString()
    };
  }

  // Custom application errors
  if (err.isOperational) {
    statusCode = err.statusCode || 400;
    errorResponse = {
      error: err.message,
      code: err.code || 'APPLICATION_ERROR',
      timestamp: new Date().toISOString()
    };
  }

  // Don't expose stack traces in production
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler
};