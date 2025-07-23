import { OfflineAction } from '@types/index'
import { storageService } from './storageService'

export const offlineService = {
  // Add an offline action to the queue
  async addAction(action: OfflineAction): Promise<void> {
    const actions = await this.getAllActions()
    actions.push(action)
    await storageService.setOfflineActions(actions)
  },

  // Get all offline actions
  async getAllActions(): Promise<OfflineAction[]> {
    return await storageService.getOfflineActions()
  },

  // Get pending (unsynced) actions
  async getPendingActions(): Promise<OfflineAction[]> {
    const actions = await this.getAllActions()
    return actions.filter(action => !action.synced)
  },

  // Get count of pending actions
  async getPendingActionsCount(): Promise<number> {
    const pendingActions = await this.getPendingActions()
    return pendingActions.length
  },

  // Mark actions as synced
  async markActionsSynced(actionIds: string[]): Promise<void> {
    const actions = await this.getAllActions()
    const updatedActions = actions.map(action => 
      actionIds.includes(action.id) 
        ? { ...action, synced: true }
        : action
    )
    await storageService.setOfflineActions(updatedActions)
  },

  // Remove synced actions from storage
  async removeSyncedActions(): Promise<void> {
    const actions = await this.getAllActions()
    const unsyncedActions = actions.filter(action => !action.synced)
    await storageService.setOfflineActions(unsyncedActions)
  },

  // Clear all actions
  async clearActions(): Promise<void> {
    await storageService.setOfflineActions([])
  },

  // Get last sync time
  async getLastSyncTime(): Promise<string | null> {
    return await storageService.getLastSync()
  },

  // Set last sync time
  async setLastSyncTime(timestamp: string): Promise<void> {
    await storageService.setLastSync(timestamp)
  },

  // Create action for plot update
  createPlotUpdateAction(plotId: string, updates: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'UPDATE_PLOT',
      data: {
        plotId,
        updates
      }
    }
  },

  // Create action for plant update
  createPlantUpdateAction(plantId: string, updates: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'UPDATE_PLANT',
      data: {
        plantId,
        updates
      }
    }
  },

  // Create action for watering log
  createWateringLogAction(plotId: string, log: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'CREATE_WATERING_LOG',
      data: {
        plotId,
        log
      }
    }
  },

  // Create action for harvest record
  createHarvestAction(plantId: string, harvest: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'CREATE_HARVEST',
      data: {
        plantId,
        harvest
      }
    }
  },

  // Create action for photo upload
  createPhotoUploadAction(plantId: string, photo: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'UPLOAD_PHOTO',
      data: {
        plantId,
        photo
      }
    }
  },

  // Create action for task completion
  createTaskCompletionAction(taskId: string, completion: any): Omit<OfflineAction, 'id' | 'timestamp' | 'synced'> {
    return {
      type: 'COMPLETE_TASK',
      data: {
        taskId,
        completion
      }
    }
  },

  // Get actions by type
  async getActionsByType(type: string): Promise<OfflineAction[]> {
    const actions = await this.getAllActions()
    return actions.filter(action => action.type === type)
  },

  // Get actions by date range
  async getActionsByDateRange(startDate: string, endDate: string): Promise<OfflineAction[]> {
    const actions = await this.getAllActions()
    return actions.filter(action => {
      const actionDate = new Date(action.timestamp)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return actionDate >= start && actionDate <= end
    })
  },

  // Retry failed actions
  async retryFailedActions(): Promise<OfflineAction[]> {
    const actions = await this.getAllActions()
    // In a real implementation, you might have a 'failed' status
    // For now, we'll just return unsynced actions older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    return actions.filter(action => 
      !action.synced && 
      new Date(action.timestamp) < oneHourAgo
    )
  },

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalActions: number
    pendingActions: number
    syncedActions: number
    oldestPendingAction: string | null
    newestAction: string | null
  }> {
    const actions = await this.getAllActions()
    const pendingActions = actions.filter(action => !action.synced)
    const syncedActions = actions.filter(action => action.synced)
    
    const oldestPending = pendingActions.length > 0 
      ? pendingActions.reduce((oldest, action) => 
          new Date(action.timestamp) < new Date(oldest.timestamp) ? action : oldest
        ).timestamp
      : null
      
    const newestAction = actions.length > 0
      ? actions.reduce((newest, action) =>
          new Date(action.timestamp) > new Date(newest.timestamp) ? action : newest
        ).timestamp
      : null

    return {
      totalActions: actions.length,
      pendingActions: pendingActions.length,
      syncedActions: syncedActions.length,
      oldestPendingAction: oldestPending,
      newestAction
    }
  }
}