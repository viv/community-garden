const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'MISSING_TOKEN' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const errorCode = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        code: errorCode 
      });
    }
    
    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: userRoles,
        current: req.user.role
      });
    }

    next();
  };
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

const checkOwnership = (entity, idField = 'id') => {
  return async (req, res, next) => {
    try {
      const db = getDatabase();
      const entityId = req.params[idField];
      const userId = req.user.id;

      // Admin users can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      let query;
      let params;

      switch (entity) {
        case 'plot':
          query = 'SELECT assignee_id FROM plots WHERE id = ?';
          params = [entityId];
          break;
        case 'plant':
          query = `
            SELECT p.assignee_id 
            FROM plants pl 
            JOIN plots p ON pl.plot_id = p.id 
            WHERE pl.id = ?
          `;
          params = [entityId];
          break;
        case 'growth_log':
          query = `
            SELECT p.assignee_id 
            FROM growth_logs gl
            JOIN plants pl ON gl.plant_id = pl.id
            JOIN plots p ON pl.plot_id = p.id 
            WHERE gl.id = ?
          `;
          params = [entityId];
          break;
        case 'garden':
          query = 'SELECT manager_id FROM gardens WHERE id = ?';
          params = [entityId];
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid entity type for ownership check',
            code: 'INVALID_ENTITY' 
          });
      }

      db.get(query, params, (err, row) => {
        if (err) {
          return res.status(500).json({ 
            error: 'Database error during ownership check',
            code: 'DATABASE_ERROR' 
          });
        }

        if (!row) {
          return res.status(404).json({ 
            error: `${entity} not found`,
            code: 'ENTITY_NOT_FOUND' 
          });
        }

        const ownerId = row.assignee_id || row.manager_id;
        
        if (ownerId !== userId) {
          return res.status(403).json({ 
            error: 'You can only access your own resources',
            code: 'ACCESS_DENIED' 
          });
        }

        next();
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Server error during ownership check',
        code: 'SERVER_ERROR' 
      });
    }
  };
};

const logActivity = (action, entityType = null) => {
  return async (req, res, next) => {
    try {
      const db = getDatabase();
      const userId = req.user ? req.user.id : null;
      const entityId = req.params.id || null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const details = {
        method: req.method,
        url: req.originalUrl,
        body: req.method === 'POST' || req.method === 'PUT' ? req.body : null,
        params: req.params,
        query: req.query
      };

      db.run(
        `INSERT INTO activity_logs 
         (user_id, action, entity_type, entity_id, details, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, action, entityType, entityId, JSON.stringify(details), ipAddress, userAgent],
        (err) => {
          if (err) {
            console.error('Error logging activity:', err);
          }
        }
      );

      next();
    } catch (error) {
      console.error('Error in activity logging middleware:', error);
      next();
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  checkOwnership,
  logActivity
};