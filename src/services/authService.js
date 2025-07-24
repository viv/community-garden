const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { AppError } = require('../middleware/errorHandler');

class AuthService {
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
  }

  static generateRefreshToken() {
    return uuidv4();
  }

  static async storeRefreshToken(userId, token) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      db.run(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expiresAt.toISOString()],
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

  static async validateRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.get(
        `SELECT rt.*, u.id, u.email, u.role, u.first_name, u.last_name, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = ? AND rt.expires_at > datetime('now') AND u.is_active = 1`,
        [token],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  static async revokeRefreshToken(token) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.run(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [token],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  static async revokeAllUserRefreshTokens(userId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.run(
        'DELETE FROM refresh_tokens WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async cleanupExpiredTokens() {
    return new Promise((resolve, reject) => {
      const db = getDatabase();
      
      db.run(
        "DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')",
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Cleaned up ${this.changes} expired refresh tokens`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  static async registerUser(userData) {
    const { email, password, first_name, last_name, phone } = userData;

    return new Promise(async (resolve, reject) => {
      try {
        const db = getDatabase();

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
          if (err) {
            return reject(err);
          }

          if (existingUser) {
            return reject(new AppError('User with this email already exists', 409, 'USER_EXISTS'));
          }

          // Hash password
          const passwordHash = await this.hashPassword(password);

          // Create user
          db.run(
            `INSERT INTO users 
             (email, password_hash, first_name, last_name, phone, role) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, first_name, last_name, phone || null, 'member'],
            function(err) {
              if (err) {
                reject(err);
              } else {
                // Fetch the created user
                db.get(
                  'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = ?',
                  [this.lastID],
                  (err, user) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(user);
                    }
                  }
                );
              }
            }
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async loginUser(email, password) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();

      db.get(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email],
        async (err, user) => {
          if (err) {
            return reject(err);
          }

          if (!user) {
            return reject(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
          }

          try {
            const isValidPassword = await this.comparePassword(password, user.password_hash);
            
            if (!isValidPassword) {
              return reject(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
            }

            // Generate tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken();

            // Store refresh token
            await this.storeRefreshToken(user.id, refreshToken);

            // Remove password hash from response
            const { password_hash, ...userWithoutPassword } = user;

            resolve({
              user: userWithoutPassword,
              accessToken,
              refreshToken
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const tokenData = await this.validateRefreshToken(refreshToken);
      
      if (!tokenData) {
        throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Generate new access token
      const user = {
        id: tokenData.id,
        email: tokenData.email,
        role: tokenData.role,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name
      };

      const accessToken = this.generateAccessToken(user);

      return { accessToken, user };
    } catch (error) {
      throw error;
    }
  }

  static async getUserById(userId) {
    return new Promise((resolve, reject) => {
      const db = getDatabase();

      db.get(
        'SELECT id, email, first_name, last_name, phone, role, is_active, profile_image, preferences, created_at, updated_at FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        }
      );
    });
  }

  static async updateUser(userId, updateData) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = getDatabase();
        const allowedFields = ['email', 'first_name', 'last_name', 'phone', 'profile_image', 'preferences'];
        const updates = [];
        const values = [];

        // Build dynamic update query
        Object.keys(updateData).forEach(key => {
          if (allowedFields.includes(key) && updateData[key] !== undefined) {
            updates.push(`${key} = ?`);
            values.push(updateData[key]);
          }
        });

        if (updates.length === 0) {
          return reject(new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS'));
        }

        // Add updated_at timestamp
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

        db.run(query, values, function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('User not found', 404, 'USER_NOT_FOUND'));
          } else {
            // Return updated user
            db.get(
              'SELECT id, email, first_name, last_name, phone, role, is_active, profile_image, preferences, created_at, updated_at FROM users WHERE id = ?',
              [userId],
              (err, user) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(user);
                }
              }
            );
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  static async changePassword(userId, currentPassword, newPassword) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = getDatabase();

        // Get current password hash
        db.get(
          'SELECT password_hash FROM users WHERE id = ? AND is_active = 1',
          [userId],
          async (err, user) => {
            if (err) {
              return reject(err);
            }

            if (!user) {
              return reject(new AppError('User not found', 404, 'USER_NOT_FOUND'));
            }

            // Verify current password
            const isValidPassword = await this.comparePassword(currentPassword, user.password_hash);
            
            if (!isValidPassword) {
              return reject(new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD'));
            }

            // Hash new password
            const newPasswordHash = await this.hashPassword(newPassword);

            // Update password and revoke all refresh tokens
            db.serialize(() => {
              db.run(
                'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newPasswordHash, userId],
                (err) => {
                  if (err) {
                    return reject(err);
                  }
                }
              );

              db.run(
                'DELETE FROM refresh_tokens WHERE user_id = ?',
                [userId],
                function(err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({ message: 'Password changed successfully' });
                  }
                }
              );
            });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = AuthService;