import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  WifiIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

import { SyncStatus } from '@types/index'
import Button from './Button'

interface OfflineBannerProps {
  syncStatus: SyncStatus
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ syncStatus }) => {
  const { pendingActions, isSyncing, lastSync } = syncStatus

  const formatLastSync = (timestamp: string) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 dark:bg-yellow-900 border-b border-yellow-200 dark:border-yellow-700"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  You're offline
                </p>
                <div className="flex items-center space-x-4 text-xs text-yellow-700 dark:text-yellow-300">
                  <span>
                    {pendingActions > 0 ? `${pendingActions} changes pending` : 'No pending changes'}
                  </span>
                  <span>•</span>
                  <span>Last sync: {formatLastSync(lastSync)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sync status */}
              <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300">
                {isSyncing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Syncing...</span>
                  </>
                ) : (
                  <>
                    <WifiIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Waiting for connection</span>
                  </>
                )}
              </div>

              {/* Manual retry button */}
              <Button
                variant="outline"
                size="xs"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-800"
                onClick={() => {
                  // Trigger manual sync attempt
                  window.dispatchEvent(new CustomEvent('manual-sync'))
                }}
                disabled={isSyncing}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>

        {/* Progress bar for pending actions */}
        {pendingActions > 0 && (
          <div className="w-full bg-yellow-200 dark:bg-yellow-800 h-1">
            <motion.div
              className="h-full bg-yellow-500 dark:bg-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: isSyncing ? '100%' : '0%' }}
              transition={{ duration: isSyncing ? 2 : 0.3 }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default OfflineBanner