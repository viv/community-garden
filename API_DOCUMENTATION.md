# Community Garden Management API Documentation

## Overview

The Community Garden Management API is a RESTful API built with Express.js and SQLite, designed to help manage community gardens, plots, plants, and gardening activities.

## Base URL

```
Production: https://your-app.railway.app/api
Development: http://localhost:3001/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **admin**: Full system access
- **manager**: Can manage gardens they oversee
- **member**: Can manage their assigned plots and plants

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- File uploads: 10 requests per minute
- Weather API: 20 requests per minute

## API Endpoints

### Authentication (`/api/auth`)

#### POST `/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member"
  }
}
```

#### POST `/login`
Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "member"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/refresh`
Refresh access token using refresh token.

#### POST `/logout`
Logout and invalidate refresh token.

#### GET `/me`
Get current user profile (requires authentication).

### Users (`/api/users`)

#### GET `/`
Get all users (admin only).

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search in name/email
- `role`: Filter by role

#### GET `/:id`
Get user by ID.

#### PUT `/:id`
Update user profile.

#### GET `/:id/plots`
Get user's assigned plots.

### Gardens (`/api/gardens`)

#### GET `/`
Get all gardens.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `search`: Search in name/location
- `is_active`: Filter by active status

#### POST `/`
Create new garden (admin/manager only).

**Request Body:**
```json
{
  "name": "Community Garden",
  "description": "A beautiful community space",
  "location": "123 Main St",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "size_sqft": 5000,
  "manager_id": 2
}
```

#### GET `/:id`
Get garden details.

#### PUT `/:id`
Update garden (admin/manager only).

#### GET `/:id/plots`
Get all plots in garden.

#### GET `/:id/stats`
Get garden statistics.

### Plots (`/api/plots`)

#### GET `/`
Get all plots.

**Query Parameters:**
- `garden_id`: Filter by garden
- `status`: Filter by status (available, assigned, maintenance)
- `assignee_id`: Filter by assignee

#### POST `/`
Create new plot (admin/manager only).

#### GET `/:id`
Get plot details.

#### PUT `/:id`
Update plot (admin/manager only).

#### PUT `/:id/assign`
Assign plot to user.

#### PUT `/:id/unassign`
Unassign plot.

#### GET `/:id/plants`
Get all plants in plot.

### Plants (`/api/plants`)

#### GET `/`
Get all plants.

**Query Parameters:**
- `plot_id`: Filter by plot
- `status`: Filter by status
- `plant_type`: Filter by type
- `search`: Search in name/variety

#### POST `/`
Create new plant (requires plot ownership).

**Request Body:**
```json
{
  "plot_id": 1,
  "name": "Tomato",
  "variety": "Cherry",
  "plant_type": "vegetable",
  "planted_date": "2024-03-15",
  "expected_harvest_date": "2024-06-15",
  "quantity": 3,
  "organic": true
}
```

#### GET `/:id`
Get plant details.

#### PUT `/:id`
Update plant (requires ownership).

#### DELETE `/:id`
Delete plant (requires ownership).

#### GET `/:id/growth-logs`
Get plant's growth logs.

#### GET `/:id/harvests`
Get plant's harvest records.

### Growth Logs (`/api/growth-logs`)

#### GET `/`
Get all growth logs.

**Query Parameters:**
- `plant_id`: Filter by plant
- `plot_id`: Filter by plot
- `health_status`: Filter by health status
- `start_date`: Date range start
- `end_date`: Date range end

#### POST `/`
Create growth log entry.

**Request Body:**
```json
{
  "plant_id": 1,
  "log_date": "2024-04-01",
  "height_inches": 12.5,
  "width_inches": 8.0,
  "health_status": "good",
  "notes": "Growing well, no issues",
  "watered": true,
  "weather_conditions": "sunny, 75°F"
}
```

#### GET `/:id`
Get growth log details.

#### PUT `/:id`
Update growth log (requires ownership).

#### GET `/plant/:plantId/trends`
Get growth trends for a plant.

### Harvests (`/api/harvests`)

#### GET `/`
Get all harvests.

**Query Parameters:**
- `plant_id`: Filter by plant
- `plot_id`: Filter by plot
- `garden_id`: Filter by garden
- `start_date`: Date range start
- `end_date`: Date range end

#### POST `/`
Record new harvest.

**Request Body:**
```json
{
  "plant_id": 1,
  "harvest_date": "2024-06-20",
  "quantity": 2.5,
  "unit": "lbs",
  "quality_rating": 4,
  "notes": "Excellent taste and color"
}
```

#### GET `/:id`
Get harvest details.

#### PUT `/:id`
Update harvest record.

#### GET `/stats/summary`
Get harvest statistics.

#### GET `/predictions`
Get harvest predictions.

### Watering Schedules (`/api/watering-schedules`)

#### GET `/`
Get watering schedules.

**Query Parameters:**
- `plot_id`: Filter by plot
- `garden_id`: Filter by garden
- `due_today`: Show only schedules due today

#### POST `/`
Create watering schedule.

**Request Body:**
```json
{
  "plot_id": 1,
  "schedule_name": "Daily Morning Watering",
  "frequency_days": 1,
  "time_of_day": "07:00",
  "duration_minutes": 15,
  "water_amount_gallons": 2.0
}
```

#### GET `/:id`
Get schedule details.

#### PUT `/:id`
Update schedule.

#### POST `/:id/complete`
Mark watering as completed.

#### GET `/calendar/:startDate/:endDate`
Get watering calendar.

#### GET `/overdue/summary`
Get overdue schedules.

### Weather (`/api/weather`)

#### GET `/current`
Get current weather.

**Query Parameters:**
- `lat`: Latitude (required)
- `lon`: Longitude (required)

#### GET `/forecast`
Get weather forecast.

**Query Parameters:**
- `lat`: Latitude (required)
- `lon`: Longitude (required)
- `days`: Number of days (1-5, default: 5)

#### GET `/garden/:gardenId`
Get weather for specific garden.

#### GET `/alerts`
Get weather alerts and recommendations.

### Photos (`/api/photos`)

#### POST `/upload`
Upload photos.

**Form Data:**
- `photos`: Image files (max 5)
- `entity_type`: Type (plant, plot, garden)
- `entity_id`: Entity ID
- `caption`: Optional caption

#### GET `/`
Get all photos.

#### GET `/:id`
Get photo details.

#### PUT `/:id`
Update photo metadata.

#### DELETE `/:id`
Delete photo.

#### GET `/entity/:entityType/:entityId`
Get photos for specific entity.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `INVALID_TOKEN`: Invalid or expired JWT token
- `ACCESS_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `FILE_TOO_LARGE`: Upload file too large

## Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `413 Payload Too Large`: File too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Data Models

### User
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "role": "member",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Garden
```json
{
  "id": 1,
  "name": "Community Garden",
  "description": "A beautiful space",
  "location": "123 Main St",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "size_sqft": 5000,
  "manager_id": 2,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Plot
```json
{
  "id": 1,
  "garden_id": 1,
  "plot_number": "A1",
  "assignee_id": 3,
  "size_sqft": 100.0,
  "soil_type": "loamy",
  "sun_exposure": "full_sun",
  "status": "assigned",
  "rental_fee": 50.00
}
```

### Plant
```json
{
  "id": 1,
  "plot_id": 1,
  "name": "Tomato",
  "variety": "Cherry",
  "plant_type": "vegetable",
  "planted_date": "2024-03-15",
  "expected_harvest_date": "2024-06-15",
  "quantity": 3,
  "status": "planted",
  "organic": true
}
```

## Pagination

Paginated endpoints return data in this format:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## File Uploads

- Maximum file size: 5MB
- Allowed image types: JPEG, PNG, WebP
- Multiple sizes generated: original, large (1200x1200), medium (600x600), thumbnail (200x200)
- Files served from `/uploads/{size}/{filename}`

## Environment Variables

Required for deployment:
- `JWT_SECRET`: JWT signing secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `WEATHER_API_KEY`: OpenWeatherMap API key
- `DATABASE_URL`: Database file path
- `CORS_ORIGIN`: Frontend URL for CORS

## Development Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run migrations: `npm run db:migrate`
5. Start development server: `npm run dev`

## Testing

Run tests with:
```bash
npm test
```

## Deployment

The API is optimized for deployment on:
- Railway
- Render
- Heroku
- Any Node.js hosting platform

See deployment configuration in `railway.json` and `render.yaml`.

## Support

For support and questions, please refer to the project documentation or open an issue in the repository.