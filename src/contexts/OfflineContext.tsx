import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { OfflineAction, SyncStatus } from '@types/index'
import { offlineService } from '@services/offlineService'
import { syncService } from '@services/syncService'

interface OfflineContextType {
  isOnline: boolean
  syncStatus: SyncStatus
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>) => void
  syncOfflineActions: () => Promise<void>
  clearOfflineActions: () => void
  getOfflineActions: () => Promise<OfflineAction[]>
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: '',
    pendingActions: 0,
    isOnline: navigator.onLine,
    isSyncing: false
  })
  
  const queryClient = useQueryClient()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus(prev => ({ ...prev, isOnline: true }))
      
      // Auto-sync when coming back online
      syncOfflineActions()
      
      toast.success('Back online! Syncing data...', {
        duration: 2000,
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus(prev => ({ ...prev, isOnline: false }))
      
      toast('You\'re offline. Changes will be saved locally.', {
        icon: '📱',
        duration: 3000,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize sync status
  useEffect(() => {
    const initSyncStatus = async () => {
      try {
        const lastSync = await offlineService.getLastSyncTime()
        const pendingActions = await offlineService.getPendingActionsCount()
        
        setSyncStatus(prev => ({
          ...prev,
          lastSync: lastSync || '',
          pendingActions
        }))
      } catch (error) {
        console.error('Failed to initialize sync status:', error)
      }
    }

    initSyncStatus()
  }, [])

  // Periodic sync when online
  useEffect(() => {
    if (!isOnline) return

    const interval = setInterval(() => {
      syncOfflineActions()
    }, 5 * 60 * 1000) // Sync every 5 minutes

    return () => clearInterval(interval)
  }, [isOnline])

  const addOfflineAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        synced: false
      }

      await offlineService.addAction(offlineAction)
      
      // Update pending count
      const pendingActions = await offlineService.getPendingActionsCount()
      setSyncStatus(prev => ({ ...prev, pendingActions }))

      // Try to sync immediately if online
      if (isOnline) {
        syncOfflineActions()
      }
    } catch (error) {
      console.error('Failed to add offline action:', error)
      toast.error('Failed to save offline action')
    }
  }

  const syncOfflineActions = async () => {
    if (!isOnline || syncStatus.isSyncing) return

    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }))

      const pendingActions = await offlineService.getPendingActions()
      if (pendingActions.length === 0) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          lastSync: new Date().toISOString()
        }))
        return
      }

      // Sync actions with server
      const results = await syncService.syncActions(pendingActions)
      
      // Mark successful actions as synced
      const successfulIds = results
        .filter(result => result.success)
        .map(result => result.actionId)

      if (successfulIds.length > 0) {
        await offlineService.markActionsSynced(successfulIds)
      }

      // Handle failed actions
      const failedActions = results.filter(result => !result.success)
      if (failedActions.length > 0) {
        console.warn('Some actions failed to sync:', failedActions)
        // Could implement retry logic here
      }

      // Update sync status
      const remainingActions = await offlineService.getPendingActionsCount()
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date().toISOString(),
        pendingActions: remainingActions
      }))

      // Invalidate queries to refresh data
      queryClient.invalidateQueries()

      if (successfulIds.length > 0) {
        toast.success(`Synced ${successfulIds.length} actions`, {
          duration: 2000,
        })
      }

    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
      
      toast.error('Sync failed. Will retry later.', {
        duration: 3000,
      })
    }
  }

  const clearOfflineActions = async () => {
    try {
      await offlineService.clearActions()
      setSyncStatus(prev => ({ ...prev, pendingActions: 0 }))
      toast.success('Offline actions cleared')
    } catch (error) {
      console.error('Failed to clear offline actions:', error)
      toast.error('Failed to clear offline actions')
    }
  }

  const getOfflineActions = async (): Promise<OfflineAction[]> => {
    try {
      return await offlineService.getAllActions()
    } catch (error) {
      console.error('Failed to get offline actions:', error)
      return []
    }
  }

  // Handle visibility change to sync when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        syncOfflineActions()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isOnline])

  const contextValue: OfflineContextType = {
    isOnline,
    syncStatus,
    addOfflineAction,
    syncOfflineActions,
    clearOfflineActions,
    getOfflineActions
  }

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}