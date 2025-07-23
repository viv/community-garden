import axios from 'axios'
import { OfflineAction } from '@types/index'
import { storageService } from './storageService'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance for sync operations
const syncClient = axios.create({
  baseURL: `${API_BASE_URL}/sync`,
  timeout: 30000, // Longer timeout for sync operations
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
syncClient.interceptors.request.use(async (config) => {
  const token = await storageService.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token.accessToken}`
  }
  return config
})

export interface SyncResult {
  actionId: string
  success: boolean
  error?: string
  data?: any
}

export const syncService = {
  // Sync all pending actions
  async syncActions(actions: OfflineAction[]): Promise<SyncResult[]> {
    if (actions.length === 0) {
      return []
    }

    try {
      const response = await syncClient.post('/batch', {
        actions: actions.map(action => ({
          id: action.id,
          type: action.type,
          data: action.data,
          timestamp: action.timestamp
        }))
      })

      return response.data.results || []
    } catch (error) {
      console.error('Batch sync failed:', error)
      
      // Fallback to individual sync if batch fails
      return await this.syncActionsIndividually(actions)
    }
  },

  // Sync actions one by one as fallback
  async syncActionsIndividually(actions: OfflineAction[]): Promise<SyncResult[]> {
    const results: SyncResult[] = []

    for (const action of actions) {
      try {
        const result = await this.syncSingleAction(action)
        results.push(result)
      } catch (error) {
        results.push({
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  },

  // Sync a single action
  async syncSingleAction(action: OfflineAction): Promise<SyncResult> {
    try {
      let endpoint = ''
      let method = 'POST'
      let data = action.data

      // Map action types to API endpoints
      switch (action.type) {
        case 'UPDATE_PLOT':
          endpoint = `/plots/${action.data.plotId}`
          method = 'PUT'
          data = action.data.updates
          break

        case 'UPDATE_PLANT':
          endpoint = `/plants/${action.data.plantId}`
          method = 'PUT'
          data = action.data.updates
          break

        case 'CREATE_WATERING_LOG':
          endpoint = `/plots/${action.data.plotId}/watering`
          method = 'POST'
          data = action.data.log
          break

        case 'CREATE_HARVEST':
          endpoint = `/plants/${action.data.plantId}/harvests`
          method = 'POST'
          data = action.data.harvest
          break

        case 'UPLOAD_PHOTO':
          endpoint = `/plants/${action.data.plantId}/photos`
          method = 'POST'
          data = action.data.photo
          break

        case 'COMPLETE_TASK':
          endpoint = `/tasks/${action.data.taskId}/complete`
          method = 'POST'
          data = action.data.completion
          break

        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      const response = await syncClient.request({
        method,
        url: endpoint,
        data
      })

      return {
        actionId: action.id,
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error)
      
      return {
        actionId: action.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  // Download latest data from server
  async downloadLatestData(): Promise<{
    plots?: any[]
    plants?: any[]
    harvests?: any[]
    tasks?: any[]
  }> {
    try {
      const response = await syncClient.get('/latest')
      return response.data
    } catch (error) {
      console.error('Failed to download latest data:', error)
      throw error
    }
  },

  // Get server timestamp for sync comparison
  async getServerTimestamp(): Promise<string> {
    try {
      const response = await syncClient.get('/timestamp')
      return response.data.timestamp
    } catch (error) {
      console.error('Failed to get server timestamp:', error)
      throw error
    }
  },

  // Check if data needs sync based on timestamps
  async checkSyncNeeded(lastSync: string): Promise<{
    needed: boolean
    serverTimestamp: string
    changes: string[]
  }> {
    try {
      const response = await syncClient.get('/check', {
        params: { lastSync }
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to check sync status:', error)
      // Assume sync is needed if we can't check
      return {
        needed: true,
        serverTimestamp: new Date().toISOString(),
        changes: ['unknown']
      }
    }
  },

  // Upload photos with progress tracking
  async uploadPhoto(
    plantId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('plantId', plantId)

    try {
      const response = await syncClient.post('/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
        }
      })

      return response.data
    } catch (error) {
      console.error('Photo upload failed:', error)
      throw error
    }
  },

  // Resolve sync conflicts
  async resolveConflicts(conflicts: Array<{
    actionId: string
    type: 'client_wins' | 'server_wins' | 'merge'
    resolution?: any
  }>): Promise<SyncResult[]> {
    try {
      const response = await syncClient.post('/resolve-conflicts', {
        conflicts
      })

      return response.data.results || []
    } catch (error) {
      console.error('Failed to resolve conflicts:', error)
      throw error
    }
  },

  // Get sync statistics from server
  async getSyncStats(): Promise<{
    totalSyncs: number
    lastSync: string
    pendingActions: number
    errorCount: number
  }> {
    try {
      const response = await syncClient.get('/stats')
      return response.data
    } catch (error) {
      console.error('Failed to get sync stats:', error)
      return {
        totalSyncs: 0,
        lastSync: '',
        pendingActions: 0,
        errorCount: 0
      }
    }
  },

  // Force full resync
  async forceFullSync(): Promise<{
    success: boolean
    message: string
    syncedItems: number
  }> {
    try {
      const response = await syncClient.post('/force-sync')
      return response.data
    } catch (error) {
      console.error('Force sync failed:', error)
      throw error
    }
  }
}