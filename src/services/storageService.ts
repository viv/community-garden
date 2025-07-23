import localforage from 'localforage'
import { User, AuthToken } from '@types/index'

// Configure localforage for better performance
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  name: 'GardenHub',
  version: 1.0,
  storeName: 'garden_data',
  description: 'Community Garden Dashboard offline storage'
})

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  THEME: 'theme',
  INSTALL_PROMPT_DISMISSED: 'install_prompt_dismissed',
  OFFLINE_ACTIONS: 'offline_actions',
  LAST_SYNC: 'last_sync',
  USER_PREFERENCES: 'user_preferences',
  CACHED_PLOTS: 'cached_plots',
  CACHED_PLANTS: 'cached_plants',
  CACHED_HARVESTS: 'cached_harvests',
  WATERING_SCHEDULES: 'watering_schedules',
  PHOTO_CACHE: 'photo_cache'
} as const

export const storageService = {
  // Authentication
  async setToken(token: AuthToken): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
  },

  async getToken(): Promise<AuthToken | null> {
    return await localforage.getItem<AuthToken>(STORAGE_KEYS.AUTH_TOKEN)
  },

  async setUser(user: User): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.USER, user)
  },

  async getUser(): Promise<User | null> {
    return await localforage.getItem<User>(STORAGE_KEYS.USER)
  },

  // Theme preferences
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.THEME, theme)
  },

  async getTheme(): Promise<'light' | 'dark' | 'system' | null> {
    return await localforage.getItem<'light' | 'dark' | 'system'>(STORAGE_KEYS.THEME)
  },

  // PWA install prompt
  async setInstallPromptDismissed(timestamp: number): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED, timestamp)
  },

  async getInstallPromptDismissed(): Promise<number | null> {
    return await localforage.getItem<number>(STORAGE_KEYS.INSTALL_PROMPT_DISMISSED)
  },

  // Offline actions
  async setOfflineActions(actions: any[]): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.OFFLINE_ACTIONS, actions)
  },

  async getOfflineActions(): Promise<any[]> {
    return (await localforage.getItem<any[]>(STORAGE_KEYS.OFFLINE_ACTIONS)) || []
  },

  async addOfflineAction(action: any): Promise<void> {
    const actions = await this.getOfflineActions()
    actions.push(action)
    await this.setOfflineActions(actions)
  },

  async removeOfflineActions(actionIds: string[]): Promise<void> {
    const actions = await this.getOfflineActions()
    const filtered = actions.filter(action => !actionIds.includes(action.id))
    await this.setOfflineActions(filtered)
  },

  // Sync timestamp
  async setLastSync(timestamp: string): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp)
  },

  async getLastSync(): Promise<string | null> {
    return await localforage.getItem<string>(STORAGE_KEYS.LAST_SYNC)
  },

  // User preferences
  async setUserPreferences(preferences: any): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.USER_PREFERENCES, preferences)
  },

  async getUserPreferences(): Promise<any | null> {
    return await localforage.getItem(STORAGE_KEYS.USER_PREFERENCES)
  },

  // Cache garden data for offline use
  async setCachedPlots(plots: any[]): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.CACHED_PLOTS, {
      data: plots,
      timestamp: new Date().toISOString()
    })
  },

  async getCachedPlots(): Promise<{ data: any[], timestamp: string } | null> {
    return await localforage.getItem(STORAGE_KEYS.CACHED_PLOTS)
  },

  async setCachedPlants(plants: any[]): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.CACHED_PLANTS, {
      data: plants,
      timestamp: new Date().toISOString()
    })
  },

  async getCachedPlants(): Promise<{ data: any[], timestamp: string } | null> {
    return await localforage.getItem(STORAGE_KEYS.CACHED_PLANTS)
  },

  async setCachedHarvests(harvests: any[]): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.CACHED_HARVESTS, {
      data: harvests,
      timestamp: new Date().toISOString()
    })
  },

  async getCachedHarvests(): Promise<{ data: any[], timestamp: string } | null> {
    return await localforage.getItem(STORAGE_KEYS.CACHED_HARVESTS)
  },

  // Watering schedules
  async setWateringSchedules(schedules: any[]): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.WATERING_SCHEDULES, schedules)
  },

  async getWateringSchedules(): Promise<any[]> {
    return (await localforage.getItem<any[]>(STORAGE_KEYS.WATERING_SCHEDULES)) || []
  },

  // Photo caching
  async cachePhoto(url: string, blob: Blob): Promise<void> {
    const cache = (await localforage.getItem<Record<string, Blob>>(STORAGE_KEYS.PHOTO_CACHE)) || {}
    cache[url] = blob
    await localforage.setItem(STORAGE_KEYS.PHOTO_CACHE, cache)
  },

  async getCachedPhoto(url: string): Promise<Blob | null> {
    const cache = (await localforage.getItem<Record<string, Blob>>(STORAGE_KEYS.PHOTO_CACHE)) || {}
    return cache[url] || null
  },

  async clearPhotoCache(): Promise<void> {
    await localforage.removeItem(STORAGE_KEYS.PHOTO_CACHE)
  },

  // Generic storage methods
  async setItem<T>(key: string, value: T): Promise<void> {
    await localforage.setItem(key, value)
  },

  async getItem<T>(key: string): Promise<T | null> {
    return await localforage.getItem<T>(key)
  },

  async removeItem(key: string): Promise<void> {
    await localforage.removeItem(key)
  },

  // Clear all data
  async clear(): Promise<void> {
    await localforage.clear()
  },

  // Get storage usage info
  async getStorageInfo(): Promise<{
    keys: string[]
    itemCount: number
    estimatedSize: number
  }> {
    const keys = await localforage.keys()
    let estimatedSize = 0
    
    // Estimate size by serializing a few items
    for (const key of keys.slice(0, 10)) {
      try {
        const item = await localforage.getItem(key)
        estimatedSize += JSON.stringify(item).length
      } catch (error) {
        // Skip items that can't be serialized
      }
    }
    
    return {
      keys,
      itemCount: keys.length,
      estimatedSize: Math.round(estimatedSize * keys.length / 10) // Rough estimate
    }
  },

  // Export data for backup
  async exportData(): Promise<Record<string, any>> {
    const keys = await localforage.keys()
    const data: Record<string, any> = {}
    
    for (const key of keys) {
      try {
        data[key] = await localforage.getItem(key)
      } catch (error) {
        console.warn(`Failed to export data for key: ${key}`, error)
      }
    }
    
    return data
  },

  // Import data from backup
  async importData(data: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      try {
        await localforage.setItem(key, value)
      } catch (error) {
        console.warn(`Failed to import data for key: ${key}`, error)
      }
    }
  },

  // Check if storage is available and working
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__storage_test__'
      const testValue = 'test'
      
      await localforage.setItem(testKey, testValue)
      const retrieved = await localforage.getItem(testKey)
      await localforage.removeItem(testKey)
      
      return retrieved === testValue
    } catch (error) {
      return false
    }
  }
}