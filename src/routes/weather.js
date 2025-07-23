const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDatabase } = require('../database/init');
const { weatherRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_CACHE_DURATION = parseInt(process.env.WEATHER_CACHE_DURATION) || 300000; // 5 minutes default

// Weather service class
class WeatherService {
  static async getWeatherFromAPI(lat, lon) {
    if (!WEATHER_API_KEY) {
      throw new AppError('Weather API key not configured', 500, 'WEATHER_API_NOT_CONFIGURED');
    }

    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: lat,
          lon: lon,
          appid: WEATHER_API_KEY,
          units: 'imperial', // Use Fahrenheit for US users
        },
        timeout: 10000 // 10 second timeout
      });

      return {
        temperature: Math.round(response.data.main.temp),
        feels_like: Math.round(response.data.main.feels_like),
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        description: response.data.weather[0].description,
        main: response.data.weather[0].main,
        icon: response.data.weather[0].icon,
        wind_speed: response.data.wind?.speed || 0,
        wind_direction: response.data.wind?.deg || 0,
        clouds: response.data.clouds?.all || 0,
        visibility: response.data.visibility || 0,
        uv_index: response.data.uvi || null,
        sunrise: response.data.sys.sunrise,
        sunset: response.data.sys.sunset,
        location: response.data.name,
        country: response.data.sys.country,
        retrieved_at: new Date().toISOString()
      };
    } catch (error) {
      if (error.response?.status === 401) {
        throw new AppError('Invalid weather API key', 500, 'INVALID_WEATHER_API_KEY');
      } else if (error.response?.status === 404) {
        throw new AppError('Location not found', 404, 'LOCATION_NOT_FOUND');
      } else if (error.code === 'ECONNABORTED') {
        throw new AppError('Weather service timeout', 503, 'WEATHER_SERVICE_TIMEOUT');
      } else {
        console.error('Weather API error:', error.message);
        throw new AppError('Unable to fetch weather data', 503, 'WEATHER_SERVICE_ERROR');
      }
    }
  }

  static async getForecastFromAPI(lat, lon, days = 5) {
    if (!WEATHER_API_KEY) {
      throw new AppError('Weather API key not configured', 500, 'WEATHER_API_NOT_CONFIGURED');
    }

    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat: lat,
          lon: lon,
          appid: WEATHER_API_KEY,
          units: 'imperial',
        },
        timeout: 10000
      });

      const forecasts = response.data.list.slice(0, days * 8); // 8 forecasts per day (every 3 hours)
      
      return {
        location: response.data.city.name,
        country: response.data.city.country,
        forecasts: forecasts.map(item => ({
          datetime: item.dt_txt,
          timestamp: item.dt,
          temperature: Math.round(item.main.temp),
          feels_like: Math.round(item.main.feels_like),
          temp_min: Math.round(item.main.temp_min),
          temp_max: Math.round(item.main.temp_max),
          humidity: item.main.humidity,
          pressure: item.main.pressure,
          description: item.weather[0].description,
          main: item.weather[0].main,
          icon: item.weather[0].icon,
          wind_speed: item.wind?.speed || 0,
          wind_direction: item.wind?.deg || 0,
          clouds: item.clouds?.all || 0,
          pop: Math.round((item.pop || 0) * 100), // Probability of precipitation as percentage
          rain: item.rain?.['3h'] || 0,
          snow: item.snow?.['3h'] || 0
        })),
        retrieved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Weather forecast API error:', error.message);
      throw new AppError('Unable to fetch weather forecast', 503, 'WEATHER_FORECAST_ERROR');
    }
  }

  static async getCachedWeather(location) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM weather_cache WHERE location = ? AND expires_at > datetime("now")',
        [location],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(JSON.parse(row.weather_data));
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  static async cacheWeather(location, weatherData) {
    const db = getDatabase();
    const expiresAt = new Date(Date.now() + WEATHER_CACHE_DURATION);
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO weather_cache 
         (location, weather_data, expires_at) 
         VALUES (?, ?, ?)`,
        [location, JSON.stringify(weatherData), expiresAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async cleanExpiredCache() {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM weather_cache WHERE expires_at <= datetime("now")',
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

// Get current weather for coordinates
router.get('/current',
  weatherRateLimiter,
  asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDINATES');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_COORDINATES');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new AppError('Coordinates out of range', 400, 'COORDINATES_OUT_OF_RANGE');
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    // Try to get cached data first
    let weatherData = await WeatherService.getCachedWeather(cacheKey);
    
    if (!weatherData) {
      // Fetch from API and cache
      weatherData = await WeatherService.getWeatherFromAPI(latitude, longitude);
      await WeatherService.cacheWeather(cacheKey, weatherData);
    }

    res.json({
      weather: weatherData,
      cached: !!weatherData.retrieved_at
    });
  })
);

// Get weather forecast for coordinates
router.get('/forecast',
  weatherRateLimiter,
  asyncHandler(async (req, res) => {
    const { lat, lon, days } = req.query;

    if (!lat || !lon) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDINATES');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const forecastDays = parseInt(days) || 5;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError('Invalid coordinates', 400, 'INVALID_COORDINATES');
    }

    if (forecastDays < 1 || forecastDays > 5) {
      throw new AppError('Days must be between 1 and 5', 400, 'INVALID_DAYS_RANGE');
    }

    const cacheKey = `forecast_${latitude.toFixed(4)},${longitude.toFixed(4)}_${forecastDays}d`;
    
    // Try to get cached data first
    let forecastData = await WeatherService.getCachedWeather(cacheKey);
    
    if (!forecastData) {
      // Fetch from API and cache
      forecastData = await WeatherService.getForecastFromAPI(latitude, longitude, forecastDays);
      await WeatherService.cacheWeather(cacheKey, forecastData);
    }

    res.json({
      forecast: forecastData,
      cached: !!forecastData.retrieved_at
    });
  })
);

// Get weather for a specific garden
router.get('/garden/:gardenId',
  weatherRateLimiter,
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const gardenId = parseInt(req.params.gardenId);

    // Get garden coordinates
    const garden = await new Promise((resolve, reject) => {
      db.get(
        'SELECT name, location, latitude, longitude FROM gardens WHERE id = ? AND is_active = 1',
        [gardenId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!garden) {
      throw new AppError('Garden not found', 404, 'GARDEN_NOT_FOUND');
    }

    if (!garden.latitude || !garden.longitude) {
      throw new AppError('Garden coordinates not available', 400, 'GARDEN_NO_COORDINATES');
    }

    const cacheKey = `${garden.latitude.toFixed(4)},${garden.longitude.toFixed(4)}`;
    
    // Try to get cached data first
    let weatherData = await WeatherService.getCachedWeather(cacheKey);
    
    if (!weatherData) {
      // Fetch from API and cache
      weatherData = await WeatherService.getWeatherFromAPI(garden.latitude, garden.longitude);
      await WeatherService.cacheWeather(cacheKey, weatherData);
    }

    res.json({
      garden: {
        id: gardenId,
        name: garden.name,
        location: garden.location
      },
      weather: weatherData,
      cached: !!weatherData.retrieved_at
    });
  })
);

// Get weather alerts and recommendations
router.get('/alerts',
  weatherRateLimiter,
  asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDINATES');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Get current weather and forecast
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    let currentWeather = await WeatherService.getCachedWeather(cacheKey);
    
    if (!currentWeather) {
      currentWeather = await WeatherService.getWeatherFromAPI(latitude, longitude);
      await WeatherService.cacheWeather(cacheKey, currentWeather);
    }

    const forecastCacheKey = `forecast_${latitude.toFixed(4)},${longitude.toFixed(4)}_3d`;
    let forecast = await WeatherService.getCachedWeather(forecastCacheKey);
    
    if (!forecast) {
      forecast = await WeatherService.getForecastFromAPI(latitude, longitude, 3);
      await WeatherService.cacheWeather(forecastCacheKey, forecast);
    }

    // Generate alerts and recommendations
    const alerts = [];
    const recommendations = [];

    // Temperature alerts
    if (currentWeather.temperature > 90) {
      alerts.push({
        type: 'heat_warning',
        severity: 'high',
        message: 'Extreme heat warning - provide extra shade and water for plants',
        icon: '🌡️'
      });
      recommendations.push({
        type: 'watering',
        message: 'Increase watering frequency during hot weather',
        priority: 'high'
      });
    } else if (currentWeather.temperature < 32) {
      alerts.push({
        type: 'frost_warning',
        severity: 'high',
        message: 'Freezing temperatures - protect sensitive plants',
        icon: '❄️'
      });
      recommendations.push({
        type: 'protection',
        message: 'Cover or move tender plants indoors',
        priority: 'high'
      });
    }

    // Wind alerts
    if (currentWeather.wind_speed > 25) {
      alerts.push({
        type: 'wind_warning',
        severity: 'medium',
        message: 'High winds - secure tall plants and equipment',
        icon: '💨'
      });
    }

    // Humidity recommendations
    if (currentWeather.humidity < 30) {
      recommendations.push({
        type: 'humidity',
        message: 'Low humidity - consider misting plants',
        priority: 'medium'
      });
    } else if (currentWeather.humidity > 80) {
      recommendations.push({
        type: 'ventilation',
        message: 'High humidity - ensure good air circulation to prevent disease',
        priority: 'medium'
      });
    }

    // Precipitation forecast
    const upcomingRain = forecast.forecasts.filter(f => f.pop > 50).slice(0, 3);
    if (upcomingRain.length > 0) {
      recommendations.push({
        type: 'watering',
        message: `Rain expected in the next 24-72 hours - adjust watering schedule`,
        priority: 'medium',
        details: upcomingRain.map(f => ({
          time: f.datetime,
          precipitation_chance: f.pop
        }))
      });
    }

    // Growing season recommendations
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) { // Spring
      recommendations.push({
        type: 'seasonal',
        message: 'Spring planting season - ideal time for cool-season crops',
        priority: 'low'
      });
    } else if (month >= 6 && month <= 8) { // Summer
      recommendations.push({
        type: 'seasonal',
        message: 'Summer growing season - focus on heat-tolerant varieties',
        priority: 'low'
      });
    } else if (month >= 9 && month <= 11) { // Fall
      recommendations.push({
        type: 'seasonal',
        message: 'Fall planting season - time for winter vegetables',
        priority: 'low'
      });
    }

    res.json({
      location: {
        latitude,
        longitude,
        name: currentWeather.location
      },
      current_weather: currentWeather,
      alerts,
      recommendations,
      generated_at: new Date().toISOString()
    });
  })
);

// Get weather history (cached data)
router.get('/history',
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    const { location, days } = req.query;
    const historyDays = parseInt(days) || 7;

    if (!location) {
      throw new AppError('Location parameter is required', 400, 'MISSING_LOCATION');
    }

    const since = new Date();
    since.setDate(since.getDate() - historyDays);

    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT location, weather_data, cached_at 
         FROM weather_cache 
         WHERE location LIKE ? AND cached_at >= ?
         ORDER BY cached_at DESC`,
        [`%${location}%`, since.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else {
            const historyData = rows.map(row => ({
              ...JSON.parse(row.weather_data),
              cached_at: row.cached_at
            }));
            resolve(historyData);
          }
        }
      );
    });

    res.json({
      location,
      history,
      period_days: historyDays,
      total_records: history.length
    });
  })
);

// Clear weather cache (admin only)
router.delete('/cache',
  asyncHandler(async (req, res) => {
    await WeatherService.cleanExpiredCache();
    
    // Also clear all cache if requested
    if (req.query.all === 'true') {
      const db = getDatabase();
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM weather_cache', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({
      message: 'Weather cache cleared successfully'
    });
  })
);

// Get cache statistics
router.get('/cache/stats',
  asyncHandler(async (req, res) => {
    const db = getDatabase();

    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           COUNT(*) as total_entries,
           COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_entries,
           COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_entries,
           MIN(cached_at) as oldest_entry,
           MAX(cached_at) as newest_entry
         FROM weather_cache`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      cache_stats: stats,
      cache_duration_ms: WEATHER_CACHE_DURATION
    });
  })
);

module.exports = router;