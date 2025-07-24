# Community Garden Management System - Full Stack Application

A comprehensive **full-stack web application** for managing community gardens, built with React frontend and Express.js backend. This system helps coordinate garden plots, track plant growth, manage watering schedules, and facilitate community collaboration.

**🏗️ Architecture:**
- **Frontend**: React + TypeScript + Vite (Port 3000)  
- **Backend**: Express.js + SQLite (Port 3001)
- **Database**: SQLite with WAL mode for performance

## 🌱 Features

### Core Functionality
- **User Management**: Registration, authentication, and role-based access control
- **Garden Management**: Create and manage multiple community gardens
- **Plot Assignment**: Assign plots to gardeners with detailed tracking
- **Plant Tracking**: Log plant information, growth progress, and health status
- **Harvest Management**: Record and analyze harvest data with predictions
- **Photo Management**: Upload and organize photos with automatic resizing
- **Watering Schedules**: Automated watering reminders and tracking
- **Weather Integration**: Real-time weather data and gardening recommendations

### Advanced Features
- **JWT Authentication** with refresh tokens
- **Rate Limiting** and security middleware
- **Background Jobs** for automated maintenance
- **RESTful API** with comprehensive error handling
- **SQLite Database** with WAL mode for performance
- **File Upload** with automatic image optimization
- **Harvest Predictions** based on historical data
- **Weather Caching** to minimize API calls

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenWeatherMap API key (optional, for weather features)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd community-garden
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize the database**
```bash
npm run db:migrate
```

5. **Seed with sample data (optional)**
```bash
npm run db:seed
```

6. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

### Test Accounts (after seeding)
- **Admin**: admin@communitygarden.com / admin123
- **Manager**: manager@communitygarden.com / manager123  
- **Member**: alice@example.com / member123

## 📚 API Documentation

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

#### Gardens & Plots
- `GET /api/gardens` - List all gardens
- `POST /api/gardens` - Create new garden (admin/manager)
- `GET /api/plots` - List all plots
- `PUT /api/plots/:id/assign` - Assign plot to user

#### Plants & Growth
- `GET /api/plants` - List plants with filtering
- `POST /api/plants` - Add new plant to plot
- `GET /api/growth-logs` - View growth logs
- `POST /api/growth-logs` - Log growth progress

#### Harvests & Analytics
- `GET /api/harvests` - List harvest records
- `GET /api/harvests/stats/summary` - Harvest statistics
- `GET /api/harvests/predictions` - Harvest predictions

#### Weather & Schedules
- `GET /api/weather/current?lat=40.7&lon=-74` - Current weather
- `GET /api/watering-schedules` - Watering schedules
- `POST /api/watering-schedules/:id/complete` - Mark watering complete

#### File Uploads
- `POST /api/photos/upload` - Upload photos (multipart/form-data)
- `GET /api/photos/entity/plant/123` - Get photos for entity

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🗄️ Database Schema

The system uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **gardens**: Community garden locations
- **plots**: Individual garden plots
- **plants**: Plant records and details
- **growth_logs**: Growth tracking entries
- **harvests**: Harvest records and data
- **watering_schedules**: Automated watering management
- **photos**: Image storage and metadata
- **weather_cache**: Cached weather data

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `DATABASE_URL` | SQLite database path | ./data/garden.db |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `WEATHER_API_KEY` | OpenWeatherMap API key | Optional |
| `CORS_ORIGIN` | Frontend URL for CORS | http://localhost:3000 |
| `MAX_FILE_SIZE` | Max upload size in bytes | 5242880 (5MB) |

### Security Features

- **Rate Limiting**: 100 requests per 15 minutes (configurable)
- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: File type and size restrictions
- **CORS Protection**: Configurable cross-origin policies
- **SQL Injection Prevention**: Parameterized queries
- **Error Handling**: Secure error responses

## 🚀 Deployment

### Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render
1. Connect repository to Render
2. Use the provided `render.yaml` configuration
3. Set environment variables in Render dashboard

### Docker
```bash
# Build image
docker build -t community-garden-api .

# Run container
docker run -p 3001:3001 --env-file .env community-garden-api
```

### Manual Deployment
1. Install dependencies: `npm ci --production`
2. Set environment variables
3. Run migrations: `npm run db:migrate`
4. Start server: `npm start`

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run test suite
- `npm run db:migrate` - Initialize database
- `npm run db:seed` - Seed with sample data
- `npm run lint` - Run ESLint
- `npm run build` - Validate build

### Project Structure
```
src/
├── database/           # Database configuration and migrations
├── middleware/         # Express middleware (auth, validation, etc.)
├── routes/            # API route handlers
├── services/          # Business logic and external services
└── server.js          # Main application entry point
```

### Background Jobs
The system includes automated background jobs for:
- Cleaning expired tokens and cache
- Updating watering schedules
- Generating harvest predictions
- Database maintenance
- Weather cache cleanup

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The tests cover:
- API endpoint functionality
- Authentication and authorization
- Database operations
- File upload handling
- Error handling

## 📊 Performance

### Optimizations
- **SQLite WAL Mode**: Improved concurrent access
- **Database Indexing**: Optimized query performance
- **Image Compression**: Automatic image optimization
- **Caching**: Weather data and computed results
- **Rate Limiting**: Prevents API abuse
- **Background Jobs**: Automated maintenance

### Monitoring
- Health check endpoint: `/health`
- Performance metrics available via background job status
- Activity logging for user actions
- Error logging and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow REST API conventions
- Write descriptive commit messages
- Include error handling
- Add JSDoc comments for functions

## 🔒 Security

### Best Practices Implemented
- Password hashing with bcrypt
- JWT tokens with short expiration
- Refresh token rotation
- Input validation and sanitization
- Rate limiting on all endpoints
- Secure headers with Helmet.js
- File upload restrictions
- Activity logging

### Security Considerations
- Change default JWT secrets in production
- Use HTTPS in production
- Regularly update dependencies
- Monitor for security vulnerabilities
- Implement proper backup strategies

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the API documentation
2. Review the troubleshooting guide
3. Open an issue on GitHub
4. Contact the development team

## 🔄 Changelog

### Version 1.0.0
- Initial release with core functionality
- User management and authentication
- Garden and plot management
- Plant tracking and growth logs
- Harvest management and predictions
- Photo upload and management
- Weather integration
- Background job processing

---

Built with ❤️ for community gardeners everywhere 🌱