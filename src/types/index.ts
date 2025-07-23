// Core domain types for community garden management

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'gardener' | 'volunteer';
  avatar?: string;
  joinedAt: string;
  lastLogin?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    watering: boolean;
    harvest: boolean;
    weather: boolean;
    maintenance: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';
  timezone: string;
}

export interface Garden {
  id: string;
  name: string;
  location: {
    address: string;
    coordinates: [number, number]; // [lat, lng]
  };
  dimensions: {
    width: number;
    height: number;
  };
  plots: Plot[];
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  gardenId: string;
  number: string;
  assignedTo?: string; // User ID
  dimensions: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  soilType: 'clay' | 'sandy' | 'loam' | 'silt';
  sunExposure: 'full' | 'partial' | 'shade';
  status: 'available' | 'assigned' | 'maintenance';
  plants: Plant[];
  wateringSchedule?: WateringSchedule;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plant {
  id: string;
  plotId: string;
  name: string;
  variety: string;
  category: 'vegetable' | 'herb' | 'flower' | 'fruit';
  plantedDate: string;
  expectedHarvestDate?: string;
  actualHarvestDate?: string;
  status: 'seed' | 'sprout' | 'growing' | 'flowering' | 'fruiting' | 'ready' | 'harvested' | 'dead';
  growthStage: GrowthStage;
  careInstructions: string;
  photos: PlantPhoto[];
  measurements: PlantMeasurement[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthStage {
  current: string;
  stages: Array<{
    name: string;
    description: string;
    duration: number; // days
    requirements: string[];
  }>;
  daysInCurrentStage: number;
}

export interface PlantPhoto {
  id: string;
  plantId: string;
  url: string;
  thumbnail: string;
  caption?: string;
  takenAt: string;
  uploadedBy: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    camera?: string;
    location?: [number, number];
  };
}

export interface PlantMeasurement {
  id: string;
  plantId: string;
  type: 'height' | 'width' | 'fruit_count' | 'leaf_count';
  value: number;
  unit: string;
  measuredAt: string;
  measuredBy: string;
  notes?: string;
}

export interface WateringSchedule {
  id: string;
  plotId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'custom';
  days: number[]; // Days of week (0-6, Sunday=0)
  times: string[]; // Time in HH:MM format
  duration: number; // minutes
  method: 'sprinkler' | 'drip' | 'manual' | 'soaker';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WateringLog {
  id: string;
  plotId: string;
  wateredAt: string;
  wateredBy: string;
  duration: number; // minutes
  method: 'sprinkler' | 'drip' | 'manual' | 'soaker';
  amount?: number; // liters
  notes?: string;
  weather: WeatherCondition;
}

export interface WeatherCondition {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  uvIndex: number;
}

export interface Harvest {
  id: string;
  plantId: string;
  plotId: string;
  harvestedBy: string;
  harvestedAt: string;
  quantity: number;
  unit: 'kg' | 'lbs' | 'pieces' | 'bunches';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  photos: string[];
  notes?: string;
  distributedTo: Array<{
    recipient: string;
    quantity: number;
    date: string;
  }>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'watering' | 'planting' | 'harvesting' | 'maintenance' | 'pest_control' | 'fertilizing';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  plotId?: string;
  plantId?: string;
  dueDate: string;
  completedAt?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  materials: string[];
  instructions: string;
  photos: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'watering_due' | 'harvest_ready' | 'task_assigned' | 'weather_alert' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
  confirmPassword: string;
}

// Form validation schemas
export interface FormValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

// Chart and analytics types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface GardenAnalytics {
  totalPlots: number;
  activePlots: number;
  totalPlants: number;
  readyToHarvest: number;
  totalHarvests: number;
  harvestWeight: number;
  averageGrowthTime: number;
  wateringEfficiency: number;
  plotUtilization: number;
  monthlyHarvests: ChartData;
  plantTypeDistribution: ChartData;
  growthStageDistribution: ChartData;
}

// Mobile and PWA types
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAInstallation {
  canInstall: boolean;
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

// Error handling
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Offline capability
export interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  synced: boolean;
}

export interface SyncStatus {
  lastSync: string;
  pendingActions: number;
  isOnline: boolean;
  isSyncing: boolean;
}