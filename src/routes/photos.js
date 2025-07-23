const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiter');
const { validateId, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} not allowed`, 400, 'INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 5 // Maximum 5 files per request
  }
});

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for different image sizes
const imageSizes = ['original', 'large', 'medium', 'thumbnail'];
imageSizes.forEach(size => {
  const sizeDir = path.join(uploadDir, size);
  if (!fs.existsSync(sizeDir)) {
    fs.mkdirSync(sizeDir, { recursive: true });
  }
});

// Image processing configuration
const imageConfigs = {
  original: { quality: 95 },
  large: { width: 1200, height: 1200, quality: 90 },
  medium: { width: 600, height: 600, quality: 85 },
  thumbnail: { width: 200, height: 200, quality: 80 }
};

// Process and save image in multiple sizes
async function processImage(buffer, filename, mimetype) {
  const results = {};
  
  for (const [size, config] of Object.entries(imageConfigs)) {
    const sizePath = path.join(uploadDir, size, filename);
    
    let processor = sharp(buffer);
    
    if (size !== 'original') {
      processor = processor.resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert to JPEG for consistency and smaller file sizes
    if (mimetype === 'image/png' || mimetype === 'image/webp') {
      processor = processor.jpeg({ quality: config.quality });
    } else {
      processor = processor.jpeg({ quality: config.quality });
    }
    
    await processor.toFile(sizePath);
    results[size] = sizePath;
  }
  
  return results;
}

// Upload photos
router.post('/upload',
  authenticateToken,
  uploadRateLimiter,
  upload.array('photos', 5),
  logActivity('photo_upload', 'photo'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400, 'NO_FILES');
    }

    const { entity_type, entity_id, caption } = req.body;
    
    if (!entity_type) {
      throw new AppError('Entity type is required', 400, 'MISSING_ENTITY_TYPE');
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      try {
        // Generate unique filename
        const fileExtension = '.jpg'; // Always save as JPEG
        const filename = `${uuidv4()}${fileExtension}`;
        
        // Process image in multiple sizes
        const imagePaths = await processImage(file.buffer, filename, file.mimetype);
        
        // Get image dimensions
        const metadata = await sharp(file.buffer).metadata();
        
        // Save photo record to database
        const photo = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO photos 
             (filename, original_filename, file_path, file_size, mime_type, 
              width, height, uploaded_by, entity_type, entity_id, caption) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [filename, file.originalname, imagePaths.original, file.size, 'image/jpeg',
             metadata.width, metadata.height, req.user.id, entity_type, 
             entity_id ? parseInt(entity_id) : null, caption],
            function(err) {
              if (err) {
                reject(err);
              } else {
                // Return created photo
                db.get(
                  'SELECT * FROM photos WHERE id = ?',
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

        uploadedPhotos.push({
          ...photo,
          urls: {
            original: `/uploads/original/${filename}`,
            large: `/uploads/large/${filename}`,
            medium: `/uploads/medium/${filename}`,
            thumbnail: `/uploads/thumbnail/${filename}`
          }
        });
        
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        // Continue with other files even if one fails
      }
    }

    if (uploadedPhotos.length === 0) {
      throw new AppError('No files were processed successfully', 500, 'PROCESSING_FAILED');
    }

    res.status(201).json({
      message: `${uploadedPhotos.length} photos uploaded successfully`,
      photos: uploadedPhotos
    });
  })
);

// Get all photos with filtering
router.get('/',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const entityType = req.query.entity_type;
    const entityId = req.query.entity_id;
    const uploadedBy = req.query.uploaded_by;

    let whereClause = '1=1';
    let params = [];

    if (entityType) {
      whereClause += ' AND entity_type = ?';
      params.push(entityType);
    }

    if (entityId) {
      whereClause += ' AND entity_id = ?';
      params.push(parseInt(entityId));
    }

    if (uploadedBy) {
      whereClause += ' AND uploaded_by = ?';
      params.push(parseInt(uploadedBy));
    }

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as total FROM photos WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get photos with uploader info
    const photos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                u.first_name as uploader_first_name,
                u.last_name as uploader_last_name
         FROM photos p
         LEFT JOIN users u ON p.uploaded_by = u.id
         WHERE ${whereClause}
         ORDER BY p.upload_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Add URL paths to each photo
            const photosWithUrls = rows.map(photo => ({
              ...photo,
              urls: {
                original: `/uploads/original/${photo.filename}`,
                large: `/uploads/large/${photo.filename}`,
                medium: `/uploads/medium/${photo.filename}`,
                thumbnail: `/uploads/thumbnail/${photo.filename}`
              }
            }));
            resolve(photosWithUrls);
          }
        }
      );
    });

    res.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get photo by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const photoId = parseInt(req.params.id);

    const photo = await new Promise((resolve, reject) => {
      db.get(
        `SELECT p.*, 
                u.first_name as uploader_first_name,
                u.last_name as uploader_last_name
         FROM photos p
         LEFT JOIN users u ON p.uploaded_by = u.id
         WHERE p.id = ?`,
        [photoId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!photo) {
      throw new AppError('Photo not found', 404, 'PHOTO_NOT_FOUND');
    }

    // Add URL paths
    photo.urls = {
      original: `/uploads/original/${photo.filename}`,
      large: `/uploads/large/${photo.filename}`,
      medium: `/uploads/medium/${photo.filename}`,
      thumbnail: `/uploads/thumbnail/${photo.filename}`
    };

    res.json({ photo });
  })
);

// Update photo metadata
router.put('/:id',
  authenticateToken,
  validateId,
  logActivity('photo_update', 'photo'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const photoId = parseInt(req.params.id);
    const { caption, is_primary } = req.body;

    // Check if user owns the photo or is admin
    const photo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT uploaded_by FROM photos WHERE id = ?',
        [photoId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!photo) {
      throw new AppError('Photo not found', 404, 'PHOTO_NOT_FOUND');
    }

    if (req.user.role !== 'admin' && photo.uploaded_by !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updates = [];
    const values = [];

    if (caption !== undefined) {
      updates.push('caption = ?');
      values.push(caption);
    }

    if (is_primary !== undefined) {
      // If setting as primary, unset other primary photos for the same entity
      if (is_primary) {
        const currentPhoto = await new Promise((resolve, reject) => {
          db.get(
            'SELECT entity_type, entity_id FROM photos WHERE id = ?',
            [photoId],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (currentPhoto && currentPhoto.entity_type && currentPhoto.entity_id) {
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE photos SET is_primary = 0 WHERE entity_type = ? AND entity_id = ? AND id != ?',
              [currentPhoto.entity_type, currentPhoto.entity_id, photoId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }

      updates.push('is_primary = ?');
      values.push(is_primary ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new AppError('No valid fields to update', 400, 'NO_VALID_FIELDS');
    }

    values.push(photoId);

    const updatedPhoto = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE photos SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else if (this.changes === 0) {
            reject(new AppError('Photo not found', 404, 'PHOTO_NOT_FOUND'));
          } else {
            // Return updated photo
            db.get(
              `SELECT p.*, 
                      u.first_name as uploader_first_name,
                      u.last_name as uploader_last_name
               FROM photos p
               LEFT JOIN users u ON p.uploaded_by = u.id
               WHERE p.id = ?`,
              [photoId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });

    // Add URL paths
    updatedPhoto.urls = {
      original: `/uploads/original/${updatedPhoto.filename}`,
      large: `/uploads/large/${updatedPhoto.filename}`,
      medium: `/uploads/medium/${updatedPhoto.filename}`,
      thumbnail: `/uploads/thumbnail/${updatedPhoto.filename}`
    };

    res.json({
      message: 'Photo updated successfully',
      photo: updatedPhoto
    });
  })
);

// Delete photo
router.delete('/:id',
  authenticateToken,
  validateId,
  logActivity('photo_delete', 'photo'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const photoId = parseInt(req.params.id);

    // Get photo details before deletion
    const photo = await new Promise((resolve, reject) => {
      db.get(
        'SELECT filename, uploaded_by FROM photos WHERE id = ?',
        [photoId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!photo) {
      throw new AppError('Photo not found', 404, 'PHOTO_NOT_FOUND');
    }

    // Check ownership
    if (req.user.role !== 'admin' && photo.uploaded_by !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Delete from database
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM photos WHERE id = ?',
        [photoId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Delete physical files
    imageSizes.forEach(size => {
      const filePath = path.join(uploadDir, size, photo.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
        }
      }
    });

    res.json({
      message: 'Photo deleted successfully'
    });
  })
);

// Get photos for a specific entity
router.get('/entity/:entityType/:entityId',
  validatePagination,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { entityType, entityId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as total FROM photos WHERE entity_type = ? AND entity_id = ?',
        [entityType, parseInt(entityId)],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        }
      );
    });

    // Get photos
    const photos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                u.first_name as uploader_first_name,
                u.last_name as uploader_last_name
         FROM photos p
         LEFT JOIN users u ON p.uploaded_by = u.id
         WHERE p.entity_type = ? AND p.entity_id = ?
         ORDER BY p.is_primary DESC, p.upload_date DESC
         LIMIT ? OFFSET ?`,
        [entityType, parseInt(entityId), limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Add URL paths to each photo
            const photosWithUrls = rows.map(photo => ({
              ...photo,
              urls: {
                original: `/uploads/original/${photo.filename}`,
                large: `/uploads/large/${photo.filename}`,
                medium: `/uploads/medium/${photo.filename}`,
                thumbnail: `/uploads/thumbnail/${photo.filename}`
              }
            }));
            resolve(photosWithUrls);
          }
        }
      );
    });

    res.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Bulk delete photos
router.post('/bulk-delete',
  authenticateToken,
  logActivity('photo_bulk_delete', 'photo'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { photo_ids } = req.body;

    if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
      throw new AppError('Photo IDs array is required', 400, 'MISSING_PHOTO_IDS');
    }

    // Get photos to verify ownership
    const placeholders = photo_ids.map(() => '?').join(',');
    const photos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, filename, uploaded_by FROM photos WHERE id IN (${placeholders})`,
        photo_ids,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Check ownership for non-admin users
    if (req.user.role !== 'admin') {
      const unauthorizedPhotos = photos.filter(p => p.uploaded_by !== req.user.id);
      if (unauthorizedPhotos.length > 0) {
        throw new AppError('Access denied for some photos', 403, 'ACCESS_DENIED');
      }
    }

    // Delete from database
    const deletedCount = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM photos WHERE id IN (${placeholders})`,
        photo_ids,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Delete physical files
    photos.forEach(photo => {
      imageSizes.forEach(size => {
        const filePath = path.join(uploadDir, size, photo.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
          }
        }
      });
    });

    res.json({
      message: `${deletedCount} photos deleted successfully`,
      deleted_count: deletedCount
    });
  })
);

module.exports = router;